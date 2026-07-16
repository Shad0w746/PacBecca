import { describe, expect, it } from "vitest";
import { BASE_MAZE, EARLY_POWER_MAZE, GHOSTS, LEVELS } from "./config";
import { keyOf, parseMaze, walkableDirections } from "./maze";
import type { GridPoint, MazeModel } from "./types";

function countPowerCans(rows: string[]): number {
  return [...parseMaze(rows).pickups.values()].filter((kind) => kind === "power").length;
}

describe("PacBecca maze config", () => {
  it("has 10 playable level records", () => {
    expect(LEVELS).toHaveLength(10);
    expect(LEVELS.map((level) => level.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it("uses a different maze layout for every level", () => {
    const uniqueLayouts = new Set(LEVELS.map((level) => level.rows.join("\n")));

    expect(uniqueLayouts.size).toBe(LEVELS.length);
  });

  it("makes every post-intro maze visibly different from the base layout", () => {
    LEVELS.slice(1).forEach((level) => {
      expect(
        countTileDifferences(BASE_MAZE, level.rows),
        `level ${level.id} should visibly change the maze`
      ).toBeGreaterThanOrEqual(24);
    });
  });

  it("parses the base maze with Becca, five ghosts, and pickups", () => {
    const maze = parseMaze(BASE_MAZE);

    expect(maze.width).toBe(25);
    expect(maze.height).toBe(23);
    expect(maze.pickups.size).toBeGreaterThan(120);
    expect(maze.playerStart).toEqual({ x: 11, y: 21 });
    GHOSTS.forEach((ghost) => {
      expect(maze.ghostStarts[ghost.id]).toBeDefined();
    });
  });

  it("gives the first three levels extra yellow power cans", () => {
    expect(countPowerCans(BASE_MAZE)).toBe(4);
    expect(countPowerCans(EARLY_POWER_MAZE)).toBe(8);
    expect(LEVELS.slice(0, 3).every((level) => countPowerCans(level.rows) >= 8)).toBe(true);
    expect(LEVELS.slice(3).every((level) => countPowerCans(level.rows) >= 4)).toBe(true);
  });

  it("keeps every pickup and ghost start reachable from Becca's start", () => {
    LEVELS.forEach((level) => {
      const maze = parseMaze(level.rows);
      const visited = reachableTiles(maze, maze.playerStart);

      maze.pickups.forEach((_kind, key) => {
        expect(visited.has(key), `level ${level.id} pickup ${key} should be reachable`).toBe(true);
      });

      GHOSTS.forEach((ghost) => {
        const ghostStart = maze.ghostStarts[ghost.id];
        expect(ghostStart, `level ${level.id} should have ghost ${ghost.id}`).toBeDefined();
        expect(
          visited.has(keyOf(ghostStart)),
          `level ${level.id} ghost ${ghost.id} should be reachable`
        ).toBe(true);
      });
    });
  });
});

function reachableTiles(maze: MazeModel, start: GridPoint): Set<string> {
  const queue = [start];
  const visited = new Set([keyOf(start)]);

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const direction of walkableDirections(maze, current)) {
      const next = {
        x: current.x + (direction === "left" ? -1 : direction === "right" ? 1 : 0),
        y: current.y + (direction === "up" ? -1 : direction === "down" ? 1 : 0)
      };
      const key = keyOf(next);
      if (!visited.has(key)) {
        visited.add(key);
        queue.push(next);
      }
    }
  }

  return visited;
}

function countTileDifferences(firstRows: string[], secondRows: string[]): number {
  let count = 0;
  firstRows.forEach((firstRow, y) => {
    [...firstRow].forEach((tile, x) => {
      if (secondRows[y][x] !== tile) {
        count += 1;
      }
    });
  });
  return count;
}
