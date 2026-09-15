# Security Documentation

## Secret Management

Tüm API anahtarları, OAuth secret'ları, token'lar ve şifreler **GitHub Actions Secrets** içinde saklanır. Frontend JavaScript, HTML veya CSS içine asla yazılmaz.

### Yasak
- `index.html`, `app.js`, `style.css` içinde secret
- `data/*.json` dosyalarında secret
- Log kayıtlarında secret
- Error mesajlarında secret

### Doğru
- GitHub Actions Secrets kullanın
- `os.environ.get("SECRET_NAME")` ile Python'da okuyun
- `get_secret()` fonksiyonunu kullanın

## Platform Güvenlik Kuralları

### CAPTCHA
- CAPTCHA tespit edilirse işlem `MANUAL` durumuna alınır
- CAPTCHA bypass yapılmaz
- Sistem durdurulmaz, sadece ilgili job etkilenir
- Dashboard'da "Bu işlem manuel doğrulama gerektiriyor" gösterilir

### 2FA
- 2FA isteyen platform `MANUAL` durumuna geçer
- 2FA bypass yapılmaz
- Token tahmini yapılmaz

### Rate Limit
- Her platformun rate limit'i saygı görür
- HTTP 429 alındığında exponential backoff: 5dk, 15dk, 60dk, 6 saat
- Maksimum 4 retry sonrası `FAILED`

### Cloudflare / Anti-Bot
- Cloudflare koruması aşlmaz
- Anti-bot mekanizmaları atlanmaz
- Bu durumda işlem `MANUAL` queue'ya alınır

## Frontend Security

### XSS Koruması
- Tüm kullanıcı girdisi `escapeHtml()` ile escape edilir
- `innerHTML` güvenilmeyen veri ile kullanılmaz
- Tüm URL'ler `escapeAttr()` ile escape edilir

### HTTPS
- Tüm dış URL'ler HTTPS zorunluluğu
- `is_https()` ile doğrulanır
- HTTP URL'ler reddedilir

### Input Validation
- URL'ler `is_valid_url()` ile doğrulanır
- Boş veya geçersiz girdi işlenmez
- Form input'ları server-side validate edilir

## Spam Koruması

- Aynı içerik tekrar yayınlanmaz (content hash kontrolü)
- Aynı URL aynı platformda tekrar gönderilmez
- Keyword stuffing yapılmaz
- Otomatik yorum üretmez
- Sahte profil/işletme oluşturmaz
- Platformları manipüle etmez

## Data Safety

- `DROP`, `DELETE` column, type change, table rename yapılmaz
- Transaction control kullanılmaz
- Tüm tarihler ISO 8601 formatında
- UTF-8 encoding kullanılır

## Reporting

Güvenlik açığı tespit ederseniz: repository sahibine e-posta gönderin. Public issue açmayın.
