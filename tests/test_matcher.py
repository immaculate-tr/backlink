import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from scripts.matcher import calculate_match, get_matching_platforms
from scripts.core import normalize_business


def test_calculate_match_same_category():
    business = {"category": "technology", "country": "TR", "city": "Hatay", "language": "tr"}
    platform = {"id": "github", "name": "GitHub", "category": "technology", "country": "global", "language": "en", "quality_score": 95, "active": True, "api": True}
    match = calculate_match(business, platform)
    assert match["category_score"] == 95
    assert match["overall"] > 0
    assert match["platform_id"] == "github"


def test_calculate_match_different_category():
    business = {"category": "food", "country": "TR", "city": "Hatay", "language": "tr"}
    platform = {"id": "github", "name": "GitHub", "category": "technology", "country": "global", "language": "en", "quality_score": 95, "active": True, "api": True}
    match = calculate_match(business, platform)
    assert match["category_score"] < 50


def test_calculate_match_country_match():
    business = {"category": "local", "country": "TR", "city": "Hatay", "language": "tr"}
    platform = {"id": "dir", "name": "Local Dir", "category": "local", "country": "TR", "language": "multi", "quality_score": 90, "active": True, "api": True}
    match = calculate_match(business, platform)
    assert match["country_score"] == 95
    assert match["city_score"] == 90


def test_calculate_match_language_match():
    business = {"category": "technology", "country": "TR", "city": "Hatay", "language": "en"}
    platform = {"id": "devto", "name": "Dev.to", "category": "technology", "country": "global", "language": "en", "quality_score": 90, "active": True, "api": True}
    match = calculate_match(business, platform)
    assert match["language_score"] == 90


def test_get_matching_platforms_filters_by_score():
    business = normalize_business({"name": "Test", "category": "technology", "country": "TR", "city": "Hatay", "language": "tr", "website": "https://example.com"})
    platforms = [
        {"id": "github", "name": "GitHub", "category": "technology", "country": "global", "language": "en", "quality_score": 95, "active": True, "api": True},
        {"id": "low", "name": "Low", "category": "food", "country": "global", "language": "multi", "quality_score": 30, "active": True, "api": True},
    ]
    matches = get_matching_platforms(business, platforms, min_score=70)
    assert len(matches) >= 1
    assert matches[0]["platform_id"] == "github"


def test_get_matching_platforms_excludes_inactive():
    business = normalize_business({"name": "Test", "category": "technology", "website": "https://example.com"})
    platforms = [
        {"id": "inactive", "name": "Inactive", "category": "technology", "country": "global", "language": "en", "quality_score": 95, "active": False, "api": True},
    ]
    matches = get_matching_platforms(business, platforms, min_score=0)
    assert len(matches) == 0


def test_get_matching_platforms_excludes_non_api():
    business = normalize_business({"name": "Test", "category": "technology", "website": "https://example.com"})
    platforms = [
        {"id": "manual", "name": "Manual", "category": "technology", "country": "global", "language": "en", "quality_score": 95, "active": True, "api": False},
    ]
    matches = get_matching_platforms(business, platforms, min_score=0)
    assert len(matches) == 0


def test_get_matching_platforms_sorted_by_score():
    business = normalize_business({"name": "Test", "category": "technology", "country": "TR", "city": "Hatay", "language": "tr", "website": "https://example.com"})
    platforms = [
        {"id": "b", "name": "B", "category": "technology", "country": "global", "language": "en", "quality_score": 80, "active": True, "api": True},
        {"id": "a", "name": "A", "category": "technology", "country": "TR", "language": "tr", "quality_score": 95, "active": True, "api": True},
    ]
    matches = get_matching_platforms(business, platforms, min_score=70)
    assert matches[0]["overall"] >= matches[1]["overall"]


def test_calculate_match_tier():
    business = {"category": "technology", "country": "TR", "city": "Hatay", "language": "tr"}
    platform = {"id": "github", "name": "GitHub", "category": "technology", "country": "global", "language": "en", "quality_score": 95, "active": True, "api": True}
    match = calculate_match(business, platform)
    assert match["tier"] in ("Premium", "High", "Medium", "Low", "Skip")
