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
2. Move with arrow keys or WASD.
3. Collect pellets and hearts until the Burst meter fills.
4. Press Space and confirm ghosts become vulnerable.
5. Eat a yellow can and confirm vulnerability also triggers.
6. Clear the level and confirm the next level title appears.
7. Get caught three times and confirm Enter restarts.

## Next Build Pass

- Tune `public/assets/becca-head.png` if Becca wants a different crop, expression, or style.
- Decide the final rule changes and tune Burst duration.
- Add unique maze layouts for levels 2 through 10.
- Add original sound effects.
- Add mobile swipe controls.
- Add a start/options screen after the core loop feels good.
