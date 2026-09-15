import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

try:
    import requests
except ImportError:
    requests = None

from scripts.config import load_json, save_json
from scripts.core import now_iso, log_event


def verify_backlink(backlink: dict) -> dict:
    source_url = backlink.get("source_url", "")
    target_url = backlink.get("target_url", "")
    anchor = backlink.get("anchor", "")

    result = {
        "published_url": source_url,
        "target_url": target_url,
        "http_status": 0,
        "link_found": False,
        "nofollow": False,
        "ugc": False,
        "sponsored": False,
        "redirect": False,
        "error": "",
    }

    if not source_url or not target_url:
        result["error"] = "Missing source or target URL"
        return result

    if requests is None:
        result["error"] = "requests library not available"
        return result

    try:
        resp = requests.get(source_url, timeout=30, allow_redirects=True, headers={
            "User-Agent": "Mozilla/5.0 (compatible; BacklinkVerifier/1.0)"
        })
        result["http_status"] = resp.status_code

        if resp.status_code != 200:
            result["error"] = f"HTTP {resp.status_code}"
            return result

        if resp.url != source_url:
            result["redirect"] = True

        body = resp.text.lower()
        if target_url.lower() in body:
            result["link_found"] = True

        if anchor and anchor.lower() in body:
            result["link_found"] = True

        if 'rel="nofollow"' in body or "rel='nofollow'" in body:
            result["nofollow"] = True
        if 'rel="ugc"' in body or "rel='ugc'" in body:
            result["ugc"] = True
        if 'rel="sponsored"' in body or "rel='sponsored'" in body:
            result["sponsored"] = True

    except requests.Timeout:
        result["error"] = "Request timeout"
    except requests.ConnectionError:
        result["error"] = "Connection error"
    except Exception as e:
        result["error"] = str(e)

    return result


def run_verifier():
    backlinks = load_json("backlinks")
    logs = load_json("logs")

    unverified = [b for b in backlinks if b.get("status") in ("published", "pending")]
    if not unverified:
        print("No backlinks to verify.")
        return

    print(f"Verifying {len(unverified)} backlinks...")

    for b in unverified:
        result = verify_backlink(b)
        b["http_status"] = result["http_status"]
        b["last_checked"] = now_iso()

        if result["link_found"] and result["http_status"] == 200:
            b["status"] = "verified"
            b["nofollow"] = result["nofollow"]
            b["ugc"] = result["ugc"]
            b["sponsored"] = result["sponsored"]
            logs = log_event(b.get("platform", ""), b.get("id", ""), "success", f"Verified: {b.get('source_url', '')}", logs)
            print(f"  VERIFIED: {b.get('source_url', '')[:60]}")
        elif result["error"]:
            b["status"] = "failed"
            logs = log_event(b.get("platform", ""), b.get("id", ""), "error", f"Verify failed: {result['error']}", logs)
            print(f"  FAILED: {b.get('source_url', '')[:60]} — {result['error']}")
        else:
            b["status"] = "removed"
            logs = log_event(b.get("platform", ""), b.get("id", ""), "warning", f"Link not found: {b.get('source_url', '')}", logs)
            print(f"  REMOVED: {b.get('source_url', '')[:60]}")

    save_json("backlinks", backlinks)
    save_json("logs", logs)
    print("Verification complete.")


if __name__ == "__main__":
    run_verifier()
