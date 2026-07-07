# Testing and Next Steps

## Local Setup

From `C:\Users\DanWa\Documents\PacBecca`:

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

## Manual Game Test

1. Open the local URL.
2. Confirm the start screen appears and the game does not begin until `Start Game` is clicked.
3. Move with arrow keys or WASD.
4. Collect pellets and hearts until the Burst meter fills.
5. Press Space and confirm ghosts become vulnerable.
6. Eat a yellow can and confirm vulnerability also triggers.
7. After collecting at least one yellow can, collide with a normal ghost after vulnerability ends and confirm the hypno-rainbow save triggers for 5 seconds.
8. Get caught three times or clear all 10 levels and confirm the leaderboard name form enables.
9. Submit a score and confirm it appears in the top-10 list.
10. Close the leaderboard, press the lower-right `Reset` button, and confirm the game restarts at level 1 with score 0 and 3 lives.
11. During active play, press the lower-right `Reset` button and confirm the same clean restart.
12. Collapse and expand the side rules menu.
13. Confirm the top-right version badge reads `v0.2.0`.
14. Clear the level and confirm the next level title appears.
15. Confirm game over or victory shows a flashing highlighted `Enter Restarts` prompt.
16. Confirm Enter restarts after game over or victory.

## Next Build Pass

- Tune `public/assets/becca-head.png` if Becca wants a different crop, expression, or style.
- Decide the final rule changes and tune Burst duration.
- Add unique maze layouts for levels 2 through 10.
- Add original sound effects.
- Add mobile swipe controls.
- Add a start/options screen after the core loop feels good.
