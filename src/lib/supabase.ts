import type { BacklinkSource } from "@/lib/sources";

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
