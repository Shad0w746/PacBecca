# Technical Research: Classic Maze-Chase Lessons

This file captures the implementation lessons worth borrowing for PacBecca without copying protected Pac-Man expression.

## Core Elements

- The original game is tile-based: movement, turns, pickups, enemy decisions, and collision all work best when the board is modeled as a grid.
- The maze-chase loop is simple but expressive: collect all pickups, avoid enemies, use temporary role reversal from power pickups, and escalate difficulty over levels.
- Ghost behavior feels intelligent because each enemy computes a target tile differently, then uses the same simple turn-selection logic to move toward that target.
- Ghosts alternate between broad modes: chase, scatter, and vulnerable/frightened states.
- Difficulty can scale through speed, shorter vulnerability windows, release timing, and more aggressive chase timing.
- Player feel depends heavily on queued turns. PacBecca should let players press the next direction before arriving at an intersection.

## Ghost AI Pattern

PacBecca's five ghosts use original names and presentation, but the technical pattern is inspired by target-tile design:

- Frosty targets Becca directly.
- Megasen targets several tiles ahead of Becca.
- Aspyn uses Frosty's position and Becca's heading to create a flank target.
- Smeag targets Becca from far away but retreats toward a corner when close.
- Captain targets center-lane intercept points based on Becca's position.

The pathfinding is intentionally simple: at intersections, a ghost chooses the legal direction whose next tile is closest to its current target. That keeps behavior readable and tunable.

## PacBecca Rule Changes

- Becca Burst: collecting pellets/hearts fills a meter; Space makes ghosts vulnerable briefly.
- Yellow power cans: blue-lettered pickups that make ghosts vulnerable.
- Hearts: bonus pickups that accelerate the Burst meter.
- Ten-level campaign: each level gets a title, palette, speed settings, and vulnerability timing.
- Original maze: PacBecca uses a new board layout, new colors, new ghost presentation, and a replaceable Becca avatar.

## Sources

- Jamey Pittman, "The Pac-Man Dossier" on Game Developer: https://www.gamedeveloper.com/design/the-pac-man-dossier
- "The Pac-Man Dossier" PDF mirror, especially ghost modes, target tiles, speeds, and turning: https://cs.au.dk/~ocaprani/GameAI/PacMan/The%20Pac-Man%20Dossier.pdf
- Atari, Inc. v. North American Philips Consumer Electronics Corp., 672 F.2d 607 (7th Cir. 1982): https://law.justia.com/cases/federal/appellate-courts/F2/672/607/331150/
