import { describe, expect, it } from "vitest";

import { shanten, waits } from "./shanten";
import { analyzeStandardUkeire } from "./ukeire";
import type { Tile } from "./types";

const tenpaiHand: Tile[] = [
  "1m",
  "2m",
  "3m",
  "1p",
  "2p",
  "3p",
  "1s",
  "2s",
  "3s",
  "8s",
  "9s",
  "7z",
  "7z",
];

describe("shared Mahjong rules", () => {
  it("computes shanten and waits from the core module", () => {
    expect(shanten(tenpaiHand)).toBe(0);
    expect(waits(tenpaiHand)).toEqual(["7s"]);
  });

  it("preserves standard ukeire discard analysis", () => {
    const analysis = analyzeStandardUkeire([...tenpaiHand, "1z"]);
    expect(analysis.discards).toContainEqual({
      tile: "1z",
      draws: [{ tile: "7s", remaining: 4 }],
      total: 4,
    });
  });
});
