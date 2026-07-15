# GitHub Migration

This repo is prepared to move to GitHub while keeping the writable leaderboard API on Cloudflare.

## What Moves To GitHub

- Source code in `src/`
- Static assets in `public/`
- Tests, Vite config, docs, and GitHub Actions workflows
- Cloudflare Worker source and config in `workers/leaderboard/`

## What Stays Off GitHub

- `node_modules/`
- Build output in `dist/` and `dist-squarespace/`
- Local logs, temp files, `.env` files, and `.wrangler/`
- Cloudflare secrets or account credentials

The checked-in `workers/leaderboard/wrangler.toml` contains Worker/KV binding configuration, not an API secret. The leaderboard itself continues to run on Cloudflare KV.

## GitHub Pages

The included `.github/workflows/pages.yml` workflow publishes the Vite `dist/` build to GitHub Pages after pushes to `main`.

The workflow sets:

```text
VITE_BASE_PATH=/${{ github.event.repository.name }}/
VITE_LEADERBOARD_API_URL=https://pacbecca-leaderboard.danwalkerworks.workers.dev/api/leaderboard
```

That keeps asset URLs correct under a project Pages URL such as:

```text
https://OWNER.github.io/PacBecca/
```

If the repo is published as a user or organization Pages root, such as `OWNER.github.io`, change `VITE_BASE_PATH` to `/`.

## Before First Push

1. Create an empty GitHub repository named `PacBecca`.
2. Keep it empty: do not initialize it with a README, license, or `.gitignore`.
3. In GitHub repository settings, set Pages source to GitHub Actions.
4. Confirm the Cloudflare Worker remains deployed at:

```text
https://pacbecca-leaderboard.danwalkerworks.workers.dev/api/leaderboard
```

## Publish Commands

Run these only after approving the migration:

```powershell
git remote add origin https://github.com/OWNER/PacBecca.git
git branch -M main
git push -u origin main
```

After the push, GitHub Actions should run:

```text
CI
Deploy GitHub Pages
```

## Local Verification

```powershell
pnpm check
$env:VITE_BASE_PATH="/PacBecca/"
$env:VITE_LEADERBOARD_API_URL="https://pacbecca-leaderboard.danwalkerworks.workers.dev/api/leaderboard"
pnpm build
```

For Squarespace page-code generation, run `pnpm build:squarespace:embed`. The generator writes a public `/pacbecca` code block that embeds the GitHub Pages build. It writes to the repo-local ignored `output/` folder by default, or to `PACBECCA_SQUARESPACE_OUTPUT_DIR` when that environment variable is set.
