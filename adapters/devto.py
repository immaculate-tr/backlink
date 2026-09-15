import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

try:
    import requests
except ImportError:
    requests = None

from scripts.config import get_secret
from scripts.content import build_devto_content

API_BASE = "https://dev.to/api"


def validate_credentials():
    key = get_secret("DEVTO_API_KEY")
    if not key:
        return False, "DEVTO_API_KEY not configured"
    return True, "OK"


def health_check():
    if requests is None:
        return False, "requests library not available"
    try:
        resp = requests.get(f"{API_BASE}/articles/me", headers=_headers(), timeout=15)
        return resp.status_code == 200, f"HTTP {resp.status_code}"
    except Exception as e:
        return False, str(e)


def _headers():
    return {
        "api-key": get_secret("DEVTO_API_KEY"),
        "Content-Type": "application/json",
    }


def rate_limit():
    return {"remaining": 10, "limit": 10, "reset": None}


def build_content(business, target_url):
    return build_devto_content(business, target_url)


def publish(content):
    key = get_secret("DEVTO_API_KEY")
    if not key:
        return {"success": False, "error": "DEVTO_API_KEY not configured"}

    if requests is None:
        return {"success": False, "error": "requests library not available"}

    body = content.get("body_markdown", content.get("body", ""))
    payload = {
        "article": {
            "title": content.get("title", ""),
            "body_markdown": body,
            "published": True,
        }
    }

    try:
        resp = requests.post(f"{API_BASE}/articles", headers=_headers(), json=payload, timeout=30)
        if resp.status_code in (200, 201):
            data = resp.json()
            url = data.get("url", "")
            return {"success": True, "url": url}
        else:
            return {"success": False, "error": f"HTTP {resp.status_code}: {resp.text[:200]}"}
    except Exception as e:
        return {"success": False, "error": str(e)}


def get_published_url(result):
    return result.get("url", "")
