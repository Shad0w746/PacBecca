import { describe, expect, it } from "vitest";
import { BASE_MAZE, GHOSTS, LEVELS } from "./config";
import { keyOf, parseMaze, walkableDirections } from "./maze";

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

  it("keeps every pickup reachable from Becca's start", () => {
    const maze = parseMaze(BASE_MAZE);
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
      expect(visited.has(key), `pickup ${key} should be reachable`).toBe(true);
    });
  });
});
