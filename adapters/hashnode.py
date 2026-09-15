import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

try:
    import requests
except ImportError:
    requests = None

from scripts.config import get_secret
from scripts.content import build_hashnode_content

API_BASE = "https://gql.hashnode.com"


def validate_credentials():
    token = get_secret("HASHNODE_TOKEN")
    if not token:
        return False, "HASHNODE_TOKEN not configured"
    return True, "OK"


def health_check():
    if requests is None:
        return False, "requests library not available"
    try:
        query = "{ me { id } }"
        resp = requests.post(API_BASE, headers=_headers(), json={"query": query}, timeout=15)
        return resp.status_code == 200, f"HTTP {resp.status_code}"
    except Exception as e:
        return False, str(e)


def _headers():
    return {
        "Authorization": get_secret("HASHNODE_TOKEN"),
        "Content-Type": "application/json",
    }


def rate_limit():
    return {"remaining": 100, "limit": 100, "reset": None}


def build_content(business, target_url):
    return build_hashnode_content(business, target_url)


def publish(content):
    token = get_secret("HASHNODE_TOKEN")
    if not token:
        return {"success": False, "error": "HASHNODE_TOKEN not configured"}

    if requests is None:
        return {"success": False, "error": "requests library not available"}

    publication_id = get_secret("HASHNODE_PUBLICATION_ID")
    if not publication_id:
        return {"success": False, "error": "HASHNODE_PUBLICATION_ID not configured"}

    body_md = content.get("body_markdown", content.get("body", ""))
    mutation = """
    mutation PublishPost($input: PublishPostInput!) {
      publishPost(input: $input) {
        post { id url }
      }
    }
    """
    variables = {
        "input": {
            "title": content.get("title", ""),
            "contentMarkdown": body_md,
            "publicationId": publication_id,
        }
    }

    try:
        resp = requests.post(API_BASE, headers=_headers(), json={"query": mutation, "variables": variables}, timeout=30)
        if resp.status_code == 200:
            data = resp.json()
            post = data.get("data", {}).get("publishPost", {}).get("post", {})
            url = post.get("url", "")
            if url:
                return {"success": True, "url": url}
            return {"success": False, "error": f"No URL in response: {str(data)[:200]}"}
        else:
            return {"success": False, "error": f"HTTP {resp.status_code}: {resp.text[:200]}"}
    except Exception as e:
        return {"success": False, "error": str(e)}


def get_published_url(result):
    return result.get("url", "")
