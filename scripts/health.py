import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

try:
    import requests
except ImportError:
    requests = None

from scripts.config import load_json, save_json
from scripts.core import now_iso, log_event


def check_platform(platform: dict) -> dict:
    endpoint = platform.get("api_endpoint", "")
    result = {
        "id": platform.get("id"),
        "name": platform.get("name"),
        "endpoint": endpoint,
        "reachable": False,
        "http_status": 0,
        "error": "",
    }

    if not endpoint:
        result["error"] = "No API endpoint configured"
        return result

    if requests is None:
        result["error"] = "requests library not available"
        return result

    try:
        resp = requests.get(endpoint, timeout=15, headers={
            "User-Agent": "Mozilla/5.0 (compatible; HealthCheck/1.0)"
        })
        result["http_status"] = resp.status_code
        result["reachable"] = resp.status_code < 500
        if resp.status_code >= 500:
            result["error"] = f"HTTP {resp.status_code}"
    except requests.Timeout:
        result["error"] = "Timeout"
    except requests.ConnectionError:
        result["error"] = "Connection failed"
    except Exception as e:
        result["error"] = str(e)

    return result


def run_health_check():
    platforms = load_json("platforms")
    logs = load_json("logs")

    print(f"Checking {len(platforms)} platforms...")

    for platform in platforms:
        if not platform.get("active"):
            continue

        result = check_platform(platform)
        platform["last_checked"] = now_iso()

        if result["reachable"]:
            print(f"  OK: {platform.get('name')} (HTTP {result['http_status']})")
            logs = log_event(platform.get("id", ""), "", "success", f"Health check passed (HTTP {result['http_status']})", logs)
        else:
            print(f"  FAIL: {platform.get('name')} — {result['error']}")
            platform["active"] = False
            logs = log_event(platform.get("id", ""), "", "error", f"PLATFORM HEALTH ALERT: {result['error']}", logs)

    save_json("platforms", platforms)
    save_json("logs", logs)
    print("Health check complete.")


if __name__ == "__main__":
    run_health_check()
