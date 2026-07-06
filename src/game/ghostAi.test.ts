import { describe, expect, it } from "vitest";
import { GHOSTS } from "./config";
import { targetForGhost } from "./ghostAi";

describe("ghost personalities", () => {
  const context = {
    playerTile: { x: 10, y: 10 },
    playerDirection: "right" as const,
    riffTile: { x: 6, y: 10 }
  };

  it("gives each ghost a distinct chase target style", () => {
    const targets = Object.fromEntries(
      GHOSTS.map((ghost) => [
        ghost.name,
        targetForGhost(ghost, { x: 8, y: 8 }, context)
      ])
    );

    expect(targets.Riff).toEqual({ x: 10, y: 10 });
    expect(targets.Pippa).toEqual({ x: 14, y: 10 });
    expect(targets.Orbit).toEqual({ x: 18, y: 10 });
    expect(targets.Moxie).toEqual(GHOSTS[3].scatterTarget);
  });
});
