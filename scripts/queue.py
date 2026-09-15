from scripts.core import generate_id, now_iso, normalize_url


def create_job(platform_id: str, platform_name: str, target_url: str, content: dict, match_score: int = 0, priority: str = "normal") -> dict:
    return {
        "id": generate_id(),
        "platform": platform_id,
        "platform_name": platform_name,
        "target_url": normalize_url(target_url),
        "content_hash": content.get("hash", ""),
        "anchor": content.get("anchor", ""),
        "title": content.get("title", ""),
        "status": "DISCOVERED",
        "priority": priority,
        "match_score": match_score,
        "retry_count": 0,
        "created_at": now_iso(),
        "updated_at": now_iso(),
        "error": "",
        "reason": "",
        "instructions": "",
        "url": "",
    }


def add_to_queue(queue_data: list, job: dict) -> list:
    queue_data.append(job)
    return queue_data


def get_pending_jobs(queue_data: list) -> list:
    return [j for j in queue_data if j.get("status") in ("DISCOVERED", "READY", "QUEUED", "RETRY")]


def get_processing_jobs(queue_data: list) -> list:
    return [j for j in queue_data if j.get("status") == "PROCESSING"]


def get_manual_jobs(queue_data: list) -> list:
    return [j for j in queue_data if j.get("status") == "MANUAL"]


def update_job_status(queue_data: list, job_id: str, status: str, error: str = "", reason: str = "", instructions: str = "", url: str = "") -> bool:
    for job in queue_data:
        if job.get("id") == job_id:
            job["status"] = status
            job["updated_at"] = now_iso()
            if error:
                job["error"] = error
            if reason:
                job["reason"] = reason
            if instructions:
                job["instructions"] = instructions
            if url:
                job["url"] = url
            return True
    return False


def increment_retry(job: dict) -> int:
    job["retry_count"] = job.get("retry_count", 0) + 1
    job["updated_at"] = now_iso()
    return job["retry_count"]


def get_retry_jobs(queue_data: list) -> list:
    return [j for j in queue_data if j.get("status") == "RETRY" and j.get("retry_count", 0) < 4]


def move_to_failed(queue_data: list, failed_data: list, job: dict) -> list:
    failed_entry = {
        "id": job.get("id"),
        "platform": job.get("platform"),
        "platform_name": job.get("platform_name"),
        "target_url": job.get("target_url"),
        "error": job.get("error", ""),
        "retry_count": job.get("retry_count", 0),
        "status": "FAILED",
        "created_at": job.get("created_at", ""),
        "updated_at": now_iso(),
    }
    failed_data.append(failed_entry)
    update_job_status(queue_data, job.get("id", ""), "FAILED", error=job.get("error", ""))
    return failed_data


def clean_old_jobs(queue_data: list, max_size: int = 10000) -> list:
    if len(queue_data) <= max_size:
        return queue_data
    return queue_data[-max_size:]
