import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SourceRow {
  id: string;
  name: string;
  base_url: string;
  search_url_template: string;
  verify_url_pattern: string;
}

interface VerifyResult {
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

function extractTitle(html: string): string | null {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch && titleMatch[1]) {
    return titleMatch[1].trim().substring(0, 200);
  }
  return null;
}

function findBacklinkInHtml(
  html: string,
  domainPattern: string
): { url: string; anchorText: string } | null {
  try {
    const regex = new RegExp(domainPattern, "i");
    const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>([^<]*)<\/a>/gi;
    let match;
    while ((match = linkRegex.exec(html)) !== null) {
      const href = match[1];
      const anchor = match[2]?.trim() || "";
      if (regex.test(href)) {
        return { url: href, anchorText: anchor.substring(0, 100) };
      }
    }
    if (regex.test(html)) {
      const urlMatch = html.match(
        new RegExp(`https?://[^\s"'<>]*${domainPattern}`, "i")
      );
      if (urlMatch) {
        return { url: urlMatch[0], anchorText: "" };
      }
    }
    return null;
  } catch {
    return null;
  }
}

async function verifySource(
  source: SourceRow,
  targetDomain: string
): Promise<VerifyResult> {
  const startTime = Date.now();
  const query = encodeURIComponent(targetDomain);
  const searchUrl = source.search_url_template.replace("{query}", query);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; BacklinkVerifier/1.0; +https://immaculate.tr)",
        Accept: "text/html,application/json,*/*",
        "Accept-Language": "en-US,en;q=0.9,tr;q=0.8",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;

    if (!response.ok && response.status !== 302) {
      return {
        source_id: source.id,
        source_name: source.name,
        status: "error",
        found_url: null,
        http_status: response.status,
        response_time_ms: responseTime,
        page_title: null,
        anchor_text: null,
        error_message: `HTTP ${response.status}`,
      };
    }

    const contentType = response.headers.get("content-type") || "";
    const bodyText = await response.text();

    let foundBacklink: { url: string; anchorText: string } | null = null;
    let pageTitle: string | null = null;

    if (contentType.includes("application/json")) {
      try {
        const jsonData = JSON.parse(bodyText);
        const jsonString = JSON.stringify(jsonData);
        const regex = new RegExp(source.verify_url_pattern, "i");
        if (regex.test(jsonString)) {
          const urlMatch = jsonString.match(
            new RegExp(`https?://[^"\\s]*${source.verify_url_pattern}`, "i")
          );
          foundBacklink = urlMatch
            ? { url: urlMatch[0], anchorText: "" }
            : null;
        }
        if (jsonData?.hits?.hits) {
          for (const hit of jsonData.hits.hits) {
            const hitStr = JSON.stringify(hit);
            if (regex.test(hitStr)) {
              const urlMatch = hitStr.match(
                new RegExp(`https?://[^"\\s]*${source.verify_url_pattern}`, "i")
              );
              if (urlMatch) {
                foundBacklink = { url: urlMatch[0], anchorText: "" };
                pageTitle =
                  hit._source?.title ||
                  hit._source?.story_title ||
                  extractTitle(hitStr);
                break;
              }
            }
          }
        }
      } catch {
        // not JSON
      }
    } else {
      pageTitle = extractTitle(bodyText);
      foundBacklink = findBacklinkInHtml(bodyText, source.verify_url_pattern);
    }

    const elapsed = Date.now() - startTime;

    return {
      source_id: source.id,
      source_name: source.name,
      status: foundBacklink ? "verified" : "not_found",
      found_url: foundBacklink?.url || null,
      http_status: response.status,
      response_time_ms: elapsed,
      page_title: pageTitle,
      anchor_text: foundBacklink?.anchorText || null,
      error_message: null,
    };
  } catch (err) {
    const elapsed = Date.now() - startTime;
    const errorMsg =
      err instanceof Error
        ? err.name === "AbortError"
          ? "Request timed out (15s)"
          : err.message
        : "Unknown error";

    return {
      source_id: source.id,
      source_name: source.name,
      status: "error",
      found_url: null,
      http_status: null,
      response_time_ms: elapsed,
      page_title: null,
      anchor_text: null,
      error_message: errorMsg,
    };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({ error: "Server configuration missing" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    let targetDomain = "immaculate.tr";
    let sourceId: string | null = null;

    if (req.method === "POST") {
      try {
        const body = await req.json();
        if (body.target_domain) targetDomain = body.target_domain;
        if (body.source_id) sourceId = body.source_id;
      } catch {
        // use defaults
      }
    }

    let query = supabase
      .from("backlink_sources")
      .select("id, name, base_url, search_url_template, verify_url_pattern")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (sourceId) {
      query = query.eq("id", sourceId);
    }

    const { data: sources, error: sourcesError } = await query;

    if (sourcesError) {
      return new Response(
        JSON.stringify({ error: sourcesError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!sources || sources.length === 0) {
      return new Response(
        JSON.stringify({ error: "No active sources found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const concurrencyLimit = 5;
    const results: VerifyResult[] = [];

    for (let i = 0; i < sources.length; i += concurrencyLimit) {
      const batch = sources.slice(i, i + concurrencyLimit);
      const batchResults = await Promise.all(
        batch.map((src) => verifySource(src as SourceRow, targetDomain))
      );
      results.push(...batchResults);
    }

    const verificationsToInsert = results.map((r) => ({
      source_id: r.source_id,
      target_domain: targetDomain,
      found_url: r.found_url,
      status: r.status,
      http_status: r.http_status,
      response_time_ms: r.response_time_ms,
      page_title: r.page_title,
      anchor_text: r.anchor_text,
      error_message: r.error_message,
      checked_at: new Date().toISOString(),
    }));

    const { error: insertError } = await supabase
      .from("backlink_verifications")
      .insert(verificationsToInsert);

    if (insertError) {
      console.error("Insert error:", insertError.message);
    }

    const verified = results.filter((r) => r.status === "verified").length;
    const notFound = results.filter((r) => r.status === "not_found").length;
    const errors = results.filter((r) => r.status === "error").length;

    return new Response(
      JSON.stringify({
        target_domain: targetDomain,
        total_sources: results.length,
        verified,
        not_found: notFound,
        errors,
        results,
        checked_at: new Date().toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMsg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
