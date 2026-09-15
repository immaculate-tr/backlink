import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from scripts.config import load_json, save_json, get_min_quality_score
from scripts.core import normalize_business, now_iso, log_event
from scripts.matcher import calculate_match, get_matching_platforms
from scripts.content import build_content, is_duplicate
from scripts.queue import create_job, add_to_queue


def discover_platforms(business: dict, platforms: list, min_score: int = None) -> list:
    if min_score is None:
        min_score = get_min_quality_score()
    return get_matching_platforms(business, platforms, min_score)


def run_discovery():
    business_raw = load_json("business")
    if not business_raw or not business_raw.get("name"):
        print("No business profile found.")
        return

    business = normalize_business(business_raw)
    platforms = load_json("platforms")

    matches = discover_platforms(business, platforms)

    print(f"Discovery for: {business.get('name')}")
    print(f"Found {len(matches)} matching platforms:\n")

    for m in matches:
        print(f"  {m['platform_name']:20s} | Overall: {m['overall']:3d}/100 | Tier: {m['tier']}")

    return matches


if __name__ == "__main__":
    run_discovery()
