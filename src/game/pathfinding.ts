import {
  DIRECTIONS,
  neighborInDirection,
  oppositeDirection,
  squaredDistance,
  walkableDirections
} from "./maze";
import { Direction, GridPoint, MazeModel } from "./types";

export function chooseTurnTowardTarget(
  maze: MazeModel,
  from: GridPoint,
  currentDirection: Direction,
  target: GridPoint,
  allowReverse = false
): Exclude<Direction, "none"> {
  const available = walkableDirections(maze, from);
  const reverse = oppositeDirection(currentDirection);
  const candidates =
    !allowReverse && available.length > 1
      ? available.filter((direction) => direction !== reverse)
      : available;

  const ordered = candidates.length > 0 ? candidates : available;
  if (ordered.length === 0) {
    return reverse === "none" ? "left" : (reverse as Exclude<Direction, "none">);
  }

  return ordered
    .map((direction) => ({
      direction,
      score: squaredDistance(neighborInDirection(from, direction), target),
      tieBreaker: DIRECTIONS.indexOf(direction)
    }))
    .sort((a, b) => a.score - b.score || a.tieBreaker - b.tieBreaker)[0]
    .direction;
}

export function chooseRandomTurn(
  maze: MazeModel,
  from: GridPoint,
  currentDirection: Direction,
  random: () => number
): Exclude<Direction, "none"> {
  const available = walkableDirections(maze, from);
  const reverse = oppositeDirection(currentDirection);
  const candidates =
    available.length > 1
      ? available.filter((direction) => direction !== reverse)
      : available;
  const pickFrom = candidates.length > 0 ? candidates : available;

  if (pickFrom.length === 0) {
    return reverse === "none" ? "left" : (reverse as Exclude<Direction, "none">);
  }

  return pickFrom[Math.floor(random() * pickFrom.length)];
}
