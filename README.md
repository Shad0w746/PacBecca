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

## Becca Head Asset

The player avatar is loaded from `public/assets/becca-head.svg`. Replace that file with a cropped, friend-approved head image when you have one. A transparent PNG with the same path adjusted in `src/game/config.ts` will work well.

## Current Game Rules

- Clear all pellets, yellow power cans, and hearts to advance.
- Yellow power cans with blue writing make ghosts vulnerable for a short time.
- Hearts and pellets fill the Becca Burst meter.
- Becca Burst briefly makes every active ghost vulnerable.
- The five ghosts have distinct target-tile behaviors:
  - Frosty: direct pursuer.
  - Megasen: ambushes ahead of Becca.
  - Aspyn: flanks using Frosty and Becca's direction.
  - Smeag: chases from far away but drifts back when close.
  - Captain: intercepts Becca through the center lanes.

## Project Structure

- `src/game/`: game loop, levels, maze parsing, ghost targeting, and pathfinding.
- `public/assets/`: replaceable game assets.
- `docs/`: research, design notes, IP boundaries, and test/next-step guide.
- `.github/workflows/ci.yml`: basic CI for tests and production build.

## Useful Commands

```powershell
pnpm test
pnpm build
pnpm check
```
