import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

try:
    import requests
except ImportError:
    requests = None

from scripts.config import get_secret, has_secret
from scripts.content import build_github_content

API_BASE = "https://api.github.com"


def validate_credentials():
    token = get_secret("GITHUB_TOKEN")
    if not token:
        return False, "GITHUB_TOKEN not configured"
    return True, "OK"


def health_check():
    if requests is None:
        return False, "requests library not available"
    try:
        resp = requests.get(f"{API_BASE}/rate_limit", headers=_headers(), timeout=15)
        return resp.status_code == 200, f"HTTP {resp.status_code}"
    except Exception as e:
        return False, str(e)


def _headers():
    token = get_secret("GITHUB_TOKEN")
    return {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "BacklinkAutomation/1.0",
    }


def rate_limit():
    if requests is None:
        return {"remaining": 0, "limit": 5000, "reset": None}
    try:
        resp = requests.get(f"{API_BASE}/rate_limit", headers=_headers(), timeout=15)
        if resp.status_code == 200:
            data = resp.json()
            core = data.get("resources", {}).get("core", {})
            return {"remaining": core.get("remaining", 0), "limit": core.get("limit", 5000), "reset": core.get("reset")}
    except Exception:
        pass
    return {"remaining": 0, "limit": 5000, "reset": None}


def build_content(business, target_url):
    return build_github_content(business, target_url)


def publish(content):
    token = get_secret("GITHUB_TOKEN")
    if not token:
        return {"success": False, "error": "GITHUB_TOKEN not configured"}

    repo = os.environ.get("GITHUB_REPOSITORY", "")
    if not repo:
        return {"success": False, "error": "GITHUB_REPOSITORY not set"}

    if requests is None:
        return {"success": False, "error": "requests library not available"}

    path = f"content/{content.get('title', 'post').lower().replace(' ', '-')}.md"
    url = f"{API_BASE}/repos/{repo}/contents/{path}"

    body = content.get("body", content.get("body_markdown", ""))
    import base64
    encoded = base64.b64encode(body.encode("utf-8")).decode("utf-8")

    payload = {
        "message": f"Add: {content.get('title', '')}",
        "content": encoded,
    }

    try:
        resp = requests.put(url, headers=_headers(), json=payload, timeout=30)
        if resp.status_code in (200, 201):
            data = resp.json()
            html_url = data.get("content", {}).get("html_url", "")
            return {"success": True, "url": html_url}
        else:
            return {"success": False, "error": f"HTTP {resp.status_code}: {resp.text[:200]}"}
    except Exception as e:
        return {"success": False, "error": str(e)}


def get_published_url(result):
    return result.get("url", "")
