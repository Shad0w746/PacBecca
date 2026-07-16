# Changelog

## 0.5.4 - 2026-07-16

- Added a local production deployment helper that validates, builds with the GitHub Pages base path, pushes `main`, watches CI/Pages, and smoke-checks the live site.

## 0.5.3 - 2026-07-16

- Added a real start loading screen that stays visible while Phaser, Becca, and all rage images load.
- Kept rage screenshots in the up-front game preload so rage mode is ready before gameplay begins.

## 0.5.2 - 2026-07-16

- Added a simple looping background music layer during active gameplay.
- Added a brighter temporary power-mode music loop while ghosts are vulnerable or hypno mode is active.
- Made yellow-can pickup sounds more celebratory and paused music loops when the rules, leaderboard, or pause overlay is active.
- Lazy-loaded Phaser and the game scene so the heavier game code downloads only when play starts.
- Fixed game asset URLs so Becca and rage images load correctly from the GitHub Pages `/PacBecca/` base path.

## 0.5.1 - 2026-07-15

- Added procedural arcade sound effects for pickups, Becca Burst, ghost eats, hits, rage moments, level clears, victory, and game over.
- Added a persistent Sound On/Off control that can mute or re-enable audio during play.
- Documented the browser-local sound preference and added unit coverage for the sound preference helpers.

## 0.5.0 - 2026-07-15

- Standardized PacBecca project versioning on `MAJOR.MINOR.PATCH` format.
- Updated the top-right game badge to display the full project version, starting with `v0.5.0`.
- Added a version consistency check for production pushes and GitHub Pages deploys.
- Switched the Squarespace public page handoff to embed the GitHub Pages build.
- Removed generation of legacy password-page handoff files.

## 0.2.0 - 2026-07-06

- Added a deployable Cloudflare Worker scaffold for a global top-10 leaderboard backed by Cloudflare KV.
- Added `VITE_LEADERBOARD_API_URL` / `window.PACBECCA_LEADERBOARD_API_URL` support so the Squarespace build can use the hosted leaderboard API while local dev keeps the txt-file fallback.
- Added a start screen button so the game waits for user input after page load or refresh.
- Added `public/leaderboard.txt` as the leaderboard source and a local `/api/leaderboard` dev endpoint that writes submitted top-10 scores back to the txt file.
- Hardened leaderboard name entry so WASD keystrokes type into the name field instead of leaking into Phaser movement handling.
- Added a ghost-sweep rule: eating all five ghosts in a round immediately wins the round.
- Added a persistent lower-right reset button that can restart PacBecca from gameplay, game over, or the leaderboard screen.
- Added a flashing highlighted "Enter Restarts" prompt when a game ends.
- Added a browser-local top-10 leaderboard with name submission after a run ends.
- Fixed leaderboard name entry so WASD and Enter no longer leak into PacBecca controls.
- Added a randomized "BECCA RAGE" pause splash when the first powered wrong-way ghost hit triggers hypno mode.
- Added a one-time "BECCA RAGE" flash for the first ghost contact after collecting a power can.
- Doubled yellow power cans on levels 1 through 3.
- Added a fireworks-style color burst around PacBecca when she collects a yellow power can.
- Improved iframe responsiveness so PacBecca fits the embedded window without forced page scrolling.
- Added readable ghost name tags directly on the ghost NPCs.
- Added rear-contact ghost eating so PacBecca can send ghosts to respawn by touching them from behind.
- Added a collapsible side menu for the objective, rules, and leaderboard.
- Added a top-right game version badge.
- Added a one-time hypno-rainbow wrong-hit save after PacBecca collects a yellow can.
- Improved yellow power cans with clearer can body, pull tab, rims, seams, and label.
- Added a six-frame Becca sprite sheet built from all supplied Snagit references.
- Added faux-3D player head motion and a direction-aware chomping mouth.
- Replaced the placeholder Becca avatar with a transparent PNG cropped from the supplied Snagit images.
- Added clearer ghost facing details with directional eyes and front markers.
- Renamed and expanded the ghost roster to Frosty, Megasen, Aspyn, Smeag, and Captain.
- Added Captain as a fifth interceptor ghost.
- Changed power pickups into yellow cans with blue writing.

## 0.1.0 - 2026-07-06

- Created the PacBecca repo scaffold.
- Added a playable Phaser/TypeScript maze-chase prototype with 10 level records.
- Added original ghost names, target-tile personalities, and a replaceable Becca head asset.
- Added technical research, design, testing, and IP-boundary docs.
