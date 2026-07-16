# PacBecca Game Design

## Pitch

PacBecca is a bright, fast, personal maze-chase game where Becca clears 10 themed levels while five named troublemakers try to box her in.

## Starting Scope

- Browser game.
- Keyboard controls.
- Ten original level mazes.
- Ten level configs that scale speed, color, layout, and vulnerability timing.
- Five ghosts with named personalities.
- Ghost-sweep round win: eating each ghost at least once in one level immediately clears the round.
- Yellow power cans with blue writing.
- Faux-3D Becca head animation with a direction-aware chomping mouth.
- First bad ghost hit after collecting a yellow can triggers a one-time 5-second hypno-rainbow save.
- Txt-file-backed top-10 leaderboard with name submission after a run ends.
- Collapsible side menu explaining objective, rules, and leaderboard.
- Persistent top-right version badge.
- Hidden-by-default diagnostic level dropdown beside Reset for quickly jumping to a level during testing.
- Replaceable Becca head image.
- Procedural arcade sound effects, simple background music, power-mode music, and a persistent Sound On/Off toggle.
- Lazy-loaded Phaser/game scene so the start screen can render before the heavier game code downloads.

## Level Set

Each level has a distinct maze layout while preserving the same 25x23 board size, Becca start, five ghost starts, and reachable pickup rules.

1. Porch Practice
2. Glitter Hall
3. Left Turn Energy
4. Snack Dash
5. Aspyn Hour
6. The Group Chat
7. Corner Confidence
8. Afterparty Loop
9. Close Call Club
10. Becca Mode

## Ghosts

- Frosty: direct pursuer.
- Megasen: ahead-of-player ambusher.
- Aspyn: flanker that uses Frosty's position.
- Smeag: drifter who backs off when close.
- Captain: center-lane interceptor.

## Asset Direction

The current Becca head uses a transparent sprite sheet cropped from all supplied Snagit reference images. The game draws the open/close mouth live so the swallow animation can face the movement direction.

## Sound Direction

PacBecca synthesizes short arcade sound effects and simple music loops in the browser with Web Audio instead of shipping audio files. Pickups use small chirps, yellow cans use celebratory rising tones, one-life losses use a playful bounce cue, the final three-lives-lost state uses a heavier dramatic cue, power mode adds a bright temporary sparkle loop, Becca Rage adds a louder siren/drop cue with a short rage loop, and active gameplay has an original ancient-temple chiptune ambience. The background music can evoke adventure-game temple moods through drones, bell-like tones, and modal note choices, but it must not copy Zelda melodies, rhythm signatures, recordings, or sound effects. The page chrome exposes a Sound On/Off toggle, and the preference is stored in browser-local storage.

## Future Performance Note

Revisit Phaser before a larger performance-focused release. Phaser is currently lazy-loaded behind the start screen, but it still dominates the deferred JavaScript payload. Evaluate replacing it with a smaller custom Canvas renderer, PixiJS, or another lightweight 2D runtime once core gameplay settles. A replacement should preserve the tile-based movement model, existing asset/loading behavior, audio controls, GitHub Pages base-path support, and leaderboard integration while reducing download size and start latency.
