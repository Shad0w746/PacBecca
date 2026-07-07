import { DIRECTION_VECTORS, oppositeDirection } from "./maze";
import { Direction } from "./types";

interface CenterPoint {
  x: number;
  y: number;
}

interface RearContactInput {
  attacker: CenterPoint;
  target: CenterPoint;
  targetFacing: Exclude<Direction, "none">;
  minRearOffset?: number;
  maxSideOffset?: number;
}

const DEFAULT_MIN_REAR_OFFSET = 4;
const DEFAULT_MAX_SIDE_OFFSET = 13;

export function isRearContact({
  attacker,
  target,
  targetFacing,
  minRearOffset = DEFAULT_MIN_REAR_OFFSET,
  maxSideOffset = DEFAULT_MAX_SIDE_OFFSET
}: RearContactInput): boolean {
  const rearDirection = oppositeDirection(targetFacing) as Exclude<Direction, "none">;
  const rearVector = DIRECTION_VECTORS[rearDirection];
  const dx = attacker.x - target.x;
  const dy = attacker.y - target.y;
  const rearOffset = dx * rearVector.x + dy * rearVector.y;
  const sideOffset = Math.abs(rearVector.x === 0 ? dx : dy);

  return rearOffset >= minRearOffset && sideOffset <= maxSideOffset;
}
