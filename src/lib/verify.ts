import type { BacklinkSource } from "@/lib/sources";
import { TARGET_DOMAIN, SOURCES } from "@/lib/sources";

export interface VerificationResult {
  source_id: string;
  source_name: string;
  /**
   * "server_only" means this platform doesn't support cross-origin browser
   * requests (see BacklinkSource.cors_ok) and simply hasn't been checked yet
   * by the weekly GitHub Actions run — it is NOT an error, just "no data yet".
   */
  status: "verified" | "not_found" | "error" | "server_only";
  found_url: string | null;
  http_status: number | null;
  response_time_ms: number | null;
  page_title: string | null;
  anchor_text: string | null;
  error_message: string | null;
}

export interface ResultsData {
  target_domain: string;
  total_sources: number;
  verified: number;
  not_found: number;
  errors: number;
  results: VerificationResult[];
  sources: BacklinkSource[];
  checked_at: string | null;
  history: string[];
}

export { TARGET_DOMAIN, SOURCES };

function extractTitle(html: string): string | null {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m && m[1] ? m[1].trim().substring(0, 200) : null;
}

function isSameOrSubdomain(hostname: string, domain: string): boolean {
  const h = hostname.toLowerCase().replace(/^www\./, "");
  const d = domain.toLowerCase().replace(/^www\./, "");
  return h === d || h.endsWith("." + d);
}

/**
 * Scans text for URLs and returns the first one whose hostname is actually
 * the target domain (or a subdomain of it) — not merely a URL that happens
 * to contain the domain string somewhere in its path or query parameters.
 * `pattern` is the pre-escaped domain regex (e.g. "immaculate\\.tr").
 */
function findBacklink(text: string, pattern: string): { url: string; anchorText: string } | null {
  try {
    // Quick pre-check: bail out fast if the domain string doesn't appear at all.
    if (!new RegExp(pattern, "i").test(text)) return null;

    const domain = pattern.replace(/\\\./g, ".");
    const urlRegex = /https?:\/\/[^\s"'<>)]+/gi;
    let match: RegExpExecArray | null;

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

    // Protocol-relative or bare mentions like "//immaculate.tr" or "www.immaculate.tr"
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

/**
 * Extracts the registrable "base domain" (last two labels) from a URL's
 * hostname — e.g. "en.wikipedia.org" and "commons.wikimedia.org" both share
 * request quotas with their siblings, but "en.wikipedia.org" and
 * "tr.wikipedia.org" are DIFFERENT hostnames that still hit the SAME shared
 * backend. Grouping by base domain lets us throttle requests to the same
 * underlying infrastructure even when each source uses a different subdomain.
 */
function getBaseDomain(url: string): string {
  try {
    const host = new URL(url).hostname;
    const parts = host.split(".");
    return parts.slice(-2).join(".");
  } catch {
    return "";
  }
}

// Every language edition of Wikipedia shares the same Wikimedia backend and
// rate limiter, so they're throttled as one group ("wikimedia") rather than
// as independent base domains — see the matching comment in
// scripts/verify-backlinks.cjs for the full explanation.
const WIKIMEDIA_HOST_SUFFIXES = new Set([
  "wikipedia.org", "wiktionary.org", "wikiquote.org", "wikibooks.org",
  "wikisource.org", "wikinews.org", "wikiversity.org", "wikivoyage.org",
  "wikidata.org", "wikimedia.org", "mediawiki.org", "wikispecies.org",
]);
function getThrottleKey(url: string): string {
  const base = getBaseDomain(url);
  return WIKIMEDIA_HOST_SUFFIXES.has(base) ? "wikimedia" : base;
}

const MIN_GAP_MS = 200;

/**
 * Reserves the next available time slot for a given base domain so that
 * concurrent requests to the same shared infrastructure (e.g. all Wikipedia
 * language editions, or the Stack Exchange API) are spaced out instead of
 * firing all at once — which is exactly what triggers HTTP 429 responses.
 */
async function waitForDomainSlot(baseDomain: string, throttle: Map<string, number>): Promise<void> {
  if (!baseDomain) return;
  const now = Date.now();
  const nextAllowed = throttle.get(baseDomain) ?? 0;
  const scheduledStart = Math.max(now, nextAllowed);
  throttle.set(baseDomain, scheduledStart + MIN_GAP_MS);
  const waitMs = scheduledStart - now;
  if (waitMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const SERVER_ONLY_MESSAGE =
  "Bu platform tarayıcıdan (CORS) doğrudan erişilemiyor; yalnızca haftalık GitHub Actions taramasında kontrol edilir.";

/**
 * For a platform that doesn't support cross-origin browser fetches, there is
 * nothing useful to do from the browser: attempting fetch() would just burn
 * a 15s timeout and produce a guaranteed, misleading "Hata". Instead, reuse
 * whatever the last real (server-side) check found for it, if we have one —
 * otherwise report it honestly as "not checked from the browser yet" rather
 * than a false error.
 */
function serverOnlyResult(
  source: BacklinkSource,
  previous?: VerificationResult
): VerificationResult {
  // Only ever reuse a previous result here if it was an actual, trustworthy
  // check outcome (found it / confirmed not there). A previous "error" is
  // discarded on purpose: for a source that just became server-only, that
  // "error" is almost certainly a stale browser-side failure (CORS block,
  // rate limit, quota ban) from before it was reclassified — carrying it
  // forward would silently resurrect exactly the bug this status exists to
  // avoid. If there's no verified/not_found result to fall back on, this is
  // honestly "not checked yet", not an error.
  if (previous && (previous.status === "verified" || previous.status === "not_found")) {
    return { ...previous, source_id: source.id, source_name: source.name };
  }
  return {
    source_id: source.id,
    source_name: source.name,
    status: "server_only",
    found_url: null,
    http_status: null,
    response_time_ms: null,
    page_title: null,
    anchor_text: null,
    error_message: SERVER_ONLY_MESSAGE,
  };
}

async function verifySource(
  source: BacklinkSource,
  domain: string,
  throttle: Map<string, number>,
  previousBySourceId?: Map<string, VerificationResult>
): Promise<VerificationResult> {
  if (!source.cors_ok) {
    return serverOnlyResult(source, previousBySourceId?.get(source.id));
  }

  const startTime = Date.now();
  const query = encodeURIComponent(domain);
  const searchUrl = source.search_url_template.replace("{query}", query);
  const baseDomain = getThrottleKey(searchUrl);
  const maxAttempts = 3;

  await waitForDomainSlot(baseDomain, throttle);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(searchUrl, {
        headers: {
          Accept: "text/html,application/json,*/*",
          "Accept-Language": "en-US,en;q=0.9,tr;q=0.8",
        },
        signal: controller.signal,
        redirect: "follow",
      });

      clearTimeout(timeoutId);
      const elapsed = Date.now() - startTime;

      // Rate-limited: back off and retry instead of giving up immediately.
      if (response.status === 429 && attempt < maxAttempts) {
        const retryAfterHeader = response.headers.get("retry-after");
        const retryAfterMs = retryAfterHeader ? parseInt(retryAfterHeader, 10) * 1000 : 1500 * attempt;
        await sleep(Math.min(Number.isFinite(retryAfterMs) ? retryAfterMs : 1500 * attempt, 6000));
        await waitForDomainSlot(baseDomain, throttle);
        continue;
      }

      if (!response.ok && response.status !== 302) {
        return {
          source_id: source.id, source_name: source.name, status: "error",
          found_url: null, http_status: response.status, response_time_ms: elapsed,
          page_title: null, anchor_text: null, error_message: "HTTP " + response.status,
        };
      }

      const contentType = response.headers.get("content-type") || "";
      const bodyText = await response.text();
      let found: { url: string; anchorText: string } | null = null;
      let pageTitle: string | null = null;

      if (contentType.includes("application/json")) {
        try {
          const json = JSON.parse(bodyText);
          const jsonStr = JSON.stringify(json);
          pageTitle = json.title || null;
          found = findBacklink(jsonStr, source.verify_url_pattern);
        } catch { /* not JSON */ }
      } else {
        pageTitle = extractTitle(bodyText);
        found = findBacklink(bodyText, source.verify_url_pattern);
      }

      return {
        source_id: source.id, source_name: source.name,
        status: found ? "verified" : "not_found",
        found_url: found ? found.url : null,
        http_status: response.status, response_time_ms: elapsed,
        page_title: pageTitle, anchor_text: found ? found.anchorText : null,
        error_message: null,
      };
    } catch (err) {
      const isLastAttempt = attempt >= maxAttempts;
      if (!isLastAttempt) {
        // Transient network hiccup — brief backoff, then retry once more.
        await sleep(500 * attempt);
        await waitForDomainSlot(baseDomain, throttle);
        continue;
      }
      const elapsed = Date.now() - startTime;
      const msg = err instanceof Error
        ? err.name === "AbortError" ? "Zaman aşımı (15s)" : err.message
        : "Bilinmeyen hata";
      return {
        source_id: source.id, source_name: source.name, status: "error",
        found_url: null, http_status: null, response_time_ms: elapsed,
        page_title: null, anchor_text: null, error_message: msg,
      };
    }
  }

  // Unreachable, but keeps TypeScript satisfied.
  return {
    source_id: source.id, source_name: source.name, status: "error",
    found_url: null, http_status: null, response_time_ms: Date.now() - startTime,
    page_title: null, anchor_text: null, error_message: "Bilinmeyen hata",
  };
}

export type ProgressCallback = (completed: number, total: number, currentName: string) => void;

export async function runVerification(
  domain: string,
  sourcesToScan: BacklinkSource[],
  onProgress?: ProgressCallback,
  previousResults?: VerificationResult[]
): Promise<VerificationResult[]> {
  const active = sourcesToScan.filter((s) => s.is_active);
  const concurrencyLimit = 8;
  const throttle = new Map<string, number>();
  const results: VerificationResult[] = [];
  const previousBySourceId = new Map<string, VerificationResult>();
  for (const r of previousResults || []) {
    previousBySourceId.set(r.source_id, r);
  }
  let completed = 0;

  // "Kademeli" rollout: sources are checked in small concurrent batches with a
  // per-domain throttle (see waitForDomainSlot) rather than all 500+ at once,
  // so shared infrastructure (e.g. every Wikipedia language edition) never
  // gets hit hard enough to trigger 429s.
  for (let i = 0; i < active.length; i += concurrencyLimit) {
    const batch = active.slice(i, i + concurrencyLimit);
    const batchResults = await Promise.all(
      batch.map(async (src) => {
        const result = await verifySource(src, domain, throttle, previousBySourceId);
        completed++;
        if (onProgress) {
          onProgress(completed, active.length, src.name);
        }
        return result;
      })
    );
    results.push(...batchResults);
  }

  return results;
}

const STORAGE_KEY = "backlink_results_immaculate";

export function saveResults(results: VerificationResult[], checkedAt: string): void {
  try {
    const existing = loadStoredResults();
    const history = existing?.history || [];
    history.push(checkedAt);
    const data: ResultsData = {
      target_domain: TARGET_DOMAIN,
      total_sources: results.length,
      verified: results.filter((r) => r.status === "verified").length,
      not_found: results.filter((r) => r.status === "not_found").length,
      errors: results.filter((r) => r.status === "error").length,
      results,
      sources: SOURCES,
      checked_at: checkedAt,
      history: history.slice(-52),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch { /* storage full or unavailable */ }
}

export function loadStoredResults(): ResultsData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ResultsData;
  } catch {
    return null;
  }
}

export async function loadResults(): Promise<ResultsData | null> {
  const stored = loadStoredResults();
  if (stored && stored.results.length > 0) return stored;

  try {
    const response = await fetch("data/results.json", { cache: "no-store" });
    if (response.ok) {
      const data: ResultsData = await response.json();
      if (data.results && data.results.length > 0) return data;
    }
  } catch { /* file may not exist yet */ }

  return stored;
}

function csvEscape(value: string): string {
  if (value == null) return "";
  const str = String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

/**
 * Builds a CSV diagnostic report of every source that ended in "error" status:
 * which platform, what HTTP code (if any), the exact error message the browser
 * gave, how long it took, and the precise URL that was attempted — so each
 * failure can be looked up and fixed individually instead of guessing.
 * Returns null if there is nothing to report.
 */
export function buildErrorReportCSV(
  results: VerificationResult[],
  sources: BacklinkSource[],
  domain: string
): string | null {
  const errorResults = results.filter((r) => r.status === "error");
  if (errorResults.length === 0) return null;

  const sourceMap = new Map(sources.map((s) => [s.id, s]));
  const header = [
    "Platform",
    "HTTP Kodu",
    "Hata Mesajı",
    "Süre (ms)",
    "Denenen Arama URL'si",
    "Platform Ana Adresi",
  ];

  const rows = errorResults.map((r) => {
    const src = sourceMap.get(r.source_id);
    const triedUrl = src
      ? src.search_url_template.replace("{query}", encodeURIComponent(domain))
      : "";
    return [
      r.source_name,
      r.http_status != null ? String(r.http_status) : "",
      r.error_message || "",
      r.response_time_ms != null ? String(r.response_time_ms) : "",
      triedUrl,
      src ? src.base_url : "",
    ]
      .map(csvEscape)
      .join(",");
  });

  // UTF-8 BOM so Excel/Sheets renders Turkish characters correctly.
  return "\uFEFF" + [header.join(","), ...rows].join("\r\n");
}

/** Triggers a browser download of the given CSV content. */
export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
