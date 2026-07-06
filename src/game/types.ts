export type Direction = "up" | "down" | "left" | "right" | "none";

export type PickupKind = "pellet" | "power" | "heart";

export type GhostMood = "normal" | "frightened" | "stunned" | "eaten";

export type GlobalGhostMode = "scatter" | "chase";

export type GhostPersonality =
  | "hunter"
  | "ambusher"
  | "flanker"
  | "drifter"
  | "interceptor";

export interface GridPoint {
  x: number;
  y: number;
}

export interface MazeModel {
  width: number;
  height: number;
  rows: string[];
  playerStart: GridPoint;
  ghostStarts: Record<string, GridPoint>;
  pickups: Map<string, PickupKind>;
  walls: Set<string>;
}

export interface GhostConfig {
  id: string;
  name: string;
  personality: GhostPersonality;
  color: number;
  accent: number;
  scatterTarget: GridPoint;
  releaseDelayMs: number;
}

export interface LevelConfig {
  id: number;
  title: string;
  rows: string[];
  palette: {
    wall: number;
    wallAccent: number;
    floor: number;
    pellet: number;
    power: number;
    heart: number;
  };
  playerTilesPerSecond: number;
  ghostTilesPerSecond: number;
  frightenedTilesPerSecond: number;
  frightenedDurationMs: number;
  burstDurationMs: number;
  modeTimeline: Array<{ mode: GlobalGhostMode; durationMs: number }>;
}
