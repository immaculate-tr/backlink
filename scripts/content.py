import hashlib
from scripts.core import content_hash, normalize_url


def build_github_content(business: dict, target_url: str) -> dict:
    name = business.get("name", "")
    desc = business.get("description", "")
    website = business.get("website", "")
    return {
        "title": f"{name} — Technical Overview",
        "body": f"# {name}\n\n{desc}\n\nWebsite: {website}\n\nTarget: {target_url}",
        "anchor": name,
        "content_type": "technical_description",
    }


def build_blogger_content(business: dict, target_url: str) -> dict:
    name = business.get("name", "")
    desc = business.get("description", "")
    website = business.get("website", "")
    return {
        "title": f"{name} — Company Blog Post",
        "body": f"<h2>{name}</h2><p>{desc}</p><p>Visit: <a href=\"{website}\">{name}</a></p>",
        "anchor": name,
        "content_type": "article",
    }


def build_wordpress_content(business: dict, target_url: str) -> dict:
    name = business.get("name", "")
    desc = business.get("description", "")
    website = business.get("website", "")
    return {
        "title": f"{name} — Article",
        "body": f"<!-- wp:paragraph --><p>{desc}</p><p>Website: <a href=\"{website}\">{name}</a></p><!-- /wp:paragraph -->",
        "anchor": name,
        "content_type": "article",
    }


def build_youtube_content(business: dict, target_url: str) -> dict:
    name = business.get("name", "")
    desc = business.get("description", "")
    website = business.get("website", "")
    return {
        "title": f"{name} — Channel Description",
        "body": f"{desc}\n\nVisit {name} at {website}",
        "anchor": name,
        "content_type": "video_description",
    }


def build_devto_content(business: dict, target_url: str) -> dict:
    name = business.get("name", "")
    desc = business.get("description", "")
    website = business.get("website", "")
    return {
        "title": f"{name} — Technical Article",
        "body_markdown": f"---\ntitle: {name}\npublished: true\n---\n\n{desc}\n\n[{name}]({website})",
        "anchor": name,
        "content_type": "technical_article",
    }


def build_hashnode_content(business: dict, target_url: str) -> dict:
    name = business.get("name", "")
    desc = business.get("description", "")
    website = business.get("website", "")
    return {
        "title": f"{name} — Article",
        "body_markdown": f"## {name}\n\n{desc}\n\n[{name}]({website})",
        "anchor": name,
        "content_type": "technical_article",
    }


def build_tumblr_content(business: dict, target_url: str) -> dict:
    name = business.get("name", "")
    desc = business.get("description", "")
    website = business.get("website", "")
    return {
        "title": f"{name}",
        "body": f"{desc}\n\n<a href=\"{website}\">{name}</a>",
        "anchor": name,
        "content_type": "blog_post",
    }


def build_vimeo_content(business: dict, target_url: str) -> dict:
    name = business.get("name", "")
    desc = business.get("description", "")
    website = business.get("website", "")
    return {
        "title": f"{name} — Video Description",
        "body": f"{desc}\n\n{website}",
        "anchor": name,
        "content_type": "video_description",
    }


def build_flickr_content(business: dict, target_url: str) -> dict:
    name = business.get("name", "")
    desc = business.get("description", "")
    website = business.get("website", "")
    return {
        "title": f"{name}",
        "body": f"{desc}\n\n{website}",
        "anchor": name,
        "content_type": "photo_description",
    }


def build_mastodon_content(business: dict, target_url: str) -> dict:
    name = business.get("name", "")
    desc = business.get("description", "")
    website = business.get("website", "")
    short_desc = desc[:200] if len(desc) > 200 else desc
    return {
        "title": "",
        "body": f"{name}: {short_desc}\n\n{website}",
        "anchor": name,
        "content_type": "short_post",
    }


def build_google_business_content(business: dict, target_url: str) -> dict:
    name = business.get("name", "")
    desc = business.get("description", "")
    website = business.get("website", "")
    return {
        "title": name,
        "body": desc,
        "anchor": name,
        "content_type": "business_description",
    }


CONTENT_BUILDERS = {
    "github": build_github_content,
    "blogger": build_blogger_content,
    "wordpress": build_wordpress_content,
    "youtube": build_youtube_content,
    "devto": build_devto_content,
    "hashnode": build_hashnode_content,
    "tumblr": build_tumblr_content,
    "vimeo": build_vimeo_content,
    "flickr": build_flickr_content,
    "mastodon": build_mastodon_content,
    "google_business": build_google_business_content,
}


def build_content(platform_id: str, business: dict, target_url: str) -> dict:
    builder = CONTENT_BUILDERS.get(platform_id)
    if not builder:
        return {"title": business.get("name", ""), "body": business.get("description", ""), "anchor": business.get("name", ""), "content_type": "generic"}
    content = builder(business, target_url)
    content["hash"] = content_hash(content.get("body", content.get("body_markdown", "")) + content.get("title", ""))
    content["target_url"] = normalize_url(target_url)
    return content


def get_anchor_variations(business: dict) -> list:
    name = business.get("name", "")
    website = business.get("website", "")
    return [
        {"type": "brand", "text": name},
        {"type": "url", "text": website.replace("https://", "").replace("http://", "").rstrip("/")},
        {"type": "generic", "text": "web sitesini ziyaret edin"},
        {"type": "partial_match", "text": f"{name} hakkında"},
        {"type": "natural_phrase", "text": "daha fazla bilgi için"},
    ]


def is_duplicate(content: dict, platform_id: str, target_url: str, backlinks: list, queue: list) -> bool:
    ch = content.get("hash", "")
    for b in backlinks:
        if b.get("platform") == platform_id and b.get("target_url") == target_url:
            return True
        if ch and b.get("platform") == platform_id and b.get("content_hash") == ch:
            return True
    for q in queue:
        if q.get("platform") == platform_id and q.get("target_url") == target_url:
            if q.get("status") in ("PUBLISHED", "VERIFIED", "QUEUED", "PROCESSING"):
                return True
    return False
