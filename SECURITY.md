# Security Policy

## Secret Management

All sensitive credentials are stored exclusively as GitHub Actions Secrets:

- `GITHUB_TOKEN` (auto-provided)
- `DEVTO_API_KEY`
- `WORDPRESS_TOKEN` / `WORDPRESS_URL`
- `YOUTUBE_TOKEN`
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REFRESH_TOKEN`
- `BLOGGER_TOKEN`
- `HASHNODE_TOKEN`
- `TUMBLR_CONSUMER_KEY` / `TUMBLR_CONSUMER_SECRET` / `TUMBLR_OAUTH_TOKEN` / `TUMBLR_OAUTH_SECRET`
- `VIMEO_TOKEN`
- `FLICKR_API_KEY` / `FLICKR_API_SECRET`
- `MASTODON_TOKEN` / `MASTODON_INSTANCE`
- `DRY_RUN`

**Never** hardcode any of these in frontend JavaScript, HTML, CSS, or committed JSON data files.

## Platform Safety Rules

- CAPTCHA is never bypassed — jobs are moved to MANUAL queue
- 2FA is never bypassed — jobs are moved to MANUAL queue
- Cloudflare / anti-bot protections are not circumvented
- Rate limits are respected (exponential backoff: 5m, 15m, 60m, 6h)
- No scraping of platforms without official API
- No fake accounts or fake business profiles
- No keyword stuffing or spam content
- Platform Terms of Service are respected at all times

## Frontend Security

- All user input is HTML-escaped before rendering
- No `innerHTML` with untrusted data
- HTTPS enforced on all external URLs
- No external script loading from untrusted sources
- CSRF-sensitive operations handled in GitHub Actions backend

## Reporting a Vulnerability

Email the repository owner. Do not open a public issue for security vulnerabilities.
