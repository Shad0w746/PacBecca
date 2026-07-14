# PacBecca Global Leaderboard Worker

This Cloudflare Worker stores PacBecca's shared top-10 leaderboard in Cloudflare KV.

## Endpoints

- `GET /api/leaderboard` returns `{ "entries": [...] }`.
- `POST /api/leaderboard` accepts `{ "name": "...", "score": 123, "level": 4, "won": false }` and returns the updated top 10.

## Deploy

```powershell
pnpm dlx wrangler login
pnpm dlx wrangler kv namespace create pacbecca_leaderboard
pnpm dlx wrangler kv namespace create pacbecca_leaderboard --preview
```

Copy the returned `id` and `preview_id` values into `workers/leaderboard/wrangler.toml`, then deploy:

```powershell
pnpm dlx wrangler deploy --config workers/leaderboard/wrangler.toml
```

PacBecca's deployed API URL is:

```text
https://pacbecca-leaderboard.danwalkerworks.workers.dev/api/leaderboard
```

After deployment, set PacBecca's build-time leaderboard URL to the Worker endpoint:

```powershell
$env:VITE_LEADERBOARD_API_URL = "https://pacbecca-leaderboard.danwalkerworks.workers.dev/api/leaderboard"
pnpm build:squarespace
```
