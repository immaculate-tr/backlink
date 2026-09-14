import type { BacklinkSource } from "@/lib/sources";
import { TARGET_DOMAIN, SOURCES } from "@/lib/sources";

export interface VerificationResult {
  source_id: string;
  source_name: string;
  status: "verified" | "not_found" | "error";
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

async function verifySource(source: BacklinkSource, domain: string): Promise<VerificationResult> {
  const startTime = Date.now();
  const query = encodeURIComponent(domain);
  const searchUrl = source.search_url_template.replace("{query}", query);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; BacklinkVerifier/1.0; +https://immaculate.tr)",
        Accept: "text/html,application/json,*/*",
        "Accept-Language": "en-US,en;q=0.9,tr;q=0.8",
      },
      signal: controller.signal,
      redirect: "follow",
    });

    clearTimeout(timeoutId);
    const elapsed = Date.now() - startTime;

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

export type ProgressCallback = (completed: number, total: number, currentName: string) => void;

export async function runVerification(
  domain: string,
  sourcesToScan: BacklinkSource[],
  onProgress?: ProgressCallback
): Promise<VerificationResult[]> {
  const active = sourcesToScan.filter((s) => s.is_active);
  const concurrencyLimit = 8;
  const results: VerificationResult[] = [];
  let completed = 0;

  for (let i = 0; i < active.length; i += concurrencyLimit) {
    const batch = active.slice(i, i + concurrencyLimit);
    const batchResults = await Promise.all(
      batch.map(async (src) => {
        const result = await verifySource(src, domain);
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
