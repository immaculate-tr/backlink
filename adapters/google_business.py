import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

try:
    import requests
except ImportError:
    requests = None

from scripts.config import get_secret
from scripts.content import build_google_business_content

API_BASE = "https://mybusinessbusinessinformation.googleapis.com/v1"


def validate_credentials():
    client_id = get_secret("GOOGLE_CLIENT_ID")
    client_secret = get_secret("GOOGLE_CLIENT_SECRET")
    refresh_token = get_secret("GOOGLE_REFRESH_TOKEN")
    if not all([client_id, client_secret, refresh_token]):
        return False, "Google OAuth credentials not fully configured"
    return True, "OK"


def _get_access_token():
    client_id = get_secret("GOOGLE_CLIENT_ID")
    client_secret = get_secret("GOOGLE_CLIENT_SECRET")
    refresh_token = get_secret("GOOGLE_REFRESH_TOKEN")

    if not all([client_id, client_secret, refresh_token]):
        return None

    if requests is None:
        return None

    try:
        resp = requests.post("https://oauth2.googleapis.com/token", data={
            "client_id": client_id,
            "client_secret": client_secret,
            "refresh_token": refresh_token,
            "grant_type": "refresh_token",
        }, timeout=15)
        if resp.status_code == 200:
            return resp.json().get("access_token")
    except Exception:
        pass
    return None


def health_check():
    if requests is None:
        return False, "requests library not available"
    token = _get_access_token()
    if not token:
        return False, "Could not obtain access token"
    try:
        resp = requests.get(f"{API_BASE}/accounts", headers={"Authorization": f"Bearer {token}"}, timeout=15)
        return resp.status_code in (200, 403), f"HTTP {resp.status_code}"
    except Exception as e:
        return False, str(e)


def _headers():
    token = _get_access_token()
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }


def rate_limit():
    return {"remaining": 200, "limit": 200, "reset": None}


def build_content(business, target_url):
    return build_google_business_content(business, target_url)


def publish(content):
    token = _get_access_token()
    if not token:
        return {"success": False, "error": "Could not obtain Google OAuth access token"}

    if requests is None:
        return {"success": False, "error": "requests library not available"}

    business_data = {
        "title": content.get("title", ""),
        "websiteUri": content.get("target_url", ""),
        "description": content.get("body", ""),
    }

    try:
        resp = requests.post(f"{API_BASE}/accounts/*/locations", headers=_headers(), json=business_data, timeout=30)
        if resp.status_code in (200, 201):
            data = resp.json()
            name = data.get("name", "")
            url = f"https://business.google.com/{name}" if name else ""
            return {"success": True, "url": url}
        else:
            return {"success": False, "error": f"HTTP {resp.status_code}: {resp.text[:200]}"}
    except Exception as e:
        return {"success": False, "error": str(e)}


def get_published_url(result):
    return result.get("url", "")
