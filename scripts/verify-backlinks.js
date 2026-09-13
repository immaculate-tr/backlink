#!/usr/bin/env node
/**
 * Backlink Verification Script
 * Runs on GitHub Actions weekly to scan major platforms for backlinks to immaculate.tr
 * Writes results to public/data/results.json — consumed by the static GitHub Pages site
 *
 * Usage:
 *   node scripts/verify-backlinks.js                     Run the full sweep
 *   node scripts/verify-backlinks.js --source=github,npm  Only check specific source ids
 *   node scripts/verify-backlinks.js --dry-run            Run checks but don't write results.json
 *
 * Tuning (all optional, sane defaults match previous behavior):
 *   TARGET_DOMAIN, CONCURRENCY_LIMIT, REQUEST_TIMEOUT_MS, MAX_RETRIES,
 *   RETRY_BASE_DELAY_MS, BATCH_DELAY_MS, MAX_BODY_BYTES
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// package.json declares "type": "module", so this file is loaded as ESM —
// require()/__dirname aren't available and must be reconstructed like this.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TARGET_DOMAIN = process.env.TARGET_DOMAIN || "immaculate.tr";
const CONCURRENCY_LIMIT = Number(process.env.CONCURRENCY_LIMIT) || 5;
const REQUEST_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS) || 20000;
const MAX_RETRIES = Number(process.env.MAX_RETRIES) || 2;
const RETRY_BASE_DELAY_MS = Number(process.env.RETRY_BASE_DELAY_MS) || 800;
const BATCH_DELAY_MS = Number(process.env.BATCH_DELAY_MS) || 400;
const MAX_BODY_BYTES = Number(process.env.MAX_BODY_BYTES) || 2_000_000; // 2MB cap per response

const SOURCES = [
  { id: "wikipedia-en", name: "Wikipedia (EN)", platform_type: "wiki", base_url: "https://en.wikipedia.org", search_url_template: "https://en.wikipedia.org/w/index.php?search={query}", verify_url_pattern: "immaculate\\.tr", is_active: true, logo_icon: "BookOpen", color: "#000000", sort_order: 1 },
  { id: "wikipedia-tr", name: "Wikipedia (TR)", platform_type: "wiki", base_url: "https://tr.wikipedia.org", search_url_template: "https://tr.wikipedia.org/w/index.php?search={query}", verify_url_pattern: "immaculate\\.tr", is_active: true, logo_icon: "BookOpen", color: "#D4392E", sort_order: 2 },
  { id: "wikimedia-commons", name: "Wikimedia Commons", platform_type: "wiki", base_url: "https://commons.wikimedia.org", search_url_template: "https://commons.wikimedia.org/w/index.php?search={query}", verify_url_pattern: "immaculate\\.tr", is_active: true, logo_icon: "Image", color: "#0066CC", sort_order: 3 },
  { id: "wikidata", name: "Wikidata", platform_type: "wiki", base_url: "https://www.wikidata.org", search_url_template: "https://www.wikidata.org/w/index.php?search={query}", verify_url_pattern: "immaculate\\.tr", is_active: true, logo_icon: "Database", color: "#000000", sort_order: 4 },
  { id: "wiktionary", name: "Wiktionary", platform_type: "wiki", base_url: "https://en.wiktionary.org", search_url_template: "https://en.wiktionary.org/w/index.php?search={query}", verify_url_pattern: "immaculate\\.tr", is_active: true, logo_icon: "BookOpen", color: "#4A4A4A", sort_order: 5 },
  { id: "wikiquote", name: "Wikiquote", platform_type: "wiki", base_url: "https://en.wikiquote.org", search_url_template: "https://en.wikiquote.org/w/index.php?search={query}", verify_url_pattern: "immaculate\\.tr", is_active: true, logo_icon: "BookOpen", color: "#665A3E", sort_order: 6 },
  { id: "wikibooks", name: "Wikibooks", platform_type: "wiki", base_url: "https://en.wikibooks.org", search_url_template: "https://en.wikibooks.org/w/index.php?search={query}", verify_url_pattern: "immaculate\\.tr", is_active: true, logo_icon: "BookOpen", color: "#5C7A99", sort_order: 7 },
  { id: "wikisource", name: "Wikisource", platform_type: "wiki", base_url: "https://en.wikisource.org", search_url_template: "https://en.wikisource.org/w/index.php?search={query}", verify_url_pattern: "immaculate\\.tr", is_active: true, logo_icon: "BookOpen", color: "#436F82", sort_order: 8 },
  { id: "github", name: "GitHub", platform_type: "social", base_url: "https://github.com", search_url_template: "https://github.com/search?q={query}&type=code", verify_url_pattern: "immaculate\\.tr", is_active: true, logo_icon: "Github", color: "#181717", sort_order: 10 },
  { id: "gitlab", name: "GitLab", platform_type: "social", base_url: "https://gitlab.com", search_url_template: "https://gitlab.com/search?search={query}", verify_url_pattern: "immaculate\\.tr", is_active: true, logo_icon: "GitBranch", color: "#FC6D26", sort_order: 11 },
  { id: "codeberg", name: "Codeberg", platform_type: "social", base_url: "https://codeberg.org", search_url_template: "https://codeberg.org/explore/repos?q={query}", verify_url_pattern: "immaculate\\.tr", is_active: true, logo_icon: "GitBranch", color: "#2185D0", sort_order: 12 },
  { id: "sourcehut", name: "SourceHut", platform_type: "social", base_url: "https://sr.ht", search_url_template: "https://sr.ht/projects?search={query}", verify_url_pattern: "immaculate\\.tr", is_active: true, logo_icon: "GitBranch", color: "#000000", sort_order: 13 },
  { id: "bitbucket", name: "Bitbucket", platform_type: "social", base_url: "https://bitbucket.org", search_url_template: "https://bitbucket.org/search?q={query}", verify_url_pattern: "immaculate\\.tr", is_active: true, logo_icon: "GitBranch", color: "#0052CC", sort_order: 14 },
  { id: "gitea", name: "Gitea", platform_type: "social", base_url: "https://gitea.com", search_url_template: "https://gitea.com/explore/repos?q={query}", verify_url_pattern: "immaculate\\.tr", is_active: true, logo_icon: "GitBranch", color: "#609926", sort_order: 15 },
  { id: "reddit", name: "Reddit", platform_type: "social", base_url: "https://www.reddit.com", search_url_template: "https://www.reddit.com/search/.json?q={query}&limit=25", verify_url_pattern: "immaculate\\.tr", is_active: true, logo_icon: "MessageCircle", color: "#FF4500", sort_order: 20 },
  { id: "hackernews", name: "Hacker News", platform_type: "social", base_url: "https://news.ycombinator.com", search_url_template: "https://hn.algolia.com/api/v1/search?query={query}", verify_url_pattern: "immaculate\\.tr", is_active: true, logo_icon: "Newspaper", color: "#FF6600", sort_order: 21 },
  { id: "lobsters", name: "Lobsters", platform_type: "social", base_url: "https://lobste.rs", search_url_template: "https://lobste.rs/search.json?q={query}", verify_url_pattern: "immaculate\\.tr", is_active: true, logo_icon: "Newspaper", color: "#AC130D", sort_order: 22 },
  { id: "slashdot", name: "Slashdot", platform_type: "social", base_url: "https://slashdot.org", search_url_template: "https://slashdot.org/search?query={query}", verify_url_pattern: "immaculate\\.tr", is_active: true, logo_icon: "Newspaper", color: "#026664", sort_order: 23 },
  { id: "stackoverflow", name: "Stack Overflow", platform_type: "qa", base_url: "https://stackoverflow.com", search_url_template: "https://api.stackexchange.com/2.3/search/advanced?q={query}&site=stackoverflow&pagesize=25&order=desc&sort=relevance&filter=withbody", verify_url_pattern: "immaculate\\.tr", is_active: true, logo_icon: "HelpCircle", color: "#F48024", sort_order: 30 },
  { id: "stackexchange", name: "Stack Exchange", platform_type: "qa", base_url: "https://stackexchange.com", search_url_template: "https://api.stackexchange.com/2.3/search/advanced?q={query}&site=serverfault&pagesize=10&order=desc&sort=relevance", verify_url_pattern: "immaculate\\.tr", is_active: true, logo_icon: "HelpCircle", color: "#37A6CE", sort_order: 31 },
  { id: "superuser", name: "Super User", platform_type: "qa", base_url: "https://superuser.com", search_url_template: "https://api.stackexchange.com/2.3/search/advanced?q={query}&site=superuser&pagesize=10&order=desc&sort=relevance", verify_url_pattern: "immaculate\\.tr", is_active: true, logo_icon: "HelpCircle", color: "#47A8DA", sort_order: 32 },
  { id: "askubuntu", name: "Ask Ubuntu", platform_type: "qa", base_url: "https://askubuntu.com", search_url_template: "https://api.stackexchange.com/2.3/search/advanced?q={query}&site=askubuntu&pagesize=10&order=desc&sort=relevance", verify_url_pattern: "immaculate\\.tr", is_active: true, logo_icon: "HelpCircle", color: "#DD4814", sort_order: 33 },
  { id: "quora", name: "Quora", platform_type: "qa", base_url: "https://www.quora.com", search_url_template: "https://www.quora.com/search?q={query}", verify_url_pattern: "immaculate\\.tr", is_active: true, logo_icon: "HelpCircle", color: "#B92B27", sort_order: 34 },
  { id: "devto", name: "Dev.to", platform_type: "social", base_url: "https://dev.to", search_url_template: "https://dev.to/search/feed?q={query}&per_page=30", verify_url_pattern: "immaculate\\.tr", is_active: true, logo_icon: "Code", color: "#0A0A0A", sort_order: 40 },
  { id: "medium", name: "Medium", platform_type: "social", base_url: "https://medium.com", search_url_template: "https://medium.com/search?q={query}", verify_url_pattern: "immaculate\\.tr", is_active: true, logo_icon: "PenTool", color: "#12100E", sort_order: 41 },
  { id: "hashnode", name: "Hashnode", platform_type: "social", base_url: "https://hashnode.com", search_url_template: "https://hashnode.com/search?q={query}", verify_url_pattern: "immaculate\\.tr", is_active: true, logo_icon: "Code", color: "#2962FF", sort_order: 42 },
  { id: "duckduckgo", name: "DuckDuckGo", platform_type: "search", base_url: "https://duckduckgo.com", search_url_template: "https://html.duckduckgo.com/html/?q={query}", verify_url_pattern: "immaculate\\.tr", is_active: true, logo_icon: "Search", color: "#DE5833", sort_order: 50 },
  { id: "bing", name: "Bing", platform_type: "search", base_url: "https://www.bing.com", search_url_template: "https://www.bing.com/search?q={query}", verify_url_pattern: "immaculate\\.tr", is_active: true, logo_icon: "Search", color: "#008373", sort_order: 51 },
  { id: "yandex", name: "Yandex", platform_type: "search", base_url: "https://yandex.com", search_url_template: "https://yandex.com/search/?text={query}", verify_url_pattern: "immaculate\\.tr", is_active: true, logo_icon: "Search", color: "#FF0000", sort_order: 52 },
  { id: "startpage", name: "Startpage", platform_type: "search", base_url: "https://www.startpage.com", search_url_template: "https://www.startpage.com/sp/search?query={query}", verify_url_pattern: "immaculate\\.tr", is_active: true, logo_icon: "Search", color: "#6C5CE7", sort_order: 53 },
  { id: "archive-org", name: "Internet Archive", platform_type: "archive", base_url: "https://archive.org", search_url_template: "https://archive.org/advancedsearch.php?q={query}&fl[]=identifier&fl[]=title&fl[]=url&rows=25&output=json", verify_url_pattern: "immaculate\\.tr", is_active: true, logo_icon: "Archive", color: "#000000", sort_order: 60 },
  { id: "archive-today", name: "archive.today", platform_type: "archive", base_url: "https://archive.ph", search_url_template: "https://archive.ph/{query}", verify_url_pattern: "immaculate\\.tr", is_active: true, logo_icon: "Archive", color: "#0E0E0E", sort_order: 61 },
  { id: "openstreetmap", name: "OpenStreetMap", platform_type: "directory", base_url: "https://www.openstreetmap.org", search_url_template: "https://www.openstreetmap.org/api/0.6/search?q={query}&format=json", verify_url_pattern: "immaculate\\.tr", is_active: true, logo_icon: "Globe", color: "#7EBC6F", sort_order: 70 },
  { id: "crates-io", name: "crates.io", platform_type: "directory", base_url: "https://crates.io", search_url_template: "https://crates.io/api/v1/crates?q={query}&per_page=10", verify_url_pattern: "immaculate\\.tr", is_active: true, logo_icon: "Package", color: "#8B5CF6", sort_order: 71 },
  { id: "npm", name: "npm", platform_type: "directory", base_url: "https://www.npmjs.com", search_url_template: "https://registry.npmjs.org/-/v1/search?text={query}&size=25", verify_url_pattern: "immaculate\\.tr", is_active: true, logo_icon: "Package", color: "#CB3837", sort_order: 72 },
  { id: "pypi", name: "PyPI", platform_type: "directory", base_url: "https://pypi.org", search_url_template: "https://pypi.org/search/?q={query}", verify_url_pattern: "immaculate\\.tr", is_active: true, logo_icon: "Package", color: "#3775A9", sort_order: 73 },
  { id: "rubygems", name: "RubyGems", platform_type: "directory", base_url: "https://rubygems.org", search_url_template: "https://rubygems.org/api/v1/search.json?query={query}", verify_url_pattern: "immaculate\\.tr", is_active: true, logo_icon: "Package", color: "#E9573F", sort_order: 74 },
];

// Heuristic markers for bot-challenge / verification-wall pages, so we can tell
// "server blocked us" apart from "we genuinely didn't find a backlink here".
const BLOCK_MARKERS = [
  "checking your browser",
  "attention required",
  "cf-browser-verification",
  "enable javascript and cookies",
  "just a moment",
  "please verify you are a human",
  "captcha",
  "unusual traffic",
];

function extractTitle(html) {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m && m[1] ? m[1].trim().substring(0, 200) : null;
}

function findBacklink(text, pattern) {
  try {
    const regex = new RegExp(pattern, "i");
    if (regex.test(text)) {
      const urlMatch = text.match(new RegExp("https?://[^\\s\"'<>]*" + pattern, "i"));
      if (urlMatch) return { url: urlMatch[0], anchorText: "" };
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function backoffDelay(attempt, retryAfterMs) {
  if (retryAfterMs != null) return retryAfterMs;
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

// Reads a response body up to maxBytes, then cancels the underlying stream instead
// of buffering an unbounded page fully into memory (protects against huge/odd responses).
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
  const { found_url = null, http_status = null, elapsed = 0, page_title = null, anchor_text = null, error_message = null } = opts;
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

async function fetchOnce(source, timeoutMs) {
  const query = encodeURIComponent(TARGET_DOMAIN);
  const searchUrl = source.search_url_template.replace("{query}", query);
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

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetchOnce(source, timeoutMs);
      const elapsedSoFar = Date.now() - startTime;

      // Rate limited — back off and retry, respecting Retry-After when the server sends one.
      if (response.status === 429) {
        await response.body?.cancel?.().catch(() => {});
        if (attempt < maxRetries) {
          await sleep(backoffDelay(attempt, parseRetryAfter(response.headers.get("retry-after"))));
          continue;
        }
        return buildResult(source, "error", { http_status: 429, elapsed: elapsedSoFar, error_message: `Rate limited (429) after ${attempt + 1} attempts` });
      }

      // Transient server errors — retry a couple of times before giving up.
      if (response.status >= 500 && response.status < 600) {
        await response.body?.cancel?.().catch(() => {});
        if (attempt < maxRetries) {
          await sleep(backoffDelay(attempt));
          continue;
        }
        return buildResult(source, "error", { http_status: response.status, elapsed: elapsedSoFar, error_message: `HTTP ${response.status} after ${attempt + 1} attempts` });
      }

      if (!response.ok && response.status !== 302) {
        return buildResult(source, "error", { http_status: response.status, elapsed: elapsedSoFar, error_message: `HTTP ${response.status}` });
      }

      const contentType = response.headers.get("content-type") || "";
      const bodyText = await readBodyLimited(response, maxBodyBytes);
      const elapsed = Date.now() - startTime;

      if (looksBlocked(bodyText)) {
        return buildResult(source, "error", { http_status: response.status, elapsed, error_message: "Possibly blocked by anti-bot / verification challenge" });
      }

      let found = null;
      let pageTitle = null;

      if (contentType.includes("application/json")) {
        try {
          const json = JSON.parse(bodyText);
          const jsonStr = JSON.stringify(json);
          pageTitle = json.title || json.response?.docs?.[0]?.title || null;
          found = findBacklink(jsonStr, source.verify_url_pattern);
        } catch { /* not JSON */ }
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
      const retryable = isTimeout || err.name === "TypeError" || /ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|network/i.test(message);

      if (retryable && attempt < maxRetries) {
        await sleep(backoffDelay(attempt));
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

  // Defensive check: a duplicate id would silently corrupt the by-id lookups the
  // frontend does, so fail loudly here rather than shipping bad data.
  const seenIds = new Set();
  for (const s of SOURCES) {
    if (seenIds.has(s.id)) {
      console.error(`Fatal: duplicate source id "${s.id}" in SOURCES list`);
      process.exit(1);
    }
    seenIds.add(s.id);
  }

  console.log("Starting backlink verification for " + TARGET_DOMAIN);
  console.log("Sources: " + SOURCES.length);

  let activeSources = SOURCES.filter((s) => s.is_active);
  if (args.sourceFilter) {
    activeSources = activeSources.filter((s) => args.sourceFilter.includes(s.id));
    console.log("Filtered to: " + activeSources.map((s) => s.id).join(", "));
  }

  const results = [];

  for (let i = 0; i < activeSources.length; i += CONCURRENCY_LIMIT) {
    const batch = activeSources.slice(i, i + CONCURRENCY_LIMIT);
    console.log("Batch " + (Math.floor(i / CONCURRENCY_LIMIT) + 1) + ": " + batch.map((b) => b.name).join(", "));

    const batchResults = await Promise.all(
      batch.map((src) => verifySource(src, { timeoutMs: REQUEST_TIMEOUT_MS, maxRetries: MAX_RETRIES, maxBodyBytes: MAX_BODY_BYTES }))
    );

    for (const r of batchResults) {
      const icon = r.status === "verified" ? "✓" : r.status === "not_found" ? "·" : "✗";
      const suffix = r.error_message ? `  (${r.error_message})` : "";
      console.log(`  ${icon} ${r.source_name.padEnd(20)} ${r.status.padEnd(10)} ${r.response_time_ms}ms${suffix}`);
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

  // Safety guard: if literally every source errored, something is systemically broken
  // (network egress blocked, code bug, etc.) rather than "no backlinks found" — don't
  // clobber the last known-good snapshot with an all-error result.
  if (results.length > 0 && errors.length === results.length) {
    console.error(`\nFatal: all ${results.length} sources returned errors. Aborting without writing results.json to avoid overwriting the last good snapshot.`);
    process.exit(1);
  }

  const now = new Date().toISOString();

  const output = {
    target_domain: TARGET_DOMAIN,
    total_sources: results.length,
    verified: verified.length,
    not_found: notFound.length,
    errors: errors.length,
    results: results,
    sources: SOURCES,
    checked_at: now,
    history: [now],
    duration_ms: Date.now() - runStart,
  };

  const outPath = path.join(__dirname, "..", "public", "data", "results.json");
  try {
    const existing = JSON.parse(fs.readFileSync(outPath, "utf8"));
    if (existing.history && Array.isArray(existing.history)) {
      output.history = [...existing.history, now].slice(-52);
    }
  } catch { /* no existing file */ }

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
