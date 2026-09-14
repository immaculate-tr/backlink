#!/usr/bin/env node
/**
 * Backlink Verification Script
 * Runs on GitHub Actions weekly to scan every platform in public/data/sources.json
 * for backlinks to immaculate.tr. Runs in Node, so it has no CORS restriction —
 * every source (not just the CORS-friendly ones the browser can reach) gets a
 * real, accurate check here. Writes results to public/data/results.json, which
 * is what the static GitHub Pages site reads by default.
 *
 * Usage:
 *   node scripts/verify-backlinks.cjs                     Run the full sweep
 *   node scripts/verify-backlinks.cjs --source=github,npm  Only check specific source ids
 *   node scripts/verify-backlinks.cjs --dry-run            Run checks but don't write results.json
 *
 * Tuning (all optional, sane defaults):
 *   TARGET_DOMAIN, CONCURRENCY_LIMIT, REQUEST_TIMEOUT_MS, MAX_RETRIES,
 *   RETRY_BASE_DELAY_MS, BATCH_DELAY_MS, MAX_BODY_BYTES, MIN_DOMAIN_GAP_MS
 */

const fs = require("fs");
const path = require("path");

const TARGET_DOMAIN = process.env.TARGET_DOMAIN || "immaculate.tr";
const CONCURRENCY_LIMIT = Number(process.env.CONCURRENCY_LIMIT) || 10;
const REQUEST_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS) || 20000;
const MAX_RETRIES = Number(process.env.MAX_RETRIES) || 2;
const RETRY_BASE_DELAY_MS = Number(process.env.RETRY_BASE_DELAY_MS) || 800;
const BATCH_DELAY_MS = Number(process.env.BATCH_DELAY_MS) || 300;
const MAX_BODY_BYTES = Number(process.env.MAX_BODY_BYTES) || 2_000_000; // 2MB cap per response
const MIN_DOMAIN_GAP_MS = Number(process.env.MIN_DOMAIN_GAP_MS) || 150;

// Load sources from the generated JSON file — single source of truth, shared
// with the browser-side scan (src/lib/sources.ts imports the same file).
const sourcesPath = path.join(__dirname, "..", "public", "data", "sources.json");
const SOURCES = JSON.parse(fs.readFileSync(sourcesPath, "utf8"));

// Heuristic markers for bot-challenge / verification-wall pages, so a page
// that actually loaded (HTTP 200) but is really a CAPTCHA/JS-challenge screen
// isn't silently reported as a false "not_found".
const BLOCK_MARKERS = [
  "checking your browser",
  "attention required",
  "cf-browser-verification",
  "enable javascript and cookies",
  "just a moment",
  "please verify you are a human",
  "unusual traffic",
  "captcha",
];

function extractTitle(html) {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m && m[1] ? m[1].trim().substring(0, 200) : null;
}

function isSameOrSubdomain(hostname, domain) {
  const h = hostname.toLowerCase().replace(/^www\./, "");
  const d = domain.toLowerCase().replace(/^www\./, "");
  return h === d || h.endsWith("." + d);
}

/**
 * Scans text for URLs and returns the first one whose hostname is actually
 * the target domain (or a subdomain of it) — not merely a URL that happens
 * to contain the domain string somewhere in its path or query parameters.
 */
function findBacklink(text, pattern) {
  try {
    if (!new RegExp(pattern, "i").test(text)) return null;

    const domain = pattern.replace(/\\\./g, ".");
    const urlRegex = /https?:\/\/[^\s"'<>)]+/gi;
    let match;

    while ((match = urlRegex.exec(text)) !== null) {
      const candidate = match[0].replace(/[.,;:!?]+$/, "");
      try {
        const hostname = new URL(candidate).hostname;
        if (isSameOrSubdomain(hostname, domain)) {
          return { url: candidate, anchorText: "" };
        }
      } catch {
        continue;
      }
    }

    const bareRegex = new RegExp("(?:^|[\\s\"'(>])((?:www\\.)?" + pattern + ")(?![a-zA-Z0-9-])", "i");
    const bareMatch = text.match(bareRegex);
    if (bareMatch) {
      return { url: bareMatch[1], anchorText: "" };
    }

    return null;
  } catch {
    return null;
  }
}

function looksBlocked(text) {
  if (!text) return false;
  const lower = text.slice(0, 4000).toLowerCase();
  return BLOCK_MARKERS.some((marker) => lower.includes(marker));
}

function getBaseDomain(url) {
  try {
    const host = new URL(url).hostname;
    const parts = host.split(".");
    return parts.slice(-2).join(".");
  } catch {
    return "";
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Reserves the next available time slot for a given base domain so requests
// to the same shared infrastructure (e.g. every Wikipedia language edition,
// or the Stack Exchange API) are spaced out instead of firing all at once —
// this is exactly what triggers HTTP 429 responses. "Kademeli" (gradual).
const domainThrottle = new Map();
async function waitForDomainSlot(baseDomain) {
  if (!baseDomain) return;
  const now = Date.now();
  const nextAllowed = domainThrottle.get(baseDomain) || 0;
  const scheduledStart = Math.max(now, nextAllowed);
  domainThrottle.set(baseDomain, scheduledStart + MIN_DOMAIN_GAP_MS);
  const waitMs = scheduledStart - now;
  if (waitMs > 0) await sleep(waitMs);
}

function backoffDelay(attempt, retryAfterMs) {
  if (retryAfterMs != null && Number.isFinite(retryAfterMs)) return Math.min(retryAfterMs, 10000);
  const base = RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
  const jitter = Math.random() * base * 0.3;
  return Math.round(base + jitter);
}

function parseRetryAfter(header) {
  if (!header) return null;
  const asSeconds = Number(header);
  if (!Number.isNaN(asSeconds)) return asSeconds * 1000;
  const asDate = Date.parse(header);
  if (!Number.isNaN(asDate)) return Math.max(0, asDate - Date.now());
  return null;
}

// Reads a response body up to maxBytes, then cancels the stream instead of
// buffering an unbounded page fully into memory (protects against huge/odd
// responses from misbehaving endpoints).
async function readBodyLimited(response, maxBytes) {
  if (!response.body || typeof response.body.getReader !== "function") {
    return await response.text();
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let received = 0;
  let out = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.length;
    out += decoder.decode(value, { stream: true });
    if (received >= maxBytes) {
      await reader.cancel().catch(() => {});
      break;
    }
  }
  out += decoder.decode();
  return out;
}

function buildResult(source, status, opts = {}) {
  const {
    found_url = null,
    http_status = null,
    elapsed = 0,
    page_title = null,
    anchor_text = null,
    error_message = null,
  } = opts;
  return {
    source_id: source.id,
    source_name: source.name,
    status,
    found_url,
    http_status,
    response_time_ms: elapsed,
    page_title,
    anchor_text,
    error_message,
  };
}

async function fetchOnce(searchUrl, timeoutMs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; BacklinkVerifier/1.0; +https://immaculate.tr)",
        Accept: "text/html,application/json,*/*",
        "Accept-Language": "en-US,en;q=0.9,tr;q=0.8",
      },
      signal: controller.signal,
      redirect: "follow",
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function verifySource(source, opts) {
  const { timeoutMs, maxRetries, maxBodyBytes } = opts;
  const startTime = Date.now();
  const query = encodeURIComponent(TARGET_DOMAIN);
  const searchUrl = source.search_url_template.replace("{query}", query);
  const baseDomain = getBaseDomain(searchUrl);

  await waitForDomainSlot(baseDomain);

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetchOnce(searchUrl, timeoutMs);
      const elapsedSoFar = Date.now() - startTime;

      // Rate limited — back off and retry, respecting Retry-After when sent.
      if (response.status === 429) {
        await response.body?.cancel?.().catch(() => {});
        if (attempt < maxRetries) {
          await sleep(backoffDelay(attempt, parseRetryAfter(response.headers.get("retry-after"))));
          await waitForDomainSlot(baseDomain);
          continue;
        }
        return buildResult(source, "error", {
          http_status: 429,
          elapsed: elapsedSoFar,
          error_message: `Rate limited (429) after ${attempt + 1} attempts`,
        });
      }

      // Transient server errors — retry a couple of times before giving up.
      if (response.status >= 500 && response.status < 600) {
        await response.body?.cancel?.().catch(() => {});
        if (attempt < maxRetries) {
          await sleep(backoffDelay(attempt));
          await waitForDomainSlot(baseDomain);
          continue;
        }
        return buildResult(source, "error", {
          http_status: response.status,
          elapsed: elapsedSoFar,
          error_message: `HTTP ${response.status} after ${attempt + 1} attempts`,
        });
      }

      if (!response.ok && response.status !== 302) {
        return buildResult(source, "error", {
          http_status: response.status,
          elapsed: elapsedSoFar,
          error_message: "HTTP " + response.status,
        });
      }

      const contentType = response.headers.get("content-type") || "";
      const bodyText = await readBodyLimited(response, maxBodyBytes);
      const elapsed = Date.now() - startTime;

      if (looksBlocked(bodyText)) {
        return buildResult(source, "error", {
          http_status: response.status,
          elapsed,
          error_message: "Possibly blocked by anti-bot / verification challenge",
        });
      }

      let found = null;
      let pageTitle = null;

      if (contentType.includes("application/json") || contentType.includes("+json")) {
        try {
          const json = JSON.parse(bodyText);
          const jsonStr = JSON.stringify(json);
          pageTitle = json.title || json.response?.docs?.[0]?.title || null;
          found = findBacklink(jsonStr, source.verify_url_pattern);
        } catch {
          // Not actually JSON despite the header — fall back to raw text scan.
          found = findBacklink(bodyText, source.verify_url_pattern);
        }
      } else {
        pageTitle = extractTitle(bodyText);
        found = findBacklink(bodyText, source.verify_url_pattern);
      }

      return buildResult(source, found ? "verified" : "not_found", {
        found_url: found ? found.url : null,
        http_status: response.status,
        elapsed,
        page_title: pageTitle,
        anchor_text: found ? found.anchorText : null,
      });
    } catch (err) {
      const elapsed = Date.now() - startTime;
      const isTimeout = err.name === "AbortError";
      const message = isTimeout ? `Request timed out (${timeoutMs / 1000}s)` : (err.message || "Unknown error");
      const retryable = isTimeout || err.name === "TypeError" || /ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|network|fetch failed/i.test(message);

      if (retryable && attempt < maxRetries) {
        await sleep(backoffDelay(attempt));
        await waitForDomainSlot(baseDomain);
        continue;
      }
      return buildResult(source, "error", { elapsed, error_message: message });
    }
  }

  // Unreachable in practice (loop always returns), kept as a safety net.
  return buildResult(source, "error", { elapsed: Date.now() - startTime, error_message: "Exhausted retries" });
}

function parseArgs(argv) {
  const args = { sourceFilter: null, dryRun: false };
  for (const arg of argv) {
    if (arg.startsWith("--source=")) {
      args.sourceFilter = arg.slice("--source=".length).split(",").map((s) => s.trim()).filter(Boolean);
    } else if (arg === "--dry-run") {
      args.dryRun = true;
    }
  }
  return args;
}

async function main() {
  const runStart = Date.now();
  const args = parseArgs(process.argv.slice(2));

  console.log("Starting backlink verification for " + TARGET_DOMAIN);
  console.log("Sources: " + SOURCES.length);

  // Defensive check: a duplicate id would silently corrupt by-id lookups the
  // frontend does, so fail loudly here rather than shipping bad data.
  const seenIds = new Set();
  for (const s of SOURCES) {
    if (seenIds.has(s.id)) {
      console.error(`Fatal: duplicate source id "${s.id}" in sources.json`);
      process.exit(1);
    }
    seenIds.add(s.id);
  }

  let activeSources = SOURCES.filter((s) => s.is_active);
  if (args.sourceFilter) {
    activeSources = activeSources.filter((s) => args.sourceFilter.includes(s.id));
    console.log("Filtered to: " + activeSources.map((s) => s.id).join(", "));
  }

  const results = [];
  const opts = { timeoutMs: REQUEST_TIMEOUT_MS, maxRetries: MAX_RETRIES, maxBodyBytes: MAX_BODY_BYTES };

  for (let i = 0; i < activeSources.length; i += CONCURRENCY_LIMIT) {
    const batch = activeSources.slice(i, i + CONCURRENCY_LIMIT);
    console.log(`Batch ${Math.floor(i / CONCURRENCY_LIMIT) + 1}/${Math.ceil(activeSources.length / CONCURRENCY_LIMIT)}: ${batch.map((b) => b.name).join(", ")}`);

    const batchResults = await Promise.all(batch.map((src) => verifySource(src, opts)));

    for (const r of batchResults) {
      const icon = r.status === "verified" ? "✓" : r.status === "not_found" ? "·" : "✗";
      const suffix = r.error_message ? `  (${r.error_message})` : "";
      console.log(`  ${icon} ${r.source_name.padEnd(28)} ${r.status.padEnd(10)} ${r.response_time_ms}ms${suffix}`);
    }

    results.push(...batchResults);

    if (i + CONCURRENCY_LIMIT < activeSources.length) {
      await sleep(BATCH_DELAY_MS + Math.round(Math.random() * BATCH_DELAY_MS));
    }
  }

  const verified = results.filter((r) => r.status === "verified");
  const notFound = results.filter((r) => r.status === "not_found");
  const errors = results.filter((r) => r.status === "error");

  console.log("\n=== RESULTS ===");
  console.log("Verified: " + verified.length);
  console.log("Not found: " + notFound.length);
  console.log("Errors: " + errors.length);
  console.log("Total: " + results.length);

  const byType = {};
  for (const r of results) {
    const src = SOURCES.find((s) => s.id === r.source_id);
    const type = src ? src.platform_type : "unknown";
    byType[type] = byType[type] || { verified: 0, not_found: 0, error: 0 };
    byType[type][r.status]++;
  }
  console.log("\nBy platform type:");
  for (const [type, counts] of Object.entries(byType)) {
    console.log(`  ${type.padEnd(10)} verified=${counts.verified} not_found=${counts.not_found} error=${counts.error}`);
  }

  // Safety guard: if literally every source errored, something is
  // systemically broken (network egress blocked in CI, code bug, etc.) rather
  // than "no backlinks found" — don't clobber the last known-good snapshot.
  if (results.length > 0 && errors.length === results.length) {
    console.error(`\nFatal: all ${results.length} sources returned errors. Aborting without writing results.json to avoid overwriting the last good snapshot.`);
    process.exit(1);
  }

  const now = new Date().toISOString();
  const outPath = path.join(__dirname, "..", "public", "data", "results.json");

  const output = {
    target_domain: TARGET_DOMAIN,
    total_sources: results.length,
    verified: verified.length,
    not_found: notFound.length,
    errors: errors.length,
    results,
    sources: SOURCES,
    checked_at: now,
    history: [now],
    duration_ms: Date.now() - runStart,
  };

  try {
    const existing = JSON.parse(fs.readFileSync(outPath, "utf8"));
    if (existing.history && Array.isArray(existing.history)) {
      output.history = [...existing.history, now].slice(-52);
    }
  } catch {
    /* no existing file yet — first run */
  }

  if (args.dryRun) {
    console.log("\n--dry-run: skipping write to " + outPath);
  } else {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
    console.log("Written to: " + outPath);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
