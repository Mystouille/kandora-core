import { describe, expect, it } from "vitest";

import { analyzeDiscardEv } from "./discardEv";
import type { Tile } from "../rules/types";
import { Han } from "../../types/Han";

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

describe("analyzeDiscardEv", () => {
  const hand = tiles("123m123p123s78s11z2z");

  it("ranks every unique physical discard by bounded offensive EV", () => {
    const result = analyzeDiscardEv({
      hand,
      drawsRemaining: 2,
      maxDepth: 1,
      timeBudgetMs: 5_000,
      uraDoraEnabled: false,
    });
    const isolatedHonor = result.discards.find(
      (discard) => discard.tile === "2z"
    );

    expect(result.completedDepth).toBe(1);
    expect(result.truncated).toBe(false);
    expect(result.discards).toHaveLength(new Set(hand).size);
    expect(isolatedHonor?.shanten).toBe(0);
    expect(isolatedHonor!.expectedValue).toBeGreaterThan(0);
    expect(result.bestDiscard?.tile).toBe("2z");
  });

  it("conserves policy probability between tenpai and frontier leaves", () => {
    const result = analyzeDiscardEv({
      hand,
      drawsRemaining: 2,
      maxDepth: 1,
      timeBudgetMs: 5_000,
      uraDoraEnabled: false,
    });

    for (const discard of result.discards) {
      expect(
        discard.tenpaiReachProbability + discard.frontierProbability
      ).toBeCloseTo(1, 10);
      expect(discard.winProbability).toBeGreaterThanOrEqual(0);
      expect(discard.winProbability).toBeLessThanOrEqual(1);
      expect(
        discard.paths.reduce((total, path) => total + path.probability, 0) +
          discard.otherProbability
      ).toBeCloseTo(1, 10);
      expect(
        discard.paths.reduce(
          (total, path) => total + path.expectedValueContribution,
          0
        ) + discard.otherExpectedValueContribution
      ).toBeCloseTo(discard.expectedValue, 8);
      expect(
        discard.paths.every(
          (path) =>
            path.steps[0]?.kind === "discard" &&
            path.steps[0]?.tile === discard.tile
        )
      ).toBe(true);
      expect(
        discard.paths
          .filter((path) => path.outcome === "win")
          .reduce((total, path) => total + path.probability, 0)
      ).toBeCloseTo(discard.winProbability, 10);
    }
  });

  it("returns an immediate tsumo instead of discard advice", () => {
    const result = analyzeDiscardEv({
      hand: tiles("123m123p123s789s11z"),
      drawsRemaining: 2,
      maxDepth: 1,
      uraDoraEnabled: false,
    });

    expect(result.immediateWin?.score.isAgari).toBe(true);
    expect(result.immediateWin?.winTile).toBe("1z");
    expect(result.discards).toEqual([]);
    expect(result.bestDiscard).toBeNull();
  });

  it("rolls an interrupted deeper search back to the last complete depth", () => {
    let cancel = false;
    const result = analyzeDiscardEv(
      {
        hand,
        drawsRemaining: 3,
        maxDepth: 3,
        timeBudgetMs: 30_000,
        uraDoraEnabled: false,
      },
      {
        shouldAbort: () => cancel,
        onDepthComplete: (progress) => {
          if (progress.completedDepth === 1) {
            cancel = true;
          }
        },
      }
    );

    expect(result.completedDepth).toBe(1);
    expect(result.truncated).toBe(true);
    expect(result.discards).not.toHaveLength(0);
  });

  it("merges winning paths by their yaku set and keeps one example hand", () => {
    const result = analyzeDiscardEv({
      hand: tiles("123m123p123s45s11z2z"),
      drawsRemaining: 2,
      maxDepth: 1,
      timeBudgetMs: 5_000,
      uraDoraEnabled: false,
    });
    const discard = result.discards.find((entry) => entry.tile === "2z");
    const winPaths = discard?.paths.filter((path) => path.outcome === "win");

    expect(winPaths).toHaveLength(1);
    expect(winPaths?.[0].probability).toBeCloseTo(
      discard?.winProbability ?? 0,
      12
    );
    expect((winPaths?.[0].yakuSet ?? []).map((yaku) => yaku.id)).not.toContain(
      Han.Fully_Concealed_Hand
    );
    expect(winPaths?.[0].terminalHand).toHaveLength(13);
    expect(winPaths?.[0].winTile).toMatch(/^[0-9][mpsz]$/);
  });

  it("merges otherwise identical paths with and without ura dora", () => {
    const input = {
      hand: tiles("123m123p123s45s11z2z"),
      doraTiles: ["2z" as Tile],
      drawsRemaining: 2,
      maxDepth: 1,
      timeBudgetMs: 5_000,
      riichiStickValue: 0,
    };
    const withoutUra = analyzeDiscardEv({
      ...input,
      uraDoraEnabled: false,
    });
    const withUra = analyzeDiscardEv({
      ...input,
      uraDoraEnabled: true,
    });
    const withoutUraDiscard = withoutUra.discards.find(
      (entry) => entry.tile === "2z"
    );
    const withUraDiscard = withUra.discards.find(
      (entry) => entry.tile === "2z"
    );
    const withoutUraPath = withoutUraDiscard?.paths.find(
      (path) => path.outcome === "win"
    );
    const withUraPaths = withUraDiscard?.paths.filter(
      (path) => path.outcome === "win"
    );

    expect(withUraPaths).toHaveLength(1);
    expect(
      (withUraPaths?.[0].yakuSet ?? []).map((yaku) => yaku.id)
    ).not.toContain(Han.Ura_Dora);
    expect(
      (withUraPaths?.[0].expectedValueContribution ?? 0) /
        (withUraPaths?.[0].probability ?? 1)
    ).toBeGreaterThan(
      (withoutUraPath?.expectedValueContribution ?? 0) /
        (withoutUraPath?.probability ?? 1)
    );
    expect(withUraPaths?.[0].probability).toBeCloseTo(
      withUraDiscard?.winProbability ?? 0,
      12
    );
  });

  it("combines regular and aka dora and separates total dora counts", () => {
    const result = analyzeDiscardEv({
      hand: tiles("123p123s789s34m55z1z"),
      doraTiles: ["5m"],
      drawsRemaining: 2,
      maxDepth: 1,
      timeBudgetMs: 5_000,
      riichiStickValue: 0,
      uraDoraEnabled: false,
    });
    const discard = result.discards.find((entry) => entry.tile === "1z");
    const winPaths = discard?.paths.filter((path) => path.outcome === "win");
    const doraCounts = winPaths
      ?.map((path) => {
        expect(path.yakuSet?.map((yaku) => yaku.id)).not.toContain(
          Han.Red_Five
        );
        const dora = path.yakuSet?.find((yaku) => yaku.id === Han.Dora);
        return Number(dora?.value.match(/\d+/)?.[0] ?? 0);
      })
      .sort((left, right) => left - right);

    expect(doraCounts).toEqual([0, 1, 2]);
  });

  it("evaluates an open hand using its declared meld count", () => {
    const result = analyzeDiscardEv({
      hand: tiles("123m456p78s11z2z"),
      melds: [{ type: "pon", tiles: ["5z", "5z", "5z"] }],
      drawsRemaining: 2,
      maxDepth: 1,
      timeBudgetMs: 5_000,
      uraDoraEnabled: true,
    });
    const discard = result.discards.find((entry) => entry.tile === "2z");

    expect(result.bestDiscard?.tile).toBe("2z");
    expect(discard?.shanten).toBe(0);
    expect(
      discard?.paths.filter((path) => path.outcome === "win")
    ).not.toHaveLength(0);
    expect(
      discard?.paths
        .filter((path) => path.outcome === "win")
        .every((path) => path.policy === "open")
    ).toBe(true);
  });
});
