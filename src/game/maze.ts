import { Direction, GridPoint, MazeModel, PickupKind } from "./types";

export const TILE_SIZE = 24;

export const DIRECTIONS: Exclude<Direction, "none">[] = [
  "up",
  "left",
  "down",
  "right"
];

export const DIRECTION_VECTORS: Record<Direction, GridPoint> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  none: { x: 0, y: 0 }
};

const PICKUP_BY_TILE: Record<string, PickupKind | undefined> = {
  ".": "pellet",
  o: "power",
  h: "heart"
};

export function keyOf(point: GridPoint): string {
  return `${point.x},${point.y}`;
}

export function addPoints(a: GridPoint, b: GridPoint): GridPoint {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function oppositeDirection(direction: Direction): Direction {
  switch (direction) {
    case "up":
      return "down";
    case "down":
      return "up";
    case "left":
      return "right";
    case "right":
      return "left";
    default:
      return "none";
  }
}

export function parseMaze(rows: string[]): MazeModel {
  if (rows.length === 0) {
    throw new Error("Maze must include at least one row.");
  }

  const width = rows[0].length;
  const walls = new Set<string>();
  const pickups = new Map<string, PickupKind>();
  const ghostStarts: Record<string, GridPoint> = {};
  let playerStart: GridPoint | undefined;

  rows.forEach((row, y) => {
    if (row.length !== width) {
      throw new Error(`Maze row ${y} has width ${row.length}; expected ${width}.`);
    }

    [...row].forEach((tile, x) => {
      const point = { x, y };
      if (tile === "#") {
        walls.add(keyOf(point));
        return;
      }

      const pickup = PICKUP_BY_TILE[tile];
      if (pickup) {
        pickups.set(keyOf(point), pickup);
      }

      if (tile === "B") {
        playerStart = point;
      }

      if (/^[1-9]$/.test(tile)) {
        ghostStarts[tile] = point;
      }
    });
  });

  if (!playerStart) {
    throw new Error("Maze must include a Becca start tile marked B.");
  }

  return {
    width,
    height: rows.length,
    rows,
    playerStart,
    ghostStarts,
    pickups,
    walls
  };
}

export function isInsideMaze(maze: MazeModel, point: GridPoint): boolean {
  return (
    point.x >= 0 &&
    point.y >= 0 &&
    point.x < maze.width &&
    point.y < maze.height
  );
}

export function isWalkable(maze: MazeModel, point: GridPoint): boolean {
  return isInsideMaze(maze, point) && !maze.walls.has(keyOf(point));
}

export function neighborInDirection(
  point: GridPoint,
  direction: Direction
): GridPoint {
  return addPoints(point, DIRECTION_VECTORS[direction]);
}

export function walkableDirections(
  maze: MazeModel,
  point: GridPoint
): Exclude<Direction, "none">[] {
  return DIRECTIONS.filter((direction) =>
    isWalkable(maze, neighborInDirection(point, direction))
  );
}

export function squaredDistance(a: GridPoint, b: GridPoint): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

export function toWorld(point: GridPoint, offset: GridPoint): GridPoint {
  return {
    x: offset.x + point.x * TILE_SIZE + TILE_SIZE / 2,
    y: offset.y + point.y * TILE_SIZE + TILE_SIZE / 2
  };
}

export function fromWorld(point: GridPoint, offset: GridPoint): GridPoint {
  return {
    x: Math.round((point.x - offset.x - TILE_SIZE / 2) / TILE_SIZE),
    y: Math.round((point.y - offset.y - TILE_SIZE / 2) / TILE_SIZE)
  };
}
