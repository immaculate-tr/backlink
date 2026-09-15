from scripts.config import get_min_quality_score, get_quality_tier


CATEGORY_KEYWORDS = {
    "technology": ["tech", "software", "it", "digital", "computer", "mobile", "phone", "repair", "electronic", "internet", "web", "app", "code", "data", "ai", "cloud"],
    "blogging": ["blog", "article", "content", "writing", "news", "media", "publish"],
    "video": ["video", "youtube", "film", "movie", "stream", "channel"],
    "photo": ["photo", "image", "picture", "gallery", "photography"],
    "social": ["social", "network", "community", "post", "share", "follow"],
    "local": ["local", "business", "directory", "place", "map", "near", "city", "shop", "store", "restaurant"],
    "health": ["health", "medical", "doctor", "clinic", "dental", "wellness", "fitness"],
    "finance": ["finance", "bank", "investment", "money", "loan", "insurance", "accounting"],
    "education": ["education", "course", "school", "learn", "training", "academy", "university"],
    "food": ["food", "restaurant", "cafe", "kitchen", "menu", "catering", "recipe"],
}


def _category_score(business_category: str, platform_category: str) -> int:
    if not business_category or not platform_category:
        return 50
    if business_category == platform_category:
        return 95
    biz_kw = CATEGORY_KEYWORDS.get(business_category, [business_category])
    plat_kw = CATEGORY_KEYWORDS.get(platform_category, [platform_category])
    overlap = set(biz_kw) & set(plat_kw)
    if overlap:
        return 75
    if platform_category == "technology" and business_category in ("technology", "digital", "web"):
        return 80
    if platform_category == "local" and business_category in ("local", "food", "health", "finance"):
        return 85
    return 30


def _country_score(business_country: str, platform_country: str) -> int:
    if not platform_country or platform_country == "global":
        return 70
    if not business_country:
        return 50
    if business_country.upper() == platform_country.upper():
        return 95
    return 30


def _city_score(business_city: str, platform_category: str) -> int:
    if not business_city:
        return 50
    if platform_category == "local":
        return 90
    return 60


def _language_score(business_lang: str, platform_lang: str) -> int:
    if not platform_lang or platform_lang == "multi":
        return 70
    if not business_lang:
        return 50
    if business_lang == platform_lang:
        return 90
    return 40


def _technology_score(business_category: str, platform_category: str) -> int:
    tech_platforms = {"technology", "blogging"}
    if platform_category in tech_platforms and business_category in ("technology", "digital", "web", "software"):
        return 90
    if platform_category in tech_platforms:
        return 60
    return 50


def calculate_match(business: dict, platform: dict) -> dict:
    biz_cat = business.get("category", "")
    biz_country = business.get("country", "")
    biz_city = business.get("city", "")
    biz_lang = business.get("language", "en")
    plat_cat = platform.get("category", "")
    plat_country = platform.get("country", "global")
    plat_lang = platform.get("language", "multi")

    cat_s = _category_score(biz_cat, plat_cat)
    tech_s = _technology_score(biz_cat, plat_cat)
    country_s = _country_score(biz_country, plat_country)
    city_s = _city_score(biz_city, plat_cat)
    lang_s = _language_score(biz_lang, plat_lang)

    weights = {"category": 0.30, "technology": 0.20, "country": 0.20, "city": 0.15, "language": 0.15}
    overall = int(
        cat_s * weights["category"]
        + tech_s * weights["technology"]
        + country_s * weights["country"]
        + city_s * weights["city"]
        + lang_s * weights["language"]
    )

    return {
        "platform_id": platform.get("id"),
        "platform_name": platform.get("name"),
        "category_score": cat_s,
        "technology_score": tech_s,
        "country_score": country_s,
        "city_score": city_s,
        "language_score": lang_s,
        "overall": overall,
        "tier": get_quality_tier(overall),
        "quality_score": platform.get("quality_score", 0),
    }


def get_matching_platforms(business: dict, platforms: list, min_score: int = None) -> list:
    if min_score is None:
        min_score = get_min_quality_score()
    results = []
    for platform in platforms:
        if not platform.get("active", False):
            continue
        if not platform.get("api", False):
            continue
        match = calculate_match(business, platform)
        if match["overall"] >= min_score and match["quality_score"] >= min_score:
            results.append(match)
    results.sort(key=lambda x: x["overall"], reverse=True)
    return results
