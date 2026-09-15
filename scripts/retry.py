import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from scripts.config import load_json, save_json, RETRY_DELAYS, MAX_RETRIES
from scripts.core import now_iso, log_event
from scripts.queue import get_retry_jobs, update_job_status, increment_retry, move_to_failed


def run_retry():
    queue_data = load_json("queue")
    failed_data = load_json("failed")
    logs_data = load_json("logs")

    retry_jobs = get_retry_jobs(queue_data)
    if not retry_jobs:
        print("No jobs to retry.")
        return

    print(f"Processing {len(retry_jobs)} retry jobs...")

    for job in retry_jobs:
        retry_count = job.get("retry_count", 0)
        if retry_count >= MAX_RETRIES:
            move_to_failed(queue_data, failed_data, job)
            logs_data = log_event(job.get("platform", ""), job.get("id", ""), "error", "Max retries reached — moved to failed", logs_data)
            print(f"  FAILED (max retries): {job.get('id', '')[:8]}")
            continue

        delay = RETRY_DELAYS[min(retry_count, len(RETRY_DELAYS) - 1)]
        update_job_status(queue_data, job.get("id", ""), "QUEUED")
        logs_data = log_event(job.get("platform", ""), job.get("id", ""), "info", f"Retry {retry_count + 1}/{MAX_RETRIES} queued (delay: {delay}s)", logs_data)
        print(f"  RETRY {retry_count + 1}/{MAX_RETRIES}: {job.get('id', '')[:8]} (delay: {delay}s)")

    save_json("queue", queue_data)
    save_json("failed", failed_data)
    save_json("logs", logs_data)
    print("Retry processing complete.")


if __name__ == "__main__":
    run_retry()
