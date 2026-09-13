export interface BacklinkSource {
  id: string;
  name: string;
  platform_type: string;
  base_url: string;
  search_url_template: string;
  verify_url_pattern: string;
  is_active: boolean;
  logo_icon: string;
  color: string;
  sort_order: number;
}

import sourcesJson from "../../public/data/sources.json";

export const TARGET_DOMAIN = "immaculate.tr";
export const SOURCES: BacklinkSource[] = sourcesJson as BacklinkSource[];
