import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from scripts.verifier import verify_backlink
from scripts.core import is_valid_url, is_https, normalize_url


def test_verify_backlink_missing_url():
    result = verify_backlink({"source_url": "", "target_url": ""})
    assert result["link_found"] is False
    assert "Missing" in result["error"]


def test_verify_backlink_missing_target():
    result = verify_backlink({"source_url": "https://example.com", "target_url": ""})
    assert result["link_found"] is False
    assert "Missing" in result["error"]


def test_is_valid_url_valid():
    assert is_valid_url("https://example.com") is True
    assert is_valid_url("http://example.com/path") is True


def test_is_valid_url_invalid():
    assert is_valid_url("") is False
    assert is_valid_url("not-a-url") is False
    assert is_valid_url("ftp://example.com") is False


def test_is_https():
    assert is_https("https://example.com") is True
    assert is_https("http://example.com") is False
    assert is_https("") is False


def test_normalize_url_adds_https():
    assert normalize_url("example.com").startswith("https://")


def test_normalize_url_strips_trailing_slash():
    url = normalize_url("https://example.com/")
    assert url == "https://example.com/"


def test_normalize_url_preserves_path():
    url = normalize_url("https://example.com/about/")
    assert url == "https://example.com/about"


def test_normalize_url_empty():
    assert normalize_url("") == ""


def test_verify_backlink_result_shape():
    result = verify_backlink({"source_url": "https://example.com", "target_url": "https://example.com"})
    assert "http_status" in result
    assert "link_found" in result
    assert "nofollow" in result
    assert "ugc" in result
    assert "sponsored" in result
    assert "redirect" in result
    assert "error" in result
