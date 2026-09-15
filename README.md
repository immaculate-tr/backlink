# Premium Backlink Automation Platform

A professional, modular, and secure backlink / brand mention outreach platform that runs on GitHub Pages (dashboard) + GitHub Actions (automation engine) using official platform APIs only.

## Architecture

- **Frontend (GitHub Pages):** HTML5 + CSS3 + Vanilla JS dashboard
- **Automation Engine (GitHub Actions):** Python scripts + platform adapters
- **Data Layer:** JSON files (optionally Supabase)
- **Security:** All secrets stored as GitHub Actions Secrets — never in frontend code

## Platform Adapters

Each platform has an independent adapter implementing: `validate_credentials()`, `health_check()`, `build_content()`, `publish()`, `get_published_url()`, `rate_limit()`.

### Supported Platforms

| Platform | Type | API | OAuth | Automation |
|----------|------|-----|------|-----------|
| GitHub | api | Yes | No | Yes |
| Blogger | api | Yes | Yes | Yes |
| WordPress | api | Yes | No | Yes |
| YouTube | api | Yes | Yes | Yes |
| Dev.to | api | Yes | No | Yes |
| Hashnode | api | Yes | No | Yes |
| Tumblr | api | Yes | Yes | Yes |
| Vimeo | api | Yes | Yes | Yes |
| Flickr | api | Yes | Yes | Yes |
| Mastodon | api | Yes | No | Yes |
| Google Business Profile | api | Yes | Yes | Yes |

## Kurulum

### 1. GitHub Pages Kurulumu

1. Bu repository'yi GitHub'a push edin.
2. Repository Settings → Pages → Source: **GitHub Actions**
3. `deploy.yml` workflow'u otomatik sayfayı yayına alacaktır.

### 2. GitHub Actions Kurulumu

Workflow'lar `.github/workflows/` altında bulunur:
- `deploy.yml` — GitHub Pages deploy
- `scheduler.yml` — Haftalık otomasyon (Pazartesi 02:17 UTC)
- `publisher.yml` — Queue'daki işleri yayınlar
- `verifier.yml` — Yayınlanan backlink'leri doğrular
- `retry.yml` — Başarısız işleri retry yapar
- `health.yml` — Platform sağlık kontrolü
- `report.yml` — Haftalık rapor üretir

### 3. Secrets Kurulumu

Repository Settings → Secrets and variables → Actions → New repository secret:

| Secret Name | Platform | Açıklama |
|-------------|----------|----------|
| `GITHUB_TOKEN` | GitHub | Otomatik sağlanır (GITHUB_TOKEN) |
| `DEVTO_API_KEY` | Dev.to | Dev.to API anahtarı |
| `WORDPRESS_TOKEN` | WordPress | WordPress REST API token |
| `WORDPRESS_URL` | WordPress | WordPress site URL |
| `YOUTUBE_TOKEN` | YouTube | Google OAuth refresh token |
| `GOOGLE_CLIENT_ID` | Google | OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google | OAuth client secret |
| `GOOGLE_REFRESH_TOKEN` | Google | OAuth refresh token |
| `BLOGGER_TOKEN` | Blogger | Google OAuth token |
| `HASHNODE_TOKEN` | Hashnode | Hashnode Personal Access Token |
| `TUMBLR_CONSUMER_KEY` | Tumblr | OAuth consumer key |
| `TUMBLR_CONSUMER_SECRET` | Tumblr | OAuth consumer secret |
| `TUMBLR_OAUTH_TOKEN` | Tumblr | OAuth token |
| `TUMBLR_OAUTH_SECRET` | Tumblr | OAuth token secret |
| `VIMEO_TOKEN` | Vimeo | Vimeo API access token |
| `FLICKR_API_KEY` | Flickr | Flickr API key |
| `FLICKR_API_SECRET` | Flickr | Flickr API secret |
| `MASTODON_TOKEN` | Mastodon | Mastodon access token |
| `MASTODON_INSTANCE` | Mastodon | Mastodon instance URL |
| `DRY_RUN` | Global | "true" veya "false" |

### 4. OAuth Kurulumu

Google OAuth (YouTube, Blogger, Google Business Profile):
1. Google Cloud Console'da OAuth 2.0 Client ID oluşturun.
2. `https://github.com/<user>/<repo>` redirect URI ekleyin.
3. Refresh token alın ve `GOOGLE_REFRESH_TOKEN` secret'ına ekleyin.

Tumblr OAuth:
1. Tumblr Apps sayfasından uygulama oluşturun.
2. Consumer key/secret ve OAuth token/secret alın.
3. İlgili secret'lara ekleyin.

### 5. Dry Run

Varsayılan olarak `DRY_RUN=true` dur. Yani:
- API'ye gerçek yayın isteği gönderilmez
- Sistem simülasyon modunda çalışır
- Queue oluşturulur ama publish yapılmaz

Production için:
1. `DRY_RUN` secret'ını `false` yapın
2. İlgili platform credential'larını ekleyin
3. Publisher workflow'unu manuel tetikleyin

### 6. Production

1. Tüm gerekli platform secret'larını ekleyin
2. `DRY_RUN` secret'ını `false` yapın
3. Scheduler workflow'unu manuel tetikleyin veya cron'a bekleyin
4. Dashboard'dan sonuçları izleyin

## Security

- API key, OAuth secret, token gibi bilgiler frontend'e yazılmaz
- Tüm credential'lar GitHub Actions Secrets'da saklanır
- CAPTCHA, 2FA, Cloudflare gibi güvenlik mekanizmaları aşılmaz
- Platform kullanım şartları ihlal edilmez
- Spam üretmez, sahte hesap oluşturmaz
- XSS koruması: tüm frontend input'lar escape edilir
- HTTPS zorunludur

Detaylar için `docs/SECURITY.md` ve `SECURITY.md` dosyalarına bakın.

## Troubleshooting

| Sorun | Çözüm |
|-------|-------|
| Dashboard açılmıyor | GitHub Pages ayarlarını kontrol edin (Source: GitHub Actions) |
| Workflow çalışmıyor | Actions tab'ından log'ları kontrol edin |
| API credential hatası | İlgili secret'ın doğru değer içerdiğinden emin olun |
| Rate limit hatası | Retry workflow'u otomatik yeniden deneyecektir |
| CAPTCHA tespit edildi | İşlem otomatik olarak MANUAL queue'ya alınır |
| 2FA gerekli | İşlem otomatik olarak MANUAL queue'ya alınır |
| Platform health alert | Health check workflow'u platform'u devre dışı bırakır |

## Test

```bash
pip install -r requirements.txt
python -m pytest tests/ -v
```

## License

MIT — see [LICENSE](LICENSE)
