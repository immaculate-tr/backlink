import os
import sys
import json
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from scripts.config import (
    is_dry_run,
    get_min_quality_score,
    get_quality_tier,
    DEFAULT_MIN_QUALITY_SCORE,
    QUALITY_TIERS,
    QUEUE_STATUSES,
    PLATFORM_LAYERS,
    RETRY_DELAYS,
    MAX_RETRIES,
    load_json,
    save_json,
)
from scripts.core import normalize_url


def test_dry_run_default_true():
    os.environ.pop("DRY_RUN", None)
    assert is_dry_run() is True, "Dry run should default to True"


def test_dry_run_false():
    os.environ["DRY_RUN"] = "false"
    assert is_dry_run() is False


def test_dry_run_true():
    os.environ["DRY_RUN"] = "true"
    assert is_dry_run() is True


def test_min_quality_score_default():
    os.environ.pop("MIN_QUALITY_SCORE", None)
    assert get_min_quality_score() == DEFAULT_MIN_QUALITY_SCORE


def test_min_quality_score_custom():
    os.environ["MIN_QUALITY_SCORE"] = "85"
    assert get_min_quality_score() == 85


def test_quality_tier_premium():
    assert get_quality_tier(95) == "Premium"
    assert get_quality_tier(90) == "Premium"


def test_quality_tier_high():
    assert get_quality_tier(80) == "High"
    assert get_quality_tier(75) == "High"


def test_quality_tier_medium():
    assert get_quality_tier(70) == "Medium"
    assert get_quality_tier(60) == "Medium"


def test_quality_tier_low():
    assert get_quality_tier(50) == "Low"
    assert get_quality_tier(40) == "Low"


def test_quality_tier_skip():
    assert get_quality_tier(30) == "Skip"
    assert get_quality_tier(0) == "Skip"


def test_queue_statuses_complete():
    expected = ["DISCOVERED", "READY", "QUEUED", "PROCESSING", "PUBLISHED",
                "VERIFYING", "VERIFIED", "FAILED", "RETRY", "MANUAL",
                "SKIPPED", "REMOVED"]
    assert all(s in QUEUE_STATUSES for s in expected)


def test_platform_layers_complete():
    expected = ["API_AVAILABLE", "MANUAL_SUBMISSION", "MANUAL_REVIEW",
                "UNSUPPORTED", "DISABLED"]
    assert all(l in PLATFORM_LAYERS for l in expected)


def test_retry_delays():
    assert RETRY_DELAYS == [300, 900, 3600, 21600]
    assert MAX_RETRIES == 4


def test_load_json_business():
    data = load_json("business")
    assert isinstance(data, dict)


def test_load_json_platforms():
    data = load_json("platforms")
    assert isinstance(data, list)


def test_save_and_load_json():
    test_data = [{"test": "value"}]
    save_json("queue", test_data)
    loaded = load_json("queue")
    assert loaded == test_data
    save_json("queue", [])
