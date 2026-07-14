# Global Leaderboard

PacBecca can use a hosted Cloudflare Worker for a shared top-10 leaderboard on Squarespace.

## Architecture

- Squarespace hosts the static PacBecca embed.
- The game reads `VITE_LEADERBOARD_API_URL` at build time, or `window.PACBECCA_LEADERBOARD_API_URL` at runtime.
- The Cloudflare Worker exposes `GET /api/leaderboard` and `POST /api/leaderboard`.
- Cloudflare KV stores the shared top 10 as JSON.
- If the hosted API is missing or unavailable, PacBecca falls back to the existing local `leaderboard.txt` and browser storage behavior.

## Cloudflare Setup

Run these from the repo root after logging into Cloudflare:

```powershell
pnpm dlx wrangler login
pnpm dlx wrangler kv namespace create pacbecca_leaderboard
pnpm dlx wrangler kv namespace create pacbecca_leaderboard --preview
```

Copy the returned IDs into [workers/leaderboard/wrangler.toml](../workers/leaderboard/wrangler.toml).

## Deploy The API

```powershell
pnpm leaderboard:deploy
```

The deployed PacBecca Worker URL is:

```text
https://pacbecca-leaderboard.danwalkerworks.workers.dev
```

The PacBecca API URL is that value plus `/api/leaderboard`.

## Build PacBecca For Squarespace

```powershell
$env:VITE_LEADERBOARD_API_URL = "https://pacbecca-leaderboard.danwalkerworks.workers.dev/api/leaderboard"
pnpm build:squarespace
```

Then regenerate and publish the Squarespace code block.

The public Squarespace game page should be named `PacBecca`, use the slug `/pacbecca`, and have page password protection turned off. Paste `output/pacbecca-page-code-block.html` into that page's Code block, then update the Games & Stuff Code block so its PacBecca link points to `/pacbecca`.

## Test

1. Open the live Squarespace page in one browser session.
2. Finish a run and submit a score.
3. Open the page in a second browser session or device.
4. Confirm the score appears in the top 10 without relying on the first browser's local storage.

## API Contract

`GET /api/leaderboard` returns:

```json
{
  "entries": [
    {
      "name": "Becca",
      "score": 1200,
      "level": 3,
      "won": false,
      "createdAt": "2026-07-07T18:10:00.000Z"
    }
  ]
}
```

`POST /api/leaderboard` accepts:

```json
{
  "name": "Becca",
  "score": 1200,
  "level": 3,
  "won": false
}
```
