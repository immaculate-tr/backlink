import type { BacklinkSource } from "@/lib/sources";
import { SOURCES, TARGET_DOMAIN } from "@/lib/sources";

export { SOURCES, TARGET_DOMAIN };
export type { BacklinkSource };

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

export interface VerificationRecord {
  id: string;
  source_id: string;
  target_domain: string;
  found_url: string | null;
  status: string;
  http_status: number | null;
  response_time_ms: number | null;
  page_title: string | null;
  anchor_text: string | null;
  error_message: string | null;
  checked_at: string;
  created_at: string;
}
