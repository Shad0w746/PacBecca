import { describe, expect, it } from "vitest";
import {
  formatLeaderboardText,
  parseLeaderboardText,
  rankLeaderboardEntries,
  sanitizeName,
  type LeaderboardEntry
} from "./leaderboard";

function entry(name: string, score: number, createdAt: string): LeaderboardEntry {
  return {
    name,
    score,
    level: 1,
    won: false,
    createdAt
  };
}

describe("leaderboard", () => {
  it("keeps only the top 10 scores", () => {
    const entries = Array.from({ length: 12 }, (_, index) =>
      entry(`P${index}`, index * 100, `2026-07-06T17:${String(index).padStart(2, "0")}:00.000Z`)
    );

    const ranked = rankLeaderboardEntries(entries);

    expect(ranked).toHaveLength(10);
    expect(ranked[0].score).toBe(1100);
    expect(ranked[9].score).toBe(200);
  });

  it("uses older submissions first when scores tie", () => {
    const ranked = rankLeaderboardEntries([
      entry("New", 500, "2026-07-06T17:02:00.000Z"),
      entry("Old", 500, "2026-07-06T17:01:00.000Z")
    ]);

    expect(ranked.map((item) => item.name)).toEqual(["Old", "New"]);
  });

  it("sanitizes empty and long names", () => {
    expect(sanitizeName("   ")).toBe("Player");
    expect(sanitizeName("  Becca   Champion  Forever  ")).toBe("Becca Champion");
  });

  it("parses leaderboard.txt rows", () => {
    const parsed = parseLeaderboardText(`name\tscore\tlevel\twon\tcreatedAt
Old\t500\t3\tfalse\t2026-07-06T17:01:00.000Z
Winner\t1200\t10\ttrue\t2026-07-06T17:02:00.000Z
`);

    expect(parsed.map((item) => item.name)).toEqual(["Winner", "Old"]);
    expect(parsed[0]).toMatchObject({ score: 1200, level: 10, won: true });
  });

  it("formats leaderboard entries as txt rows", () => {
    const text = formatLeaderboardText([entry("Old", 500, "2026-07-06T17:01:00.000Z")]);

    expect(text).toBe(
      "name\tscore\tlevel\twon\tcreatedAt\nOld\t500\t1\tfalse\t2026-07-06T17:01:00.000Z\n"
    );
  });
});
