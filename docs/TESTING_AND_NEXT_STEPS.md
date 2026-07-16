# Testing and Next Steps

## Local Setup

From the PacBecca repo root:

```powershell
pnpm install
pnpm dev
```

Expected local URL:

```text
http://127.0.0.1:5173/
```

## Verification Commands

```powershell
pnpm test
pnpm build
pnpm check
```

Expected result:

- Tests pass.
- TypeScript compiles.
- Vite creates `dist/`.

## Global Leaderboard Verification

After the Cloudflare Worker is deployed:

```powershell
$env:VITE_LEADERBOARD_API_URL = "https://pacbecca-leaderboard.danwalkerworks.workers.dev/api/leaderboard"
pnpm build:squarespace
```

Publish the regenerated Squarespace embed, submit a score from the live page, then open the same page in a second browser session or device and confirm the score appears there too.

## Manual Game Test

1. Open the local URL.
2. Confirm the start screen appears and the game does not begin until `Start Game` is clicked.
3. Move with arrow keys or WASD.
4. Collect pellets and hearts until the Burst meter fills.
5. Press Space and confirm ghosts become vulnerable.
6. Eat a yellow can and confirm vulnerability also triggers.
7. Eat all five ghosts in one round and confirm the next level starts.
8. After collecting at least one yellow can, collide with a normal ghost after vulnerability ends and confirm the hypno-rainbow save triggers for 5 seconds.
9. Get caught three times or clear all 10 levels and confirm the leaderboard name form enables.
10. Submit a score and confirm it appears in the top-10 list.
11. Close the leaderboard, press the lower-right `Reset` button, and confirm the game restarts at level 1 with score 0 and 3 lives.
12. During active play, press the lower-right `Reset` button and confirm the same clean restart.
13. Collapse and expand the side rules menu.
14. Confirm the top-right version badge reads the full project version, such as `v0.5.0`.
15. Clear the level and confirm the next level title appears.
16. Confirm game over or victory shows a flashing highlighted `Enter Restarts` prompt.
17. Confirm Enter restarts after game over or victory.
18. Collect a yellow can and confirm power-up mode has an obvious playful intro and looping sparkle sound.
19. Trigger Becca Rage and confirm it has a distinct siren/drop sound separate from regular power-up mode.
20. Open the game with `?diagnostics=1`, use the lower-right level dropdown to jump to levels 2, 5, and 10, and confirm each has a different maze and resets to 3 lives with score 0.

## Next Build Pass

- Tune `public/assets/becca-head.png` if Becca wants a different crop, expression, or style.
- Decide the final rule changes and tune Burst duration.
- Add mobile swipe controls.
- Add a start/options screen after the core loop feels good.
