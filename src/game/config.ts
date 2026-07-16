import { GhostConfig, GridPoint, LevelConfig } from "./types";

const appBaseUrl = import.meta.env.BASE_URL;

function assetPath(path: string): string {
  const baseUrl = appBaseUrl.endsWith("/") ? appBaseUrl : `${appBaseUrl}/`;
  return `${baseUrl}${path.replace(/^\/+/, "")}`;
}

export const GAME_TITLE = "PacBecca";
export const AVATAR_ASSET_PATH = assetPath("assets/becca-head.png");
export const AVATAR_SHEET_ASSET_PATH = assetPath("assets/becca-head-sheet.png");
export const AVATAR_FRAME_SIZE = 512;
export const AVATAR_FRAME_COUNT = 6;
export const RAGE_SCREENSHOT_ASSET_PATHS = [
  assetPath("assets/rage/brazy-becca-rage-1.jpg"),
  assetPath("assets/rage/brazy-becca-rage-2.jpg"),
  assetPath("assets/rage/brazy-becca-rage-3.jpg"),
  assetPath("assets/rage/brazy-becca-rage-4.jpg"),
  assetPath("assets/rage/brazy-becca-rage-5.jpg")
];
export const RAGE_SCREENSHOT_KEYS = RAGE_SCREENSHOT_ASSET_PATHS.map(
  (_path, index) => `brazy-becca-rage-${index + 1}`
);
export const WRONG_WAY_HYPNO_DURATION_MS = 5000;
export const BRAZY_RAGE_SPLASH_DURATION_MS = 3000;
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
  "#.....#..12345..#.....#.#",
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

const earlyLevelExtraPowerCanTiles: GridPoint[] = [
  { x: 3, y: 5 },
  { x: 21, y: 5 },
  { x: 3, y: 15 },
  { x: 21, y: 15 }
];

type MazeTileChange = [x: number, y: number, tile: string];

const requiredStartTileChanges: MazeTileChange[] = [
  [9, 9, "1"],
  [10, 9, "2"],
  [11, 9, "3"],
  [12, 9, "4"],
  [13, 9, "5"],
  [11, 21, "B"]
];

function horizontalTileChanges(y: number, startX: number, endX: number, tile: string): MazeTileChange[] {
  return Array.from({ length: endX - startX + 1 }, (_value, index) => [
    startX + index,
    y,
    tile
  ]);
}

function verticalTileChanges(x: number, startY: number, endY: number, tile: string): MazeTileChange[] {
  return Array.from({ length: endY - startY + 1 }, (_value, index) => [
    x,
    startY + index,
    tile
  ]);
}

function addPowerCans(rows: string[], tiles: GridPoint[]): string[] {
  return rows.map((row, y) => {
    const chars = [...row];
    tiles
      .filter((tile) => tile.y === y)
      .forEach((tile) => {
        chars[tile.x] = "o";
      });
    return chars.join("");
  });
}

function applyMazeTileChanges(rows: string[], changes: MazeTileChange[]): string[] {
  const nextRows = rows.map((row) => [...row]);
  changes.forEach(([x, y, tile]) => {
    nextRows[y][x] = tile;
  });
  return nextRows.map((row) => row.join(""));
}

function makeLevelMaze(changes: MazeTileChange[], includeEarlyPowerCans = false): string[] {
  const changedRows = applyMazeTileChanges(BASE_MAZE, changes);
  const rows = includeEarlyPowerCans
    ? addPowerCans(changedRows, earlyLevelExtraPowerCanTiles)
    : changedRows;
  return applyMazeTileChanges(rows, requiredStartTileChanges);
}

export const EARLY_POWER_MAZE = addPowerCans(BASE_MAZE, earlyLevelExtraPowerCanTiles);

export const LEVEL_MAZES = [
  EARLY_POWER_MAZE,
  makeLevelMaze(
    [
      ...verticalTileChanges(12, 1, 8, "."),
      ...verticalTileChanges(12, 10, 20, "."),
      ...horizontalTileChanges(5, 8, 16, "."),
      ...horizontalTileChanges(15, 8, 16, "."),
      [12, 4, "."],
      [12, 6, "."],
      [12, 8, "."],
      [12, 14, "."],
      [12, 16, "."],
      [12, 18, "."],
      [4, 3, "#"],
      [20, 3, "#"],
      [4, 17, "#"],
      [20, 17, "#"],
      [11, 5, "o"],
      [13, 15, "o"]
    ],
    true
  ),
  makeLevelMaze(
    [
      ...horizontalTileChanges(10, 1, 23, "."),
      ...horizontalTileChanges(12, 1, 23, "."),
      ...verticalTileChanges(6, 4, 16, "."),
      ...verticalTileChanges(18, 4, 16, "."),
      [6, 4, "."],
      [18, 4, "."],
      [6, 16, "."],
      [18, 16, "."],
      [10, 10, "."],
      [14, 10, "."],
      [10, 12, "."],
      [14, 12, "."],
      [3, 9, "#"],
      [21, 9, "#"],
      [3, 13, "#"],
      [21, 13, "#"],
      [11, 7, "o"],
      [13, 13, "o"]
    ],
    true
  ),
  makeLevelMaze([
    ...horizontalTileChanges(3, 2, 22, "."),
    ...horizontalTileChanges(17, 2, 22, "."),
    ...verticalTileChanges(9, 3, 19, "."),
    ...verticalTileChanges(15, 3, 19, "."),
    [9, 2, "."],
    [10, 2, "."],
    [14, 2, "."],
    [15, 2, "."],
    [9, 18, "."],
    [10, 18, "."],
    [14, 18, "."],
    [15, 18, "."],
    [6, 9, "."],
    [18, 9, "."],
    [6, 11, "."],
    [18, 11, "."],
    [6, 13, "."],
    [18, 13, "."],
    [5, 5, "#"],
    [19, 5, "#"],
    [5, 15, "#"],
    [19, 15, "#"],
    [3, 1, "h"],
    [21, 19, "h"]
  ]),
  makeLevelMaze([
    ...horizontalTileChanges(5, 1, 23, "."),
    ...horizontalTileChanges(15, 1, 23, "."),
    ...verticalTileChanges(3, 3, 17, "."),
    ...verticalTileChanges(21, 3, 17, "."),
    [8, 4, "."],
    [16, 4, "."],
    [8, 16, "."],
    [16, 16, "."],
    [12, 2, "."],
    [12, 18, "."],
    [12, 20, "."],
    [2, 7, "#"],
    [22, 7, "#"],
    [2, 13, "#"],
    [22, 13, "#"],
    [5, 3, "#"],
    [19, 3, "#"],
    [5, 17, "#"],
    [19, 17, "#"],
    [11, 5, "o"],
    [13, 15, "o"],
    [7, 5, "o"],
    [17, 15, "o"]
  ]),
  makeLevelMaze([
    ...horizontalTileChanges(7, 2, 22, "."),
    ...horizontalTileChanges(13, 2, 22, "."),
    ...verticalTileChanges(5, 2, 18, "."),
    ...verticalTileChanges(19, 2, 18, "."),
    [5, 2, "."],
    [19, 2, "."],
    [5, 18, "."],
    [19, 18, "."],
    [3, 4, "."],
    [21, 4, "."],
    [3, 16, "."],
    [21, 16, "."],
    [8, 10, "."],
    [16, 10, "."],
    [8, 12, "."],
    [16, 12, "."],
    [12, 5, "#"],
    [12, 15, "#"],
    [11, 3, "o"],
    [13, 17, "o"]
  ]),
  makeLevelMaze([
    ...horizontalTileChanges(9, 1, 23, "."),
    ...horizontalTileChanges(11, 1, 23, "."),
    ...verticalTileChanges(10, 2, 18, "."),
    ...verticalTileChanges(14, 2, 18, "."),
    [2, 2, "."],
    [22, 2, "."],
    [2, 18, "."],
    [22, 18, "."],
    [6, 8, "."],
    [18, 8, "."],
    [6, 12, "."],
    [18, 12, "."],
    [10, 6, "."],
    [14, 6, "."],
    [10, 14, "."],
    [14, 14, "."],
    [5, 7, "#"],
    [19, 7, "#"],
    [5, 13, "#"],
    [19, 13, "#"],
    [3, 19, "h"],
    [21, 1, "h"]
  ]),
  makeLevelMaze([
    ...horizontalTileChanges(4, 2, 22, "."),
    ...horizontalTileChanges(16, 2, 22, "."),
    ...verticalTileChanges(8, 2, 18, "."),
    ...verticalTileChanges(16, 2, 18, "."),
    [4, 2, "."],
    [20, 2, "."],
    [4, 18, "."],
    [20, 18, "."],
    [8, 6, "."],
    [16, 6, "."],
    [8, 14, "."],
    [16, 14, "."],
    [12, 4, "."],
    [12, 16, "."],
    [7, 9, "#"],
    [17, 9, "#"],
    [7, 13, "#"],
    [17, 13, "#"],
    [10, 5, "o"],
    [14, 15, "o"]
  ]),
  makeLevelMaze([
    ...horizontalTileChanges(6, 1, 23, "."),
    ...horizontalTileChanges(14, 1, 23, "."),
    ...verticalTileChanges(11, 2, 8, "."),
    ...verticalTileChanges(13, 12, 20, "."),
    [6, 2, "."],
    [18, 2, "."],
    [6, 18, "."],
    [18, 18, "."],
    [9, 4, "."],
    [15, 4, "."],
    [9, 16, "."],
    [15, 16, "."],
    [11, 10, "."],
    [13, 10, "."],
    [11, 12, "."],
    [13, 12, "."],
    [5, 1, "#"],
    [19, 1, "#"],
    [5, 19, "#"],
    [19, 19, "#"],
    [2, 5, "h"],
    [22, 15, "h"]
  ]),
  makeLevelMaze([
    ...horizontalTileChanges(2, 1, 23, "."),
    ...horizontalTileChanges(18, 1, 23, "."),
    ...verticalTileChanges(7, 2, 20, "."),
    ...verticalTileChanges(17, 2, 20, "."),
    [3, 2, "."],
    [21, 2, "."],
    [3, 18, "."],
    [21, 18, "."],
    [7, 4, "."],
    [17, 4, "."],
    [7, 16, "."],
    [17, 16, "."],
    [10, 8, "."],
    [14, 8, "."],
    [10, 12, "."],
    [14, 12, "."],
    [4, 5, "#"],
    [20, 5, "#"],
    [4, 15, "#"],
    [20, 15, "#"],
    [12, 3, "o"],
    [12, 17, "o"]
  ])
];

export const GHOSTS: GhostConfig[] = [
  {
    id: "1",
    name: "Frosty",
    personality: "hunter",
    color: 0xf05252,
    accent: 0xffcdd2,
    scatterTarget: { x: 23, y: 1 },
    releaseDelayMs: 0
  },
  {
    id: "2",
    name: "Megasen",
    personality: "ambusher",
    color: 0xf472b6,
    accent: 0xffe4f2,
    scatterTarget: { x: 1, y: 1 },
    releaseDelayMs: 1200
  },
  {
    id: "3",
    name: "Aspyn",
    personality: "flanker",
    color: 0x38bdf8,
    accent: 0xdff8ff,
    scatterTarget: { x: 23, y: 21 },
    releaseDelayMs: 2600
  },
  {
    id: "4",
    name: "Smeag",
    personality: "drifter",
    color: 0xfbbf24,
    accent: 0xfff3c4,
    scatterTarget: { x: 1, y: 21 },
    releaseDelayMs: 4200
  },
  {
    id: "5",
    name: "Captain",
    personality: "interceptor",
    color: 0x34d399,
    accent: 0xeafff6,
    scatterTarget: { x: 12, y: 1 },
    releaseDelayMs: 5400
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
  "Aspyn Hour",
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
    rows: LEVEL_MAZES[index],
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
