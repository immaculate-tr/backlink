import hashlib
import uuid
import re
from datetime import datetime, timezone
from urllib.parse import urlparse


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def generate_id() -> str:
    return str(uuid.uuid4())


def content_hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def normalize_url(url: str) -> str:
    if not url:
        return ""
    url = url.strip()
    if not url.startswith(("http://", "https://")):
        url = "https://" + url
    parsed = urlparse(url)
    scheme = "https" if parsed.scheme in ("https", "") else parsed.scheme
    netloc = parsed.netloc.lower()
    path = parsed.path.rstrip("/") or "/"
    normalized = f"{scheme}://{netloc}{path}"
    if parsed.query:
        normalized += f"?{parsed.query}"
    return normalized


def is_valid_url(url: str) -> bool:
    if not url:
        return False
    try:
        parsed = urlparse(url)
        return bool(parsed.scheme in ("http", "https") and parsed.netloc)
    except Exception:
        return False


def is_https(url: str) -> bool:
    return url.startswith("https://")


def escape_html(text: str) -> str:
    if not text:
        return ""
    text = text.replace("&", "&amp;")
    text = text.replace("<", "&lt;")
    text = text.replace(">", "&gt;")
    text = text.replace('"', "&quot;")
    text = text.replace("'", "&#039;")
    return text


def truncate(text: str, max_len: int) -> str:
    if not text:
        return ""
    return text[:max_len] + "..." if len(text) > max_len else text


def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_-]+", "-", text)
    text = text.strip("-")
    return text


def normalize_business(raw: dict) -> dict:
    return {
        "name": (raw.get("name") or "").strip(),
        "website": normalize_url(raw.get("website", "")),
        "description": (raw.get("description") or "").strip(),
        "category": slugify(raw.get("category", "")),
        "country": (raw.get("country") or "").strip().upper(),
        "city": (raw.get("city") or "").strip(),
        "language": (raw.get("language") or "en").strip().lower(),
        "email": (raw.get("email") or "").strip(),
        "phone": (raw.get("phone") or "").strip(),
        "logo": (raw.get("logo") or "").strip(),
        "keywords": [k.strip() for k in (raw.get("keywords") or []) if k.strip()],
        "social_profiles": raw.get("social_profiles") or {},
        "target_urls": [normalize_url(u) for u in (raw.get("target_urls") or []) if u.strip()],
    }


def log_event(platform: str, job_id: str, status: str, message: str, logs_data: list):
    entry = {
        "timestamp": now_iso(),
        "platform": platform,
        "job_id": job_id,
        "status": status,
        "message": message,
    }
    logs_data.append(entry)
    if len(logs_data) > 5000:
        logs_data = logs_data[-5000:]
    return logs_data
