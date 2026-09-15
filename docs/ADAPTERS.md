# Platform Adapters

## Adapter Mimarisi

Her platform bağımsız bir adapter'dır. Tüm adapter'lar aynı arayüzü implemente eder:

```
validate_credentials() -> (bool, str)
health_check() -> (bool, str)
build_content(business, target_url) -> dict
publish(content) -> dict
get_published_url(result) -> str
rate_limit() -> dict
```

## Mevcut Adapter'lar

### GitHub (`adapters/github.py`)
- **API:** REST API v3
- **Auth:** `GITHUB_TOKEN` (otomatik sağlanır)
- **İşlem:** Repository'ye markdown dosyası commit
- **Rate Limit:** 5000/saat
- **Secrets:** `GITHUB_TOKEN`

### Dev.to (`adapters/devto.py`)
- **API:** Forem API
- **Auth:** API Key
- **İşlem:** Makale yayınla
- **Rate Limit:** 10/30sn
- **Secrets:** `DEVTO_API_KEY`

### WordPress (`adapters/wordpress.py`)
- **API:** WordPress REST API
- **Auth:** Bearer Token
- **İşlem:** Blog post yayınla
- **Secrets:** `WORDPRESS_TOKEN`, `WORDPRESS_URL`

### Blogger (`adapters/blogger.py`)
- **API:** Blogger API v3
- **Auth:** OAuth 2.0
- **İşlem:** Blog post yayınla
- **Secrets:** `BLOGGER_TOKEN`, `BLOGGER_BLOG_ID`

### YouTube (`adapters/youtube.py`)
- **API:** YouTube Data API v3
- **Auth:** OAuth 2.0
- **İşlem:** Video açıklaması güncelle
- **Secrets:** `YOUTUBE_TOKEN`

### Hashnode (`adapters/hashnode.py`)
- **API:** GraphQL API
- **Auth:** Personal Access Token
- **İşlem:** Makale yayınla
- **Secrets:** `HASHNODE_TOKEN`, `HASHNODE_PUBLICATION_ID`

### Tumblr (`adapters/tumblr.py`)
- **API:** Tumblr API v2
- **Auth:** OAuth 1.0a
- **İşlem:** Text post yayınla
- **Secrets:** `TUMBLR_CONSUMER_KEY`, `TUMBLR_CONSUMER_SECRET`, `TUMBLR_OAUTH_TOKEN`, `TUMBLR_OAUTH_SECRET`, `TUMBLR_BLOG_NAME`

### Vimeo (`adapters/vimeo.py`)
- **API:** Vimeo API
- **Auth:** Bearer Token
- **İşlem:** Video açıklaması güncelle
- **Secrets:** `VIMEO_TOKEN`

### Flickr (`adapters/flickr.py`)
- **API:** Flickr API
- **Auth:** OAuth 1.0a
- **İşlem:** Foto açıklaması (OAuth upload gerekli)
- **Secrets:** `FLICKR_API_KEY`, `FLICKR_API_SECRET`

### Mastodon (`adapters/mastodon.py`)
- **API:** Mastodon REST API
- **Auth:** Bearer Token
- **İşlem:** Status post
- **Rate Limit:** 300/5dk
- **Secrets:** `MASTODON_TOKEN`, `MASTODON_INSTANCE`

### Google Business Profile (`adapters/google_business.py`)
- **API:** My Business API
- **Auth:** OAuth 2.0 (refresh token)
- **İşlem:** İşletme kaydı
- **Secrets:** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`

## Yeni Adapter Ekleme

1. `adapters/` altında yeni `.py` dosyası oluştur
2. Yukarıdaki 6 fonksiyonu implemente et
3. `scripts/content.py` içinde `CONTENT_BUILDERS` dict'ine ekle
4. `data/platforms.json`'a platform kaydı ekle
5. GitHub Actions workflow'larına ilgili secret'ları ekle

## Platform Katmanları

| Katman | Açıklama |
|--------|----------|
| `API_AVAILABLE` | Resmi API ile otomasyon |
| `MANUAL_SUBMISSION` | Manuel başvuru URL'si |
| `MANUAL_REVIEW` | Yayın sonrası insan onayı |
| `UNSUPPORTED` | Otomasyon yok |
| `DISABLED` | Sistem tarafından devre dışı |
