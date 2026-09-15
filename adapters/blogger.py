import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

try:
    import requests
except ImportError:
    requests = None

from scripts.config import get_secret
from scripts.content import build_blogger_content

API_BASE = "https://www.googleapis.com/blogger/v3"


def validate_credentials():
    token = get_secret("BLOGGER_TOKEN")
    if not token:
        return False, "BLOGGER_TOKEN not configured"
    return True, "OK"


def health_check():
    if requests is None:
        return False, "requests library not available"
    token = get_secret("BLOGGER_TOKEN")
    if not token:
        return False, "BLOGGER_TOKEN not configured"
    try:
        resp = requests.get(f"{API_BASE}/users/self", headers=_headers(), timeout=15)
        return resp.status_code == 200, f"HTTP {resp.status_code}"
    except Exception as e:
        return False, str(e)


def _headers():
    return {
        "Authorization": f"Bearer {get_secret('BLOGGER_TOKEN')}",
        "Content-Type": "application/json",
    }


def rate_limit():
    return {"remaining": 10000, "limit": 10000, "reset": None}


def build_content(business, target_url):
    return build_blogger_content(business, target_url)


def publish(content):
    token = get_secret("BLOGGER_TOKEN")
    blog_id = get_secret("BLOGGER_BLOG_ID")
    if not token:
        return {"success": False, "error": "BLOGGER_TOKEN not configured"}
    if not blog_id:
        return {"success": False, "error": "BLOGGER_BLOG_ID not configured"}

    if requests is None:
        return {"success": False, "error": "requests library not available"}

    payload = {
        "kind": "blogger#post",
        "title": content.get("title", ""),
        "content": content.get("body", ""),
    }

    try:
        resp = requests.post(f"{API_BASE}/blogs/{blog_id}/posts", headers=_headers(), json=payload, timeout=30)
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
