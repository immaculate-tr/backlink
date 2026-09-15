import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

try:
    import requests
except ImportError:
    requests = None

from scripts.config import get_secret
from scripts.content import build_flickr_content

API_BASE = "https://api.flickr.com/services/rest"


def validate_credentials():
    key = get_secret("FLICKR_API_KEY")
    if not key:
        return False, "FLICKR_API_KEY not configured"
    return True, "OK"


def health_check():
    if requests is None:
        return False, "requests library not available"
    key = get_secret("FLICKR_API_KEY")
    if not key:
        return False, "FLICKR_API_KEY not configured"
    try:
        params = {"method": "flickr.test.login", "api_key": key, "format": "json", "nojsoncallback": 1}
        resp = requests.get(API_BASE, params=params, timeout=15)
        return resp.status_code == 200, f"HTTP {resp.status_code}"
    except Exception as e:
        return False, str(e)


def rate_limit():
    return {"remaining": 3600, "limit": 3600, "reset": None}


def build_content(business, target_url):
    return build_flickr_content(business, target_url)


def publish(content):
    key = get_secret("FLICKR_API_KEY")
    if not key:
        return {"success": False, "error": "FLICKR_API_KEY not configured"}

    if requests is None:
        return {"success": False, "error": "requests library not available"}

    return {"success": False, "error": "Flickr API requires OAuth-signed upload. Configure OAuth flow for photo uploads."}


def get_published_url(result):
    return result.get("url", "")
