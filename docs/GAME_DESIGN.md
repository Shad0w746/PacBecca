# PacBecca Game Design

## Pitch

PacBecca is a bright, fast, personal maze-chase game where Becca clears 10 themed levels while five named troublemakers try to box her in.

## Starting Scope

- Browser game.
- Keyboard controls.
- One original maze for the first version.
- Ten level configs that scale speed, color, and vulnerability timing.
- Five ghosts with named personalities.
- Ghost-sweep round win: eating each ghost at least once in one level immediately clears the round.
- Yellow power cans with blue writing.
- Faux-3D Becca head animation with a direction-aware chomping mouth.
- First bad ghost hit after collecting a yellow can triggers a one-time 5-second hypno-rainbow save.
- Txt-file-backed top-10 leaderboard with name submission after a run ends.
- Collapsible side menu explaining objective, rules, and leaderboard.
- Persistent top-right version badge.
- Replaceable Becca head image.
- Procedural arcade sound effects with a persistent Sound On/Off toggle.

## Level Set

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

PacBecca synthesizes short arcade sound effects in the browser with Web Audio instead of shipping audio files. Pickups use small chirps, power events use bigger rising sweeps, ghost hits use sharper stingers, and round-ending states use short fanfares. The page chrome exposes a Sound On/Off toggle, and the preference is stored in browser-local storage.
