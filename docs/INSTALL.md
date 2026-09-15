# Kurulum

## 1. Repository Oluştur

```bash
git clone <repo-url>
cd premium-backlink-automation
pip install -r requirements.txt
```

## 2. GitHub Pages Kurulumu

1. Repository'yi GitHub'a push edin.
2. **Settings → Pages → Source: GitHub Actions**
3. `deploy.yml` otomatik dashboard'u yayına alır.
4. URL: `https://<username>.github.io/<repo>/`

## 3. GitHub Actions Kurulumu

Workflow'lar `.github/workflows/` altında:
- `deploy.yml` — GitHub Pages deploy (push'ta otomatik)
- `scheduler.yml` — Haftalık otomasyon (Pazartesi 02:17 UTC)
- `publisher.yml` — Queue'daki işleri yayınlar
- `verifier.yml` — Backlink'leri doğrular
- `retry.yml` — Başarısız işleri retry yapar (6 saatte bir)
- `health.yml` — Platform sağlık kontrolü (haftalık)
- `report.yml` — Haftalık rapor üretir

Tüm workflow'lar `workflow_dispatch` destekler — manuel tetiklenebilir.

## 4. Secrets Kurulumu

**Settings → Secrets and variables → Actions → New repository secret:**

### Zorunlu
| Secret | Açıklama |
|--------|----------|
| `DRY_RUN` | `true` (varsayılan) veya `false` |

### Platform Bazlı (ihtiyaç göre)
| Secret | Platform |
|--------|----------|
| `GITHUB_TOKEN` | GitHub (otomatik sağlanır) |
| `DEVTO_API_KEY` | Dev.to |
| `WORDPRESS_TOKEN` | WordPress |
| `WORDPRESS_URL` | WordPress site URL |
| `YOUTUBE_TOKEN` | YouTube |
| `GOOGLE_CLIENT_ID` | Google OAuth |
| `GOOGLE_CLIENT_SECRET` | Google OAuth |
| `GOOGLE_REFRESH_TOKEN` | Google OAuth |
| `BLOGGER_TOKEN` | Blogger |
| `BLOGGER_BLOG_ID` | Blogger blog ID |
| `HASHNODE_TOKEN` | Hashnode |
| `HASHNODE_PUBLICATION_ID` | Hashnode publication ID |
| `TUMBLR_CONSUMER_KEY` | Tumblr |
| `TUMBLR_CONSUMER_SECRET` | Tumblr |
| `TUMBLR_OAUTH_TOKEN` | Tumblr |
| `TUMBLR_OAUTH_SECRET` | Tumblr |
| `TUMBLR_BLOG_NAME` | Tumblr blog adı |
| `VIMEO_TOKEN` | Vimeo |
| `FLICKR_API_KEY` | Flickr |
| `FLICKR_API_SECRET` | Flickr |
| `MASTODON_TOKEN` | Mastodon |
| `MASTODON_INSTANCE` | Mastodon instance URL |

## 5. OAuth Kurulumu

### Google (YouTube, Blogger, Google Business Profile)
1. [Google Cloud Console](https://console.cloud.google.com)'da proje oluşturun.
2. OAuth 2.0 Client ID oluşturun.
3. Gerekli API'leri etkinleştirin (YouTube Data API v3, Blogger API, My Business API).
4. Refresh token alın.
5. Secret'ları ekleyin: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`.

### Tumblr
1. [Tumblr Apps](https://www.tumblr.com/oauth/apps)'te uygulama oluşturun.
2. Consumer key/secret alın.
3. OAuth token/secret alın.
4. Tüm `TUMBLR_*` secret'larını ekleyin.

## 6. Dry Run

Varsayılan: `DRY_RUN=true`

Dry Run modunda:
- Queue oluşturulur (scheduler çalışır)
- Publisher simülasyon yapar (gerçek API isteği göndermez)
- Backlink'ler `[DRY RUN]` olarak işaretlenir

## 7. Production

1. Tüm gerekli platform secret'larını ekleyin.
2. `DRY_RUN` secret'ını `false` yapın.
3. Scheduler'ı manuel tetikleyin veya cron'a bekleyin.
4. Dashboard'dan sonuçları izleyin.

## 8. Test

```bash
pip install -r requirements.txt
python -m pytest tests/ -v
```
