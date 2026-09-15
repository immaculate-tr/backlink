import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from scripts.queue import (
    create_job,
    add_to_queue,
    get_pending_jobs,
    get_processing_jobs,
    get_manual_jobs,
    update_job_status,
    increment_retry,
    get_retry_jobs,
    move_to_failed,
    clean_old_jobs,
)


def test_create_job():
    content = {"hash": "abc123", "anchor": "Test", "title": "Test Title"}
    job = create_job("github", "GitHub", "https://example.com/", content, match_score=85)
    assert job["platform"] == "github"
    assert job["platform_name"] == "GitHub"
    assert job["target_url"] == "https://example.com/"
    assert job["status"] == "DISCOVERED"
    assert job["priority"] == "normal"
    assert job["match_score"] == 85
    assert job["retry_count"] == 0
    assert "id" in job and len(job["id"]) > 0
    assert "created_at" in job


def test_add_to_queue():
    queue = []
    job = create_job("devto", "Dev.to", "https://example.com/", {"hash": "x"})
    queue = add_to_queue(queue, job)
    assert len(queue) == 1
    assert queue[0] == job


def test_get_pending_jobs():
    queue = [
        {"id": "1", "status": "DISCOVERED"},
        {"id": "2", "status": "QUEUED"},
        {"id": "3", "status": "PUBLISHED"},
        {"id": "4", "status": "RETRY"},
        {"id": "5", "status": "MANUAL"},
    ]
    pending = get_pending_jobs(queue)
    assert len(pending) == 3
    assert all(j["status"] in ("DISCOVERED", "QUEUED", "RETRY") for j in pending)


def test_get_processing_jobs():
    queue = [
        {"id": "1", "status": "PROCESSING"},
        {"id": "2", "status": "QUEUED"},
    ]
    processing = get_processing_jobs(queue)
    assert len(processing) == 1
    assert processing[0]["id"] == "1"


def test_get_manual_jobs():
    queue = [
        {"id": "1", "status": "MANUAL"},
        {"id": "2", "status": "QUEUED"},
    ]
    manual = get_manual_jobs(queue)
    assert len(manual) == 1


def test_update_job_status():
    queue = [{"id": "abc", "status": "QUEUED", "error": "", "updated_at": ""}]
    result = update_job_status(queue, "abc", "PROCESSING")
    assert result is True
    assert queue[0]["status"] == "PROCESSING"
    assert queue[0]["updated_at"] != ""


def test_update_job_status_not_found():
    queue = [{"id": "abc", "status": "QUEUED"}]
    result = update_job_status(queue, "xyz", "PROCESSING")
    assert result is False


def test_increment_retry():
    job = {"retry_count": 0, "updated_at": ""}
    count = increment_retry(job)
    assert count == 1
    assert job["retry_count"] == 1


def test_get_retry_jobs():
    queue = [
        {"id": "1", "status": "RETRY", "retry_count": 1},
        {"id": "2", "status": "RETRY", "retry_count": 5},
        {"id": "3", "status": "QUEUED", "retry_count": 0},
    ]
    retry = get_retry_jobs(queue)
    assert len(retry) == 1
    assert retry[0]["id"] == "1"


def test_move_to_failed():
    queue = [{"id": "job1", "status": "RETRY", "error": "timeout", "platform": "github", "platform_name": "GitHub", "target_url": "https://example.com/", "created_at": "2026-01-01T00:00:00Z", "retry_count": 4}]
    failed = []
    failed = move_to_failed(queue, failed, queue[0])
    assert len(failed) == 1
    assert failed[0]["status"] == "FAILED"
    assert queue[0]["status"] == "FAILED"


def test_clean_old_jobs():
    queue = [{"id": str(i), "status": "PUBLISHED"} for i in range(100)]
    cleaned = clean_old_jobs(queue, max_size=50)
    assert len(cleaned) == 50
