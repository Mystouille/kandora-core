import { describe, expect, it } from "vitest";

import {
  buildUnseenTilePool,
  countInPool,
  type TilePoolInput,
} from "./tilePool";

function build(input: Partial<TilePoolInput> = {}) {
  return buildUnseenTilePool({
    hand: [],
    ...input,
  });
}

describe("buildUnseenTilePool", () => {
  it("subtracts the hand, visible tiles, and revealed indicators", () => {
    const pool = build({
      hand: ["1m", "1m", "0m"],
      visibleTiles: ["2p", "2p"],
      doraIndicators: ["3s"],
    });

    expect(pool.total).toBe(130);
    expect(countInPool(pool, "1m")).toBe(2);
    expect(countInPool(pool, "0m")).toBe(0);
    expect(countInPool(pool, "5m")).toBe(3);
    expect(countInPool(pool, "2p")).toBe(2);
    expect(countInPool(pool, "3s")).toBe(3);
  });

  it("supports tables without red fives", () => {
    const pool = build({
      hand: ["5m", "5m", "5m", "5m"],
      redFives: { m: 0, p: 0, s: 0 },
    });

    expect(countInPool(pool, "5m")).toBe(0);
    expect(countInPool(pool, "0m")).toBe(0);
  });

  it("rejects a red five when that suit has no red copy", () => {
    expect(() =>
      build({ hand: ["0p"], redFives: { m: 0, p: 0, s: 0 } })
    ).toThrow(/0p.*available/i);
  });

  it("rejects more physical copies than the configured tile set", () => {
    expect(() => build({ hand: ["5s", "5s", "5s", "5s"] })).toThrow(
      /5s.*available/i
    );
  });

  it("rejects invalid tile notation", () => {
    expect(() => build({ visibleTiles: ["8z"] })).toThrow(
      /invalid tile notation/i
    );
  });
});
