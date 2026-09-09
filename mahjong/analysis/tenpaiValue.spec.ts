import { describe, expect, it } from "vitest";

import { Han } from "../../types/Han";
import { scoreClosedHand } from "./closedHandScore";
import {
  PHYSICAL_TILE_TYPES,
  cloneTilePool,
  physicalTileIndex,
  takeFromPool,
  type TilePool,
} from "./tilePool";
import {
  TSUMO_WIN_PROBABILITY,
  fixedWaitHitProbabilities,
  valueFixedTenpai,
} from "./tenpaiValue";
import type { Tile } from "../rules/types";

function tiles(notation: string): Tile[] {
  const result: Tile[] = [];
  let digits = "";
  for (const character of notation) {
    if (/\d/.test(character)) {
      digits += character;
      continue;
    }
    for (const digit of digits) {
      result.push(`${digit}${character}`);
    }
    digits = "";
  }
  return result;
}

function pool(entries: Array<[Tile, number]>): TilePool {
  const counts = new Array(PHYSICAL_TILE_TYPES.length).fill(0);
  let total = 0;
  for (const [tile, count] of entries) {
    counts[physicalTileIndex(tile)] = count;
    total += count;
  }
  return { counts, total };
}

describe("fixedWaitHitProbabilities", () => {
  it("uses exact sampling without replacement over multiple draws", () => {
    const result = fixedWaitHitProbabilities(
      pool([
        ["6s", 1],
        ["9s", 1],
        ["2m", 2],
      ]),
      ["6s", "9s"],
      2
    );

    expect(result.winProbability).toBeCloseTo(5 / 6, 12);
    expect(result.byTile.get("6s")).toBeCloseTo(5 / 12, 12);
    expect(result.byTile.get("9s")).toBeCloseTo(5 / 12, 12);
  });

  it("caps the draw horizon at the available pool", () => {
    const result = fixedWaitHitProbabilities(
      pool([
        ["6s", 1],
        ["2m", 2],
      ]),
      ["6s"],
      10
    );

    expect(result.winProbability).toBe(1);
    expect(result.byTile.get("6s")).toBe(1);
  });
});

describe("valueFixedTenpai", () => {
  const hand = tiles("123m123p123s78s11z");
  const unseen = pool([
    ["6s", 1],
    ["9s", 1],
    ["2m", 2],
  ]);

  it("uses four win opportunities per turn with 25% tsumo and 75% ron", () => {
    const result = valueFixedTenpai({
      hand,
      unseenPool: unseen,
      drawsRemaining: 2,
      riichiStickValue: 1000,
      uraDoraEnabled: false,
    });
    const hitProbability = 1 / 2;
    const weightedScore = (winTile: Tile): number => {
      const tsumo = scoreClosedHand({
        hand,
        winTile,
        tsumo: true,
        riichi: true,
      });
      const ron = scoreClosedHand({
        hand,
        winTile,
        tsumo: false,
        riichi: true,
      });
      return (
        TSUMO_WIN_PROBABILITY * tsumo.ten +
        (1 - TSUMO_WIN_PROBABILITY) * ron.ten
      );
    };
    const expectedRiichi =
      hitProbability * (weightedScore("6s") + weightedScore("9s"));

    expect(result.winProbability).toBe(1);
    expect(result.evaluation.expectedValue).toBeCloseTo(expectedRiichi, 10);
    expect(result.evaluation.policy).toBe("riichi");
    expect(result).not.toHaveProperty("dama");
    expect(result).not.toHaveProperty("selected");
    const methodOutcomes = result.evaluation.waits.flatMap(
      (wait) => wait.outcomes
    );
    const tsumoProbability = methodOutcomes
      .filter((outcome) => outcome.method === "tsumo")
      .reduce((total, outcome) => total + outcome.hitProbability, 0);
    const ronProbability = methodOutcomes
      .filter((outcome) => outcome.method === "ron")
      .reduce((total, outcome) => total + outcome.hitProbability, 0);
    expect(tsumoProbability / result.evaluation.winProbability).toBeCloseTo(
      TSUMO_WIN_PROBABILITY,
      12
    );
    expect(ronProbability / result.evaluation.winProbability).toBeCloseTo(
      1 - TSUMO_WIN_PROBABILITY,
      12
    );
  });

  it("scores red and normal five waits as separate physical outcomes", () => {
    const fiveWaitHand = tiles("123p123s789s34m55z");
    const result = valueFixedTenpai({
      hand: fiveWaitHand,
      unseenPool: pool([
        ["5m", 2],
        ["0m", 1],
        ["1z", 5],
      ]),
      drawsRemaining: 1,
      uraDoraEnabled: false,
    });
    const normal = result.evaluation.waits.find((wait) => wait.tile === "5m");
    const red = result.evaluation.waits.find((wait) => wait.tile === "0m");

    expect(normal?.hitProbability).toBeCloseTo(13 / 21, 12);
    expect(red?.hitProbability).toBeCloseTo(13 / 42, 12);
    expect(red?.score.akaDoraCount).toBe(1);
    expect(red!.score.ten).toBeGreaterThan(normal!.score.ten);
  });

  it("makes both win methods legal by always declaring riichi", () => {
    const tsumoOnlyHand = tiles("12m456m789p345s11z");
    const result = valueFixedTenpai({
      hand: tsumoOnlyHand,
      unseenPool: pool([
        ["3m", 1],
        ["2p", 3],
      ]),
      drawsRemaining: 1,
      uraDoraEnabled: false,
    });
    const wait = result.evaluation.waits[0];

    expect(wait.outcomes.map((outcome) => outcome.method)).toEqual([
      "tsumo",
      "ron",
    ]);
    expect(result.evaluation.winProbability).toBe(1);
  });

  it("values an open hand without riichi or ura", () => {
    const result = valueFixedTenpai({
      hand: tiles("123m456p78s11z"),
      melds: [{ type: "pon", tiles: ["5z", "5z", "5z"] }],
      unseenPool: pool([
        ["6s", 1],
        ["9s", 1],
        ["2m", 2],
      ]),
      drawsRemaining: 2,
      doraIndicators: ["4z"],
      uraDoraEnabled: true,
    });

    expect(result.evaluation.policy).toBe("open");
    expect(result.evaluation.winProbability).toBe(1);
    const outcomes = result.evaluation.waits.flatMap((wait) => wait.outcomes);
    expect(
      outcomes.some((outcome) =>
        outcome.score.yaku.some((yaku) => yaku.id === Han.Riichi)
      )
    ).toBe(false);
    expect(outcomes.every((outcome) => outcome.uraDoraCount === 0)).toBe(true);
  });

  it("averages ura indicators without losing wait or win-method correlation", () => {
    const uraPool = pool([
      ["5s", 1],
      ["8s", 1],
      ["6s", 1],
      ["9s", 1],
      ["2m", 1],
    ]);
    const indicators = ["5s", "8s", "6s", "9s", "2m"] as Tile[];
    let bruteForceGross = 0;
    let bruteForceWinProbability = 0;

    for (const indicator of indicators) {
      const livePool = cloneTilePool(uraPool);
      takeFromPool(livePool, indicator);
      const probabilities = fixedWaitHitProbabilities(
        livePool,
        ["6s", "9s"],
        2 * 4
      );
      for (const winTile of ["6s", "9s"] as Tile[]) {
        const hitProbability = probabilities.byTile.get(winTile) ?? 0;
        for (const [tsumo, methodProbability] of [
          [true, TSUMO_WIN_PROBABILITY],
          [false, 1 - TSUMO_WIN_PROBABILITY],
        ] as const) {
          const score = scoreClosedHand({
            hand,
            winTile,
            tsumo,
            riichi: true,
            doraIndicators: ["1z"],
            uraDoraIndicators: [indicator],
          });
          bruteForceGross +=
            (hitProbability * methodProbability * score.ten) /
            indicators.length;
          bruteForceWinProbability +=
            (hitProbability * methodProbability) / indicators.length;
        }
      }
    }

    const result = valueFixedTenpai({
      hand,
      unseenPool: uraPool,
      drawsRemaining: 2,
      doraIndicators: ["1z"],
      uraDoraEnabled: true,
    });

    expect(result.evaluation.grossExpectedValue).toBeCloseTo(
      bruteForceGross,
      10
    );
    expect(result.evaluation.winProbability).toBeCloseTo(
      bruteForceWinProbability,
      12
    );
    expect(
      result.evaluation.waits.flatMap((wait) => wait.outcomes)
    ).not.toHaveLength(0);
  });

  it("rejects a non-tenpai hand", () => {
    expect(() =>
      valueFixedTenpai({
        hand: tiles("123m456p789s12345z"),
        unseenPool: unseen,
        drawsRemaining: 2,
      })
    ).toThrow(/tenpai/i);
  });
});
