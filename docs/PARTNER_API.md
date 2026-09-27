# Partner Catalog API

The production API exposes published anime and episode metadata, including direct video URLs, for registered external apps and websites.

## Authentication

Create a key in the Admin API Keys page with the `anime:read` scope (or `all`). Send it on every request:

```http
X-API-Key: nami_live_<secret>
```

The full key is shown only once. Store it on a trusted server or native app's secure storage; do not commit it to a public web frontend. Keys can be revoked or expired from the Admin API Keys page.

## Endpoints

`GET /api/v1/catalog/anime?page=1&per_page=50`

Optional `query` searches published titles, alternate titles, and slugs. `per_page` is limited to 100.

`GET /api/v1/catalog/anime/{slug_or_id}/episodes?page=1&per_page=100`

Returns published episodes, direct `video_url` values, and pagination metadata. `per_page` is limited to 500.

Example:

```bash
curl "https://YOUR_API_HOST/api/v1/catalog/anime/perfect-world/episodes" \
  -H "X-API-Key: nami_live_REPLACE_WITH_KEY"
```

Responses include `data` arrays and a `pagination` object. The episode `video_url` is the stored upstream URL; this endpoint does not proxy, sign, or guarantee third-party availability of the file.

## Browser Access

The backend enforces an explicit CORS allowlist. Add the requesting web app origin to `AUTHORIZED_DOMAINS` in the API deployment environment. Native/server-to-server clients do not rely on browser CORS. Apply normal client-side caching and respect the API's rate limit.

## CSV Episode Import

Staff/Admin can upload a CSV in the Admin API Keys page's **CSV Match & Import** tab. Preview uses exact Anime ID, exact catalog title/alternate title/slug, or the repository's verified title aliases, plus an episode number from the title or filename. Non-completed statuses are skipped. Resolve conflicts before applying; applying updates matching episode URLs and adds only episodes whose anime match is unambiguous.

## Manual VIP Payments

The Owner Portal's Platform Settings tab configures public display of a KHQR image, payment URL, instructions, and checkout colors. Users submit a transaction reference; a QR scan or link click does not verify payment. An Owner must approve a pending submission before the backend activates VIP.
