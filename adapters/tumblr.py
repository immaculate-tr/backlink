import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

try:
    import requests
except ImportError:
    requests = None

from scripts.config import get_secret
from scripts.content import build_tumblr_content

API_BASE = "https://api.tumblr.com/v2"


def validate_credentials():
    key = get_secret("TUMBLR_CONSUMER_KEY")
    token = get_secret("TUMBLR_OAUTH_TOKEN")
    if not key or not token:
        return False, "TUMBLR_CONSUMER_KEY or TUMBLR_OAUTH_TOKEN not configured"
    return True, "OK"


def health_check():
    if requests is None:
        return False, "requests library not available"
    try:
        resp = requests.get(f"{API_BASE}/user/info", params=_params(), timeout=15)
        return resp.status_code == 200, f"HTTP {resp.status_code}"
    except Exception as e:
        return False, str(e)


def _params():
    return {
        "api_key": get_secret("TUMBLR_CONSUMER_KEY"),
    }


def rate_limit():
    return {"remaining": 1000, "limit": 1000, "reset": None}


def build_content(business, target_url):
    return build_tumblr_content(business, target_url)


def publish(content):
    key = get_secret("TUMBLR_CONSUMER_KEY")
    token = get_secret("TUMBLR_OAUTH_TOKEN")
    blog_name = get_secret("TUMBLR_BLOG_NAME")
    if not key or not token:
        return {"success": False, "error": "TUMBLR credentials not configured"}
    if not blog_name:
        return {"success": False, "error": "TUMBLR_BLOG_NAME not configured"}

    if requests is None:
        return {"success": False, "error": "requests library not available"}

    payload = {
        "type": "text",
        "title": content.get("title", ""),
        "body": content.get("body", ""),
    }

    try:
        resp = requests.post(f"{API_BASE}/blog/{blog_name}.tumblr.com/post", data=payload, timeout=30)
        if resp.status_code in (200, 201):
            data = resp.json()
            post_id = data.get("response", {}).get("id", "")
            url = f"https://{blog_name}.tumblr.com/post/{post_id}" if post_id else ""
            return {"success": True, "url": url}
        else:
            return {"success": False, "error": f"HTTP {resp.status_code}: {resp.text[:200]}"}
    except Exception as e:
        return {"success": False, "error": str(e)}


def get_published_url(result):
    return result.get("url", "")
