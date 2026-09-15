import importlib
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from scripts.config import is_dry_run, is_automation_on, is_approval_required, load_json, save_json
from scripts.core import now_iso, log_event
from scripts.queue import get_pending_jobs, update_job_status, increment_retry


def get_adapter(platform_id: str):
    try:
        module = importlib.import_module(f"adapters.{platform_id}")
        return module
    except ModuleNotFoundError:
        return None


def publish_job(job: dict, queue_data: list, backlinks_data: list, logs_data: list) -> dict:
    platform_id = job.get("platform", "")
    job_id = job.get("id", "")

    if not is_automation_on():
        update_job_status(queue_data, job_id, "MANUAL", reason="Automation is OFF (kill switch)")
        logs_data = log_event(platform_id, job_id, "skipped", "Automation disabled by kill switch", logs_data)
        return {"status": "skipped", "reason": "automation_off"}

    if is_approval_required() and job.get("status") != "QUEUED":
        update_job_status(queue_data, job_id, "MANUAL", reason="Approval required mode is ON")
        logs_data = log_event(platform_id, job_id, "skipped", "Approval required", logs_data)
        return {"status": "manual", "reason": "approval_required"}

    adapter = get_adapter(platform_id)
    if adapter is None:
        update_job_status(queue_data, job_id, "MANUAL", reason="No adapter available for platform")
        logs_data = log_event(platform_id, job_id, "error", "Adapter not found", logs_data)
        return {"status": "manual", "reason": "no_adapter"}

    update_job_status(queue_data, job_id, "PROCESSING")
    logs_data = log_event(platform_id, job_id, "info", "Processing started", logs_data)

    try:
        valid, msg = adapter.validate_credentials()
        if not valid:
            update_job_status(queue_data, job_id, "MANUAL", reason=f"Credentials invalid: {msg}")
            logs_data = log_event(platform_id, job_id, "error", f"Credential validation failed: {msg}", logs_data)
            return {"status": "manual", "reason": "invalid_credentials"}

        if is_dry_run():
            update_job_status(queue_data, job_id, "PUBLISHED", url=f"[DRY RUN] {platform_id}")
            logs_data = log_event(platform_id, job_id, "success", "Dry run: simulated publish", logs_data)
            return {"status": "published", "dry_run": True, "url": ""}

        business = load_json("business")
        content = adapter.build_content(business, job.get("target_url", ""))
        result = adapter.publish(content)

        if result.get("success"):
            published_url = result.get("url", "")
            update_job_status(queue_data, job_id, "PUBLISHED", url=published_url)
            backlinks_data.append({
                "id": job_id,
                "platform": platform_id,
                "source_url": published_url,
                "target_url": job.get("target_url", ""),
                "anchor": job.get("anchor", ""),
                "status": "published",
                "http_status": 0,
                "nofollow": False,
                "ugc": False,
                "sponsored": False,
                "content_hash": job.get("content_hash", ""),
                "created_at": now_iso(),
                "last_checked": "",
            })
            save_json("backlinks", backlinks_data)
            logs_data = log_event(platform_id, job_id, "success", f"Published: {published_url}", logs_data)
            return {"status": "published", "url": published_url}
        else:
            error = result.get("error", "Unknown error")
            if "captcha" in error.lower():
                update_job_status(queue_data, job_id, "MANUAL", reason="CAPTCHA required", instructions="Complete CAPTCHA manually on the platform", url=job.get("target_url", ""))
                logs_data = log_event(platform_id, job_id, "error", "CAPTCHA detected — moved to manual", logs_data)
                return {"status": "manual", "reason": "captcha"}
            if "2fa" in error.lower() or "two-factor" in error.lower():
                update_job_status(queue_data, job_id, "MANUAL", reason="2FA required", instructions="Complete 2FA manually on the platform", url=job.get("target_url", ""))
                logs_data = log_event(platform_id, job_id, "error", "2FA detected — moved to manual", logs_data)
                return {"status": "manual", "reason": "2fa"}
            if "429" in error or "rate" in error.lower():
                retry_count = increment_retry(job)
                if retry_count >= 4:
                    update_job_status(queue_data, job_id, "FAILED", error=error)
                    logs_data = log_event(platform_id, job_id, "error", f"Max retries reached: {error}", logs_data)
                    return {"status": "failed", "reason": "max_retries"}
                update_job_status(queue_data, job_id, "RETRY", error=error)
                logs_data = log_event(platform_id, job_id, "warning", f"Rate limited — retry {retry_count}/4", logs_data)
                return {"status": "retry", "reason": "rate_limit", "retry_count": retry_count}
            update_job_status(queue_data, job_id, "RETRY", error=error)
            logs_data = log_event(platform_id, job_id, "error", f"Publish failed: {error}", logs_data)
            return {"status": "retry", "reason": "publish_error", "error": error}

    except Exception as e:
        error = str(e)
        update_job_status(queue_data, job_id, "RETRY", error=error)
        logs_data = log_event(platform_id, job_id, "error", f"Exception: {error}", logs_data)
        return {"status": "retry", "reason": "exception", "error": error}


def run_publisher():
    queue_data = load_json("queue")
    backlinks_data = load_json("backlinks")
    logs_data = load_json("logs")

    pending = get_pending_jobs(queue_data)
    if not pending:
        print("No pending jobs in queue.")
        return

    print(f"Found {len(pending)} pending jobs.")

    for job in pending:
        result = publish_job(job, queue_data, backlinks_data, logs_data)
        print(f"  Job {job.get('id', '')[:8]} -> {result.get('status', 'unknown')}")

    save_json("queue", queue_data)
    save_json("logs", logs_data)
    print("Publisher run complete.")


if __name__ == "__main__":
    run_publisher()
