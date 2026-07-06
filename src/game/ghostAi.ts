import { DIRECTION_VECTORS } from "./maze";
import { Direction, GhostConfig, GridPoint } from "./types";

export interface TargetContext {
  playerTile: GridPoint;
  playerDirection: Direction;
  leadHunterTile: GridPoint;
  boardCenter: GridPoint;
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
        x: ahead.x + (ahead.x - context.leadHunterTile.x),
        y: ahead.y + (ahead.y - context.leadHunterTile.y)
      };
    }
    case "drifter": {
      const distance = Math.hypot(
        ghostTile.x - context.playerTile.x,
        ghostTile.y - context.playerTile.y
      );
      return distance > 7 ? context.playerTile : ghost.scatterTarget;
    }
    case "interceptor": {
      const horizontalPressure = Math.abs(context.playerTile.x - context.boardCenter.x);
      const verticalPressure = Math.abs(context.playerTile.y - context.boardCenter.y);
      return horizontalPressure >= verticalPressure
        ? { x: context.playerTile.x, y: context.boardCenter.y }
        : { x: context.boardCenter.x, y: context.playerTile.y };
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
