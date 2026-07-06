# PacBecca

PacBecca is an original 10-level maze-chase browser game inspired by the technical design lessons of classic arcade maze games. It uses Phaser, TypeScript, and Vite.

## Run Locally

```powershell
pnpm install
pnpm dev
```

Open the local URL Vite prints, usually `http://127.0.0.1:5173/`.

## Controls

- Arrow keys or WASD: move Becca
- Space: use Becca Burst when the meter is full
- Enter: restart after game over or victory
- Becca's head chomps in the direction of movement while she clears pickups.

## Becca Head Asset

The player avatar uses `public/assets/becca-head-sheet.png`, a six-frame transparent sprite sheet built from the supplied Snagit reference images. `public/assets/becca-head.png` remains as the single-frame fallback/preview.

## Current Game Rules

- Clear all pellets, yellow power cans, and hearts to advance.
- Yellow power cans with blue writing make ghosts vulnerable for a short time.
- After collecting at least one yellow can, the first bad ghost hit triggers a 5-second hypno-rainbow save instead of losing a life.
- Hearts and pellets fill the Becca Burst meter.
- Becca Burst briefly makes every active ghost vulnerable.
- Finish a run to submit your name to the local top-10 leaderboard.
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
- `public/assets/`: replaceable game assets.
- `docs/`: research, design notes, IP boundaries, and test/next-step guide.
- `.github/workflows/ci.yml`: basic CI for tests and production build.

## Useful Commands

```powershell
pnpm test
pnpm build
pnpm check
```
