import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from scripts.content import build_content, is_duplicate, get_anchor_variations
from scripts.core import normalize_business


def test_build_content_github():
    business = {"name": "Test Co", "website": "https://example.com", "description": "A test company"}
    content = build_content("github", business, "https://example.com/")
    assert content["content_type"] == "technical_description"
    assert "Test Co" in content["title"]
    assert "hash" in content
    assert content["target_url"] == "https://example.com/"


def test_build_content_devto():
    business = {"name": "Test Co", "website": "https://example.com", "description": "A test"}
    content = build_content("devto", business, "https://example.com/")
    assert content["content_type"] == "technical_article"
    assert "body_markdown" in content


def test_build_content_unknown_platform():
    business = {"name": "Test Co", "website": "https://example.com", "description": "A test"}
    content = build_content("unknown_platform", business, "https://example.com/")
    assert content["content_type"] == "generic"
    assert content["title"] == "Test Co"


def test_is_duplicate_backlink_exists():
    content = {"hash": "abc123"}
    backlinks = [{"platform": "github", "target_url": "https://example.com/", "content_hash": "abc123"}]
    queue = []
    assert is_duplicate(content, "github", "https://example.com/", backlinks, queue) is True


def test_is_duplicate_queue_exists():
    content = {"hash": "xyz789"}
    backlinks = []
    queue = [{"platform": "devto", "target_url": "https://example.com/", "status": "QUEUED"}]
    assert is_duplicate(content, "devto", "https://example.com/", backlinks, queue) is True


def test_is_duplicate_not_found():
    content = {"hash": "new123"}
    backlinks = [{"platform": "github", "target_url": "https://other.com/", "content_hash": "other"}]
    queue = [{"platform": "devto", "target_url": "https://other.com/", "status": "QUEUED"}]
    assert is_duplicate(content, "github", "https://example.com/", backlinks, queue) is False


def test_is_duplicate_different_platform():
    content = {"hash": "abc123"}
    backlinks = [{"platform": "github", "target_url": "https://example.com/", "content_hash": "abc123"}]
    queue = []
    assert is_duplicate(content, "devto", "https://example.com/", backlinks, queue) is False


def test_anchor_variations():
    business = {"name": "Test Co", "website": "https://example.com"}
    anchors = get_anchor_variations(business)
    assert len(anchors) == 5
    types = [a["type"] for a in anchors]
    assert "brand" in types
    assert "url" in types
    assert "generic" in types
    assert "partial_match" in types
    assert "natural_phrase" in types


def test_content_hash_different():
    business = {"name": "Test Co", "website": "https://example.com", "description": "A test company"}
    c1 = build_content("github", business, "https://example.com/")
    c2 = build_content("devto", business, "https://example.com/")
    assert c1["hash"] != c2["hash"]
