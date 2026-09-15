import os
import json
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_ROOT / "data"
ADAPTERS_DIR = PROJECT_ROOT / "adapters"

DATA_FILES = {
    "business": DATA_DIR / "business.json",
    "platforms": DATA_DIR / "platforms.json",
    "campaigns": DATA_DIR / "campaigns.json",
    "backlinks": DATA_DIR / "backlinks.json",
    "queue": DATA_DIR / "queue.json",
    "failed": DATA_DIR / "failed.json",
    "logs": DATA_DIR / "logs.json",
    "statistics": DATA_DIR / "statistics.json",
}

QUEUE_STATUSES = [
    "DISCOVERED", "READY", "QUEUED", "PROCESSING", "PUBLISHED",
    "VERIFYING", "VERIFIED", "FAILED", "RETRY", "MANUAL",
    "SKIPPED", "REMOVED",
]

PLATFORM_LAYERS = [
    "API_AVAILABLE", "MANUAL_SUBMISSION", "MANUAL_REVIEW",
    "UNSUPPORTED", "DISABLED",
]

RETRY_DELAYS = [300, 900, 3600, 21600]
MAX_RETRIES = 4

DEFAULT_MIN_QUALITY_SCORE = 70

QUALITY_TIERS = {
    (90, 100): "Premium",
    (75, 89): "High",
    (60, 74): "Medium",
    (40, 59): "Low",
    (0, 39): "Skip",
}

ANCHOR_TYPES = ["brand", "url", "generic", "partial_match", "natural_phrase"]


def is_dry_run() -> bool:
    val = os.environ.get("DRY_RUN", "true").lower().strip()
    return val in ("true", "1", "yes")


def is_automation_on() -> bool:
    val = os.environ.get("AUTOMATION", "on").lower().strip()
    return val == "on"


def is_approval_required() -> bool:
    val = os.environ.get("APPROVAL_REQUIRED", "off").lower().strip()
    return val == "on"


def get_min_quality_score() -> int:
    try:
        return int(os.environ.get("MIN_QUALITY_SCORE", str(DEFAULT_MIN_QUALITY_SCORE)))
    except ValueError:
        return DEFAULT_MIN_QUALITY_SCORE


def get_quality_tier(score: int) -> str:
    for (low, high), tier in QUALITY_TIERS.items():
        if low <= score <= high:
            return tier
    return "Skip"


def load_json(filename: str):
    path = DATA_FILES.get(filename)
    if path is None:
        path = DATA_DIR / f"{filename}.json"
    if not path.exists():
        return [] if filename not in ("business", "statistics") else {}
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_json(filename: str, data):
    path = DATA_FILES.get(filename)
    if path is None:
        path = DATA_DIR / f"{filename}.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def get_secret(name: str) -> str:
    return os.environ.get(name, "")


def has_secret(name: str) -> bool:
    val = os.environ.get(name, "")
    return bool(val and val.strip())
