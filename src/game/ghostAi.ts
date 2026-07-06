import { DIRECTION_VECTORS } from "./maze";
import { Direction, GhostConfig, GridPoint } from "./types";

export interface TargetContext {
  playerTile: GridPoint;
  playerDirection: Direction;
  riffTile: GridPoint;
}

export function targetForGhost(
  ghost: GhostConfig,
  ghostTile: GridPoint,
  context: TargetContext
): GridPoint {
  switch (ghost.personality) {
    case "hunter":
      return context.playerTile;
    case "ambusher":
      return aheadOfPlayer(context.playerTile, context.playerDirection, 4);
    case "flanker": {
      const ahead = aheadOfPlayer(context.playerTile, context.playerDirection, 2);
      return {
        x: ahead.x + (ahead.x - context.riffTile.x),
        y: ahead.y + (ahead.y - context.riffTile.y)
      };
    }
    case "drifter": {
      const distance = Math.hypot(
        ghostTile.x - context.playerTile.x,
        ghostTile.y - context.playerTile.y
      );
      return distance > 7 ? context.playerTile : ghost.scatterTarget;
    }
  }
}

function aheadOfPlayer(
  playerTile: GridPoint,
  direction: Direction,
  tilesAhead: number
): GridPoint {
  const vector = DIRECTION_VECTORS[direction === "none" ? "left" : direction];
  return {
    x: playerTile.x + vector.x * tilesAhead,
    y: playerTile.y + vector.y * tilesAhead
  };
}
