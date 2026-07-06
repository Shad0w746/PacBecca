import { describe, expect, it } from "vitest";
import { GHOSTS } from "./config";
import { targetForGhost } from "./ghostAi";

describe("ghost personalities", () => {
  const context = {
    playerTile: { x: 10, y: 10 },
    playerDirection: "right" as const,
    leadHunterTile: { x: 6, y: 10 },
    boardCenter: { x: 12, y: 11 }
  };

  it("gives each ghost a distinct chase target style", () => {
    const targets = Object.fromEntries(
      GHOSTS.map((ghost) => [
        ghost.name,
        targetForGhost(ghost, { x: 8, y: 8 }, context)
      ])
    );

    expect(targets.Frosty).toEqual({ x: 10, y: 10 });
    expect(targets.Megasen).toEqual({ x: 14, y: 10 });
    expect(targets.Aspyn).toEqual({ x: 18, y: 10 });
    expect(targets.Smeag).toEqual(GHOSTS[3].scatterTarget);
    expect(targets.Captain).toEqual({ x: 10, y: 11 });
  });
});
