import { GhostConfig, GridPoint, LevelConfig } from "./types";

export const GAME_TITLE = "PacBecca";
export const AVATAR_ASSET_PATH = "/assets/becca-head.svg";
export const BOARD_OFFSET: GridPoint = { x: 32, y: 64 };
export const BURST_METER_MAX = 100;

export const BASE_MAZE = [
  "#########################",
  "#o....#.....#.....#....o#",
  "#.##..#.###.#.###.#..##.#",
  "#.....#.....#.....#.....#",
  "###.#####.#.#.#.#####.###",
  "#...#.....#...#.....#...#",
  "#.#.#.###.#####.###.#.#.#",
  "#.#...#....h....#...#.#.#",
  "#.###.#.#######.#.###.#.#",
  "#.....#...1234..#.....#.#",
  "###.#.###.###.###.#.###.#",
  "#...#.....# #.....#...#.#",
  "#.###.#.#######.#.###.#.#",
  "#.#...#....h....#...#.#.#",
  "#.#.#.###.#####.###.#.#.#",
  "#...#.....#...#.....#...#",
  "###.#####.#.#.#.#####.###",
  "#.....#.....#.....#.....#",
  "#.##..#.###.#.###.#..##.#",
  "#o....#.....#.....#....o#",
  "#.#####.###.#.###.#####.#",
  "#h.........B...........h#",
  "#########################"
];

export const GHOSTS: GhostConfig[] = [
  {
    id: "1",
    name: "Riff",
    personality: "hunter",
    color: 0xf05252,
    accent: 0xffcdd2,
    scatterTarget: { x: 23, y: 1 },
    releaseDelayMs: 0
  },
  {
    id: "2",
    name: "Pippa",
    personality: "ambusher",
    color: 0xf472b6,
    accent: 0xffe4f2,
    scatterTarget: { x: 1, y: 1 },
    releaseDelayMs: 1200
  },
  {
    id: "3",
    name: "Orbit",
    personality: "flanker",
    color: 0x38bdf8,
    accent: 0xdff8ff,
    scatterTarget: { x: 23, y: 21 },
    releaseDelayMs: 2600
  },
  {
    id: "4",
    name: "Moxie",
    personality: "drifter",
    color: 0xfbbf24,
    accent: 0xfff3c4,
    scatterTarget: { x: 1, y: 21 },
    releaseDelayMs: 4200
  }
];

const modeTimeline = [
  { mode: "scatter" as const, durationMs: 7000 },
  { mode: "chase" as const, durationMs: 18000 },
  { mode: "scatter" as const, durationMs: 6000 },
  { mode: "chase" as const, durationMs: 20000 },
  { mode: "scatter" as const, durationMs: 5000 },
  { mode: "chase" as const, durationMs: Number.POSITIVE_INFINITY }
];

const palettes = [
  [0x335c67, 0xf4c95d, 0x111827, 0xf5f7fa, 0xff6b6b, 0xf472b6],
  [0x4d7c0f, 0xa7f3d0, 0x101820, 0xf8fafc, 0x5eead4, 0xfb7185],
  [0x7c3aed, 0xfde68a, 0x171320, 0xf8fafc, 0xc4b5fd, 0xf9a8d4],
  [0x0f766e, 0xf97316, 0x111827, 0xf8fafc, 0x99f6e4, 0xfda4af],
  [0xb45309, 0x67e8f9, 0x15120d, 0xfffbeb, 0xfacc15, 0xf0abfc],
  [0x2563eb, 0xfef08a, 0x0b1020, 0xf8fafc, 0x93c5fd, 0xfb7185],
  [0xbe123c, 0x86efac, 0x160f14, 0xfff7ed, 0xfda4af, 0xbbf7d0],
  [0x047857, 0xf9a8d4, 0x07130f, 0xecfeff, 0x6ee7b7, 0xf0abfc],
  [0x6d28d9, 0xfdba74, 0x100b18, 0xfefce8, 0xc084fc, 0xfde68a],
  [0x0891b2, 0xfb7185, 0x061219, 0xf8fafc, 0x67e8f9, 0xf9a8d4]
];

const titles = [
  "Porch Practice",
  "Glitter Hall",
  "Left Turn Energy",
  "Snack Dash",
  "Orbit Hour",
  "The Group Chat",
  "Corner Confidence",
  "Afterparty Loop",
  "Close Call Club",
  "Becca Mode"
];

export const LEVELS: LevelConfig[] = Array.from({ length: 10 }, (_, index) => {
  const [wall, wallAccent, floor, pellet, power, heart] = palettes[index];
  const id = index + 1;
  return {
    id,
    title: titles[index],
    rows: BASE_MAZE,
    palette: {
      wall,
      wallAccent,
      floor,
      pellet,
      power,
      heart
    },
    playerTilesPerSecond: 7.4 + index * 0.08,
    ghostTilesPerSecond: 6.2 + index * 0.22,
    frightenedTilesPerSecond: 4.4 + index * 0.08,
    frightenedDurationMs: Math.max(2600, 7200 - index * 460),
    burstDurationMs: Math.max(1600, 3200 - index * 140),
    modeTimeline
  };
});
