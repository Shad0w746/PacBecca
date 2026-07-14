import { describe, expect, it } from "vitest";
import { hasCompletedGhostSweep } from "./ghostSweep";

describe("ghost sweep win rule", () => {
  const ghostIds = ["Frosty", "Megasen", "Aspyn", "Smeag", "Captain"] as const;

  it("requires every ghost to be eaten at least once", () => {
    expect(
      hasCompletedGhostSweep(new Set(["Frosty", "Megasen", "Aspyn", "Smeag"]), ghostIds)
    ).toBe(false);

    expect(hasCompletedGhostSweep(new Set(ghostIds), ghostIds)).toBe(true);
  });

  it("does not count repeat eats as missing ghosts", () => {
    const eatenGhostIds = new Set(["Frosty", "Frosty", "Megasen", "Megasen", "Aspyn"]);

    expect(hasCompletedGhostSweep(eatenGhostIds, ghostIds)).toBe(false);

    eatenGhostIds.add("Smeag");
    eatenGhostIds.add("Captain");
    expect(hasCompletedGhostSweep(eatenGhostIds, ghostIds)).toBe(true);
  });
});
