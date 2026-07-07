import { describe, expect, it } from "vitest";
import { isRearContact } from "./collision";

describe("rear ghost contact", () => {
  it("detects a rear hit behind a left-facing ghost", () => {
    expect(
      isRearContact({
        attacker: { x: 112, y: 101 },
        target: { x: 100, y: 100 },
        targetFacing: "left"
      })
    ).toBe(true);
  });

  it("rejects a front hit on a left-facing ghost", () => {
    expect(
      isRearContact({
        attacker: { x: 88, y: 100 },
        target: { x: 100, y: 100 },
        targetFacing: "left"
      })
    ).toBe(false);
  });

  it("rejects side contact that is not close to the rear lane", () => {
    expect(
      isRearContact({
        attacker: { x: 112, y: 118 },
        target: { x: 100, y: 100 },
        targetFacing: "left"
      })
    ).toBe(false);
  });

  it("detects rear hits for vertical facings", () => {
    expect(
      isRearContact({
        attacker: { x: 102, y: 112 },
        target: { x: 100, y: 100 },
        targetFacing: "up"
      })
    ).toBe(true);
    expect(
      isRearContact({
        attacker: { x: 102, y: 88 },
        target: { x: 100, y: 100 },
        targetFacing: "up"
      })
    ).toBe(false);
  });
});
