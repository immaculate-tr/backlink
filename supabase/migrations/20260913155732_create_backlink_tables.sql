/*
# Backlink Verification System for immaculate.tr

1. New Tables
- `backlink_sources`: Catalog of open-source platforms where backlinks can be created/verified
  - `id` (uuid, primary key)
  - `name` (text, platform name e.g. "Wikipedia")
  - `platform_type` (text, e.g. "wiki", "forum", "directory", "social", "qa", "docs")
  - `base_url` (text, the base URL of the platform)
  - `search_url_template` (text, URL template with {query} placeholder for searching the platform)
  - `verify_url_pattern` (text, regex pattern that a valid backlink URL should match)
  - `content_selector_hint` (text, hint about where to look for links in fetched HTML)
  - `is_active` (boolean, whether this source is currently being checked)
  - `logo_icon` (text, lucide icon name for the platform)
  - `color` (text, brand color for UI)
  - `sort_order` (int, display order)
  - `created_at` (timestamptz)

- `backlink_verifications`: Records of actual verification checks
  - `id` (uuid, primary key)
  - `source_id` (uuid, foreign key to backlink_sources)
  - `target_domain` (text, the domain we're checking backlinks for, e.g. "immaculate.tr")
  - `found_url` (text, the URL where a backlink was found, or null if not found)
  - `status` (text: 'verified', 'not_found', 'error', 'pending')
  - `http_status` (int, HTTP status code returned during check)
  - `response_time_ms` (int, time taken to verify)
  - `page_title` (text, title of the page where backlink was found)
  - `anchor_text` (text, the anchor text of the found backlink)
  - `error_message` (text, error details if status is 'error')
  - `checked_at` (timestamptz, when the check was performed)
  - `created_at` (timestamptz)

2. Security
- Enable RLS on both tables.
- Allow anon + authenticated CRUD since this is a single-tenant dashboard with no sign-in.
- All data is intentionally public/shared.
*/

CREATE TABLE IF NOT EXISTS backlink_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  platform_type text NOT NULL DEFAULT 'directory',
  base_url text NOT NULL,
  search_url_template text NOT NULL,
  verify_url_pattern text NOT NULL DEFAULT 'immaculate\\.tr',
  content_selector_hint text DEFAULT 'body',
  is_active boolean NOT NULL DEFAULT true,
  logo_icon text NOT NULL DEFAULT 'Globe',
  color text NOT NULL DEFAULT '#3B82F6',
  sort_order int NOT NULL DEFAULT 100,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE backlink_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_sources" ON backlink_sources;
CREATE POLICY "anon_select_sources" ON backlink_sources FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_sources" ON backlink_sources;
CREATE POLICY "anon_insert_sources" ON backlink_sources FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_sources" ON backlink_sources;
CREATE POLICY "anon_update_sources" ON backlink_sources FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_sources" ON backlink_sources;
CREATE POLICY "anon_delete_sources" ON backlink_sources FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS backlink_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid REFERENCES backlink_sources(id) ON DELETE CASCADE,
  target_domain text NOT NULL DEFAULT 'immaculate.tr',
  found_url text,
  status text NOT NULL DEFAULT 'pending',
  http_status int,
  response_time_ms int,
  page_title text,
  anchor_text text,
  error_message text,
  checked_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE backlink_verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_verifications" ON backlink_verifications;
CREATE POLICY "anon_select_verifications" ON backlink_verifications FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_verifications" ON backlink_verifications;
CREATE POLICY "anon_insert_verifications" ON backlink_verifications FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_verifications" ON backlink_verifications;
CREATE POLICY "anon_update_verifications" ON backlink_verifications FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_verifications" ON backlink_verifications;
CREATE POLICY "anon_delete_verifications" ON backlink_verifications FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_verifications_source_id ON backlink_verifications(source_id);
CREATE INDEX IF NOT EXISTS idx_verifications_status ON backlink_verifications(status);
CREATE INDEX IF NOT EXISTS idx_verifications_checked_at ON backlink_verifications(checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_sources_active ON backlink_sources(is_active);
