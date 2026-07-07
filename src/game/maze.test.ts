import { describe, expect, it } from "vitest";
import { BASE_MAZE, EARLY_POWER_MAZE, GHOSTS, LEVELS } from "./config";
import { keyOf, parseMaze, walkableDirections } from "./maze";

function countPowerCans(rows: string[]): number {
  return [...parseMaze(rows).pickups.values()].filter((kind) => kind === "power").length;
}

describe("PacBecca maze config", () => {
  it("has 10 playable level records", () => {
    expect(LEVELS).toHaveLength(10);
    expect(LEVELS.map((level) => level.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
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

  it("doubles yellow power cans on levels 1 through 3 only", () => {
    expect(countPowerCans(BASE_MAZE)).toBe(4);
    expect(countPowerCans(EARLY_POWER_MAZE)).toBe(8);
    expect(LEVELS.map((level) => countPowerCans(level.rows))).toEqual([
      8,
      8,
      8,
      4,
      4,
      4,
      4,
      4,
      4,
      4
    ]);
  });

  it("keeps every pickup reachable from Becca's start", () => {
    LEVELS.forEach((level) => {
      const maze = parseMaze(level.rows);
      const queue = [maze.playerStart];
      const visited = new Set([keyOf(maze.playerStart)]);

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

      maze.pickups.forEach((_kind, key) => {
        expect(visited.has(key), `level ${level.id} pickup ${key} should be reachable`).toBe(true);
      });
    });
  });
});
