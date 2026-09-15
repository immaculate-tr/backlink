import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from scripts.config import load_json, save_json
from scripts.core import now_iso


def generate_report() -> dict:
    queue = load_json("queue")
    backlinks = load_json("backlinks")
    failed = load_json("failed")
    platforms = load_json("platforms")
    logs = load_json("logs")

    total_jobs = len(queue)
    published = len([q for q in queue if q.get("status") == "PUBLISHED"])
    verified = len([b for b in backlinks if b.get("status") == "verified"])
    pending = len([q for q in queue if q.get("status") in ("DISCOVERED", "READY", "QUEUED", "PROCESSING")])
    failed_count = len(failed)
    manual = len([q for q in queue if q.get("status") == "MANUAL"])
    removed = len([b for b in backlinks if b.get("status") == "removed"])
    retry = len([q for q in queue if q.get("status") == "RETRY"])

    active_platforms = len([p for p in platforms if p.get("active")])
    api_platforms = len([p for p in platforms if p.get("api")])
    manual_platforms = len([p for p in platforms if not p.get("api") and p.get("active")])

    total_attempts = published + failed_count
    success_rate = round((published / total_attempts * 100), 1) if total_attempts > 0 else 0

    total_verified = len([b for b in backlinks if b.get("status") == "verified"])
    total_published = len([b for b in backlinks if b.get("status") in ("verified", "published", "removed", "failed")])
    verification_rate = round((total_verified / total_published * 100), 1) if total_published > 0 else 0

    backlink_health = {
        "verified": total_verified,
        "pending": len([b for b in backlinks if b.get("status") == "published"]),
        "removed": removed,
        "failed": len([b for b in backlinks if b.get("status") == "failed"]),
        "noindex": 0,
        "nofollow": len([b for b in backlinks if b.get("nofollow")]),
        "redirect": 0,
    }

    stats = {
        "total_platforms": len(platforms),
        "active_platforms": active_platforms,
        "api_platforms": api_platforms,
        "manual_platforms": manual_platforms,
        "queued": pending,
        "published": published,
        "verified": verified,
        "failed": failed_count,
        "retry": retry,
        "removed": removed,
        "manual": manual,
        "success_rate": success_rate,
        "verification_rate": verification_rate,
        "last_run": now_iso(),
        "backlink_health": backlink_health,
    }

    save_json("statistics", stats)

    report = {
        "generated_at": now_iso(),
        "total_jobs": total_jobs,
        "published": published,
        "verified": verified,
        "pending": pending,
        "failed": failed_count,
        "manual": manual,
        "removed": removed,
        "retry": retry,
        "success_rate": success_rate,
        "verification_rate": verification_rate,
        "active_platforms": active_platforms,
        "total_platforms": len(platforms),
    }

    return report


def run_report():
    report = generate_report()
    print("=" * 50)
    print("  WEEKLY REPORT")
    print("=" * 50)
    print(f"  Total jobs:    {report['total_jobs']}")
    print(f"  Published:     {report['published']}")
    print(f"  Verified:      {report['verified']}")
    print(f"  Pending:       {report['pending']}")
    print(f"  Failed:        {report['failed']}")
    print(f"  Manual:        {report['manual']}")
    print(f"  Removed:       {report['removed']}")
    print(f"  Success Rate:  {report['success_rate']}%")
    print(f"  Verification:  {report['verification_rate']}%")
    print(f"  Platforms:     {report['active_platforms']}/{report['total_platforms']} active")
    print("=" * 50)


if __name__ == "__main__":
    run_report()
