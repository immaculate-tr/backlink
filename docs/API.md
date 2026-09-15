# API Reference

## Adapter Interface

Her platform adapter'ı aşağıdaki fonksiyonları implemente eder:

### `validate_credentials() -> (bool, str)`
Secret'ların yapılandırılıp yapılandırılmadığını kontrol eder.
- Returns: `(True, "OK")` veya `(False, "error message")`

### `health_check() -> (bool, str)`
Platform API'sinin erişilebilirliğini kontrol eder.
- Returns: `(True, "HTTP 200")` veya `(False, "error message")`

### `build_content(business: dict, target_url: str) -> dict`
Platforma özel içerik üretir.
- Returns: `{"title", "body"|"body_markdown", "anchor", "content_type", "hash", "target_url"}`

### `publish(content: dict) -> dict`
İçeriği platforma yayınlar.
- Returns: `{"success": bool, "url": str}` veya `{"success": False, "error": str}`

### `get_published_url(result: dict) -> str`
Yayın sonrası URL'yi döndürür.

### `rate_limit() -> dict`
Platform rate limit bilgisini döndürür.
- Returns: `{"remaining": int, "limit": int, "reset": int|None}`

## Core Scripts

### `scripts/config.py`
- `is_dry_run() -> bool`
- `is_automation_on() -> bool`
- `get_min_quality_score() -> int`
- `get_quality_tier(score) -> str`
- `load_json(filename) -> dict|list`
- `save_json(filename, data)`
- `get_secret(name) -> str`
- `has_secret(name) -> bool`

### `scripts/core.py`
- `now_iso() -> str` — ISO 8601 timestamp
- `generate_id() -> str` — UUID
- `content_hash(text) -> str` — SHA-256
- `normalize_url(url) -> str`
- `is_valid_url(url) -> bool`
- `is_https(url) -> bool`
- `escape_html(text) -> str`
- `normalize_business(raw) -> dict`
- `log_event(platform, job_id, status, message, logs) -> list`

### `scripts/matcher.py`
- `calculate_match(business, platform) -> dict`
- `get_matching_platforms(business, platforms, min_score) -> list`

### `scripts/content.py`
- `build_content(platform_id, business, target_url) -> dict`
- `get_anchor_variations(business) -> list`
- `is_duplicate(content, platform_id, target_url, backlinks, queue) -> bool`

### `scripts/queue.py`
- `create_job(platform_id, platform_name, target_url, content, match_score) -> dict`
- `add_to_queue(queue, job) -> list`
- `get_pending_jobs(queue) -> list`
- `update_job_status(queue, job_id, status) -> bool`
- `increment_retry(job) -> int`
- `move_to_failed(queue, failed, job) -> list`

### `scripts/publisher.py`
- `get_adapter(platform_id) -> module|None`
- `publish_job(job, queue, backlinks, logs) -> dict`
- `run_publisher()`

### `scripts/verifier.py`
- `verify_backlink(backlink) -> dict`
- `run_verifier()`

### `scripts/retry.py`
- `run_retry()`

### `scripts/health.py`
- `check_platform(platform) -> dict`
- `run_health_check()`

### `scripts/report.py`
- `generate_report() -> dict`
- `run_report()`

### `scripts/scheduler.py`
- `run_scheduler()`

## Queue Statuses

| Status | Açıklama |
|--------|----------|
| `DISCOVERED` | Platform keşfedildi |
| `READY` | Yayına hazır |
| `QUEUED` | Kuyrukta bekliyor |
| `PROCESSING` | İşleniyor |
| `PUBLISHED` | Yayınlandı |
| `VERIFYING` | Doğrulanıyor |
| `VERIFIED` | Doğrulandı |
| `FAILED` | Başarısız |
| `RETRY` | Yeniden denenecek |
| `MANUAL` | Manuel müdahale gerekli |
| `SKIPPED` | Atlandı |
| `REMOVED` | Kaldırıldı |

## Quality Tiers

| Score | Tier |
|-------|------|
| 90-100 | Premium |
| 75-89 | High |
| 60-74 | Medium |
| 40-59 | Low |
| 0-39 | Skip |
