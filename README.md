# PacBecca

PacBecca is an original 10-level maze-chase browser game inspired by the technical design lessons of classic arcade maze games. It uses Phaser, TypeScript, and Vite.

## Run Locally

```powershell
pnpm install
pnpm dev
```

Open the local URL Vite prints, usually `http://127.0.0.1:5173/`.
Press `Start Game` to begin after the page loads.

## Controls

- Arrow keys or WASD: move Becca
- Space: use Becca Burst when the meter is full
- Enter: restart after game over or victory
- Becca's head chomps in the direction of movement while she clears pickups.

## Becca Head Asset

The player avatar uses `public/assets/becca-head-sheet.png`, a six-frame transparent sprite sheet built from the supplied Snagit reference images. `public/assets/becca-head.png` remains as the single-frame fallback/preview.

## Current Game Rules

- Clear all pellets, yellow power cans, and hearts to advance.
- Eat each ghost at least once in a round to win that round immediately.
- Yellow power cans with blue writing make ghosts vulnerable for a short time.
- After collecting at least one yellow can, the first bad ghost hit triggers a 5-second hypno-rainbow save instead of losing a life.
- Hearts and pellets fill the Becca Burst meter.
- Becca Burst briefly makes every active ghost vulnerable.
- Finish a run to submit your name to the top-10 leaderboard in `public/leaderboard.txt`.
- Open the collapsible rules menu to review the objective, rules, and leaderboard.
- The five ghosts have distinct target-tile behaviors:
  - Frosty: direct pursuer.
  - Megasen: ambushes ahead of Becca.
  - Aspyn: flanks using Frosty and Becca's direction.
  - Smeag: chases from far away but drifts back when close.
  - Captain: intercepts Becca through the center lanes.

## Project Structure

- `src/game/`: game loop, levels, maze parsing, ghost targeting, and pathfinding.
- `src/ui/`: browser UI for the local leaderboard and page controls.
- `public/leaderboard.txt`: simple tab-separated top-10 leaderboard file.
- `public/assets/`: replaceable game assets.
- `docs/`: research, design notes, IP boundaries, and test/next-step guide.
- `.github/workflows/ci.yml`: basic CI for tests and production build.

## Leaderboard File

The game reads `public/leaderboard.txt` to show the top 10 scores. While running with `pnpm dev`, score submissions post to `/api/leaderboard`, and the Vite dev server writes the updated top 10 back to that txt file.

Static hosts can read the txt file, but they cannot write back to the git repo without a server endpoint.

## Global Leaderboard

The repo includes a Cloudflare Worker in `workers/leaderboard` for a shared Squarespace leaderboard. Deploy it with Cloudflare KV, then build PacBecca with:

```powershell
$env:VITE_LEADERBOARD_API_URL = "https://pacbecca-leaderboard.danwalkerworks.workers.dev/api/leaderboard"
pnpm build:squarespace
```

See [docs/GLOBAL_LEADERBOARD.md](docs/GLOBAL_LEADERBOARD.md) for the full deployment runbook.

## GitHub Hosting

The app is ready to run from GitHub Pages as a static Vite build while continuing to use the Cloudflare Worker for the global leaderboard.

See [docs/GITHUB_MIGRATION.md](docs/GITHUB_MIGRATION.md) for the migration checklist.

The Pages workflow builds with:

```powershell
$env:VITE_LEADERBOARD_API_URL = "https://pacbecca-leaderboard.danwalkerworks.workers.dev/api/leaderboard"
$env:VITE_BASE_PATH = "/PacBecca/"
pnpm build
```

For Squarespace embed output, set `PACBECCA_SQUARESPACE_OUTPUT_DIR` if you want the generated code block written outside this repo.

## Useful Commands

```powershell
pnpm test
pnpm build
pnpm check
pnpm leaderboard:deploy
```
