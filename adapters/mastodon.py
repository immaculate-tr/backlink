import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

try:
    import requests
except ImportError:
    requests = None

from scripts.config import get_secret
from scripts.content import build_mastodon_content


def _get_instance():
    return get_secret("MASTODON_INSTANCE", "https://mastodon.social").rstrip("/")


def validate_credentials():
    token = get_secret("MASTODON_TOKEN")
    if not token:
        return False, "MASTODON_TOKEN not configured"
    return True, "OK"


def health_check():
    if requests is None:
        return False, "requests library not available"
    instance = _get_instance()
    token = get_secret("MASTODON_TOKEN")
    if not token:
        return False, "MASTODON_TOKEN not configured"
    try:
        resp = requests.get(f"{instance}/api/v1/accounts/verify_credentials", headers=_headers(), timeout=15)
        return resp.status_code == 200, f"HTTP {resp.status_code}"
    except Exception as e:
        return False, str(e)


def _headers():
    return {
        "Authorization": f"Bearer {get_secret('MASTODON_TOKEN')}",
        "Content-Type": "application/json",
    }


def rate_limit():
    return {"remaining": 300, "limit": 300, "reset": None}


def build_content(business, target_url):
    return build_mastodon_content(business, target_url)


def publish(content):
    token = get_secret("MASTODON_TOKEN")
    if not token:
        return {"success": False, "error": "MASTODON_TOKEN not configured"}

    if requests is None:
        return {"success": False, "error": "requests library not available"}

    instance = _get_instance()
    payload = {
        "status": content.get("body", ""),
        "visibility": "public",
    }

    try:
        resp = requests.post(f"{instance}/api/v1/statuses", headers=_headers(), json=payload, timeout=30)
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
