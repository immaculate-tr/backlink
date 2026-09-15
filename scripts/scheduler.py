import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from scripts.config import load_json, save_json, get_min_quality_score
from scripts.core import normalize_business, now_iso, log_event
from scripts.matcher import get_matching_platforms
from scripts.content import build_content, is_duplicate
from scripts.queue import create_job, add_to_queue


def run_scheduler():
    business_raw = load_json("business")
    if not business_raw or not business_raw.get("name"):
        print("No business profile found. Add a site first.")
        return

    business = normalize_business(business_raw)
    platforms = load_json("platforms")
    queue_data = load_json("queue")
    backlinks_data = load_json("backlinks")
    logs_data = load_json("logs")
    campaigns = load_json("campaigns")

    min_score = get_min_quality_score()
    for c in campaigns:
        if c.get("status") == "active" and c.get("min_quality_score"):
            min_score = min(min_score, c["min_quality_score"])

    print(f"Business: {business.get('name')}")
    print(f"Min quality score: {min_score}")

    matching = get_matching_platforms(business, platforms, min_score)
    if not matching:
        print("No matching platforms found.")
        return

    print(f"Found {len(matching)} matching platforms.")

    target_urls = business.get("target_urls", [business.get("website", "")])
    jobs_created = 0

    for match in matching:
        platform_id = match["platform_id"]
        platform_name = match["platform_name"]
        platform_obj = next((p for p in platforms if p["id"] == platform_id), None)
        if not platform_obj:
            continue

        for target_url in target_urls:
            content = build_content(platform_id, business, target_url)

            if is_duplicate(content, platform_id, target_url, backlinks_data, queue_data):
                print(f"  SKIP (duplicate): {platform_name} -> {target_url}")
                logs_data = log_event(platform_id, "", "info", f"Duplicate skipped: {target_url}", logs_data)
                continue

            job = create_job(
                platform_id=platform_id,
                platform_name=platform_name,
                target_url=target_url,
                content=content,
                match_score=match["overall"],
            )
            job["status"] = "QUEUED"
            add_to_queue(queue_data, job)
            jobs_created += 1
            print(f"  QUEUED: {platform_name} -> {target_url} (score: {match['overall']})")

    save_json("queue", queue_data)
    save_json("logs", logs_data)

    print(f"\nScheduler complete. {jobs_created} jobs queued.")


if __name__ == "__main__":
    run_scheduler()
