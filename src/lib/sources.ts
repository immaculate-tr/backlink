export interface BacklinkSource {
  id: string;
  name: string;
  platform_type: string;
  base_url: string;
  search_url_template: string;
  verify_url_pattern: string;
  is_active: boolean;
  /**
   * Whether this platform's endpoint sends CORS headers permissive enough for
   * a browser to call it directly with fetch() (or supports MediaWiki's
   * `origin=*` trick). When false/undefined, the endpoint can only be
   * verified server-side (no CORS restrictions apply there), so the
   * in-browser "Tarama Başlat" scan skips fetching it directly instead of
   * reporting a guaranteed, meaningless "Failed to fetch" as an error.
   */
  cors_ok?: boolean;
  logo_icon: string;
  color: string;
  sort_order: number;
}

import sourcesJson from "../../public/data/sources.json";

export const TARGET_DOMAIN = "immaculate.tr";
export const SOURCES: BacklinkSource[] = sourcesJson as BacklinkSource[];
