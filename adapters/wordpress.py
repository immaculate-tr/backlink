import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

try:
    import requests
except ImportError:
    requests = None

from scripts.config import get_secret
from scripts.content import build_wordpress_content


def _get_base_url():
    return get_secret("WORDPRESS_URL", "").rstrip("/")


def validate_credentials():
    token = get_secret("WORDPRESS_TOKEN")
    url = _get_base_url()
    if not token:
        return False, "WORDPRESS_TOKEN not configured"
    if not url:
        return False, "WORDPRESS_URL not configured"
    return True, "OK"


def health_check():
    if requests is None:
        return False, "requests library not available"
    base = _get_base_url()
    if not base:
        return False, "WORDPRESS_URL not configured"
    try:
        resp = requests.get(f"{base}/wp-json/wp/v2/posts?per_page=1", headers=_headers(), timeout=15)
        return resp.status_code == 200, f"HTTP {resp.status_code}"
    except Exception as e:
        return False, str(e)


def _headers():
    return {
        "Authorization": f"Bearer {get_secret('WORDPRESS_TOKEN')}",
        "Content-Type": "application/json",
    }


def rate_limit():
    return {"remaining": 100, "limit": 100, "reset": None}


def build_content(business, target_url):
    return build_wordpress_content(business, target_url)


def publish(content):
    token = get_secret("WORDPRESS_TOKEN")
    base = _get_base_url()
    if not token:
        return {"success": False, "error": "WORDPRESS_TOKEN not configured"}
    if not base:
        return {"success": False, "error": "WORDPRESS_URL not configured"}

    if requests is None:
        return {"success": False, "error": "requests library not available"}

    payload = {
        "title": content.get("title", ""),
        "content": content.get("body", ""),
        "status": "publish",
    }

    try:
        resp = requests.post(f"{base}/wp-json/wp/v2/posts", headers=_headers(), json=payload, timeout=30)
        if resp.status_code in (200, 201):
            data = resp.json()
            url = data.get("link", "")
            return {"success": True, "url": url}
        else:
            return {"success": False, "error": f"HTTP {resp.status_code}: {resp.text[:200]}"}
    except Exception as e:
        return {"success": False, "error": str(e)}


def get_published_url(result):
    return result.get("url", "")
