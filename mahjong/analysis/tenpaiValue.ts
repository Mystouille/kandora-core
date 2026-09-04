import {
  indicatorToDora,
  scoreClosedHand,
  type ClosedHandScoreInput,
  type ClosedHandScoreResult,
  type OpenMeld,
} from "./closedHandScore";
import {
  countInPool,
  normalizeTile,
  tilePoolEntries,
  type TilePool,
} from "./tilePool";
import { shanten, waits } from "../rules/shanten";
import type { Tile, Wind } from "../rules/types";

export type TenpaiPolicy = "riichi" | "open";
export type WinMethod = "tsumo" | "ron";

export const TSUMO_WIN_PROBABILITY = 1 / 4;

export interface FixedWaitProbabilityResult {
  winProbability: number;
  byTile: ReadonlyMap<Tile, number>;
}

export interface TenpaiWaitValue {
  tile: Tile;
  remaining: number;
  hitProbability: number;
  expectedValueContribution: number;
  score: ClosedHandScoreResult;
  outcomes: WinOutcomeValue[];
}

export interface WinOutcomeValue {
  method: WinMethod;
  uraDoraCount: number;
  hitProbability: number;
  expectedValueContribution: number;
  score: ClosedHandScoreResult;
}

export interface TenpaiPolicyValue {
  policy: TenpaiPolicy;
  expectedValue: number;
  grossExpectedValue: number;
  winProbability: number;
  conditionalWinValue: number;
  waits: TenpaiWaitValue[];
}

export interface FixedTenpaiValue {
  winProbability: number;
  evaluation: TenpaiPolicyValue;
}

export interface FixedTenpaiInput {
  hand: readonly Tile[];
  melds?: readonly OpenMeld[];
  unseenPool: TilePool;
  drawsRemaining: number;
  doraIndicators?: readonly Tile[];
  roundWind?: Wind;
  seatWind?: Wind;
  riichiStickValue?: number;
  uraDoraEnabled?: boolean;
  noAka?: boolean;
}

function probabilityOfAnySuccess(
  totalCount: number,
  successCount: number,
  drawsRemaining: number
): number {
  if (totalCount <= 0 || successCount <= 0 || drawsRemaining <= 0) {
    return 0;
  }
  const draws = Math.min(drawsRemaining, totalCount);
  const failureCount = totalCount - successCount;
  let missProbability = 1;
  for (let drawIndex = 0; drawIndex < draws; drawIndex++) {
    if (drawIndex >= failureCount) {
      return 1;
    }
    missProbability *= (failureCount - drawIndex) / (totalCount - drawIndex);
  }
  return 1 - missProbability;
}

export function fixedWaitHitProbabilities(
  pool: TilePool,
  winningTiles: readonly Tile[],
  drawsRemaining: number
): FixedWaitProbabilityResult {
  if (!Number.isInteger(drawsRemaining) || drawsRemaining < 0) {
    throw new Error("drawsRemaining must be a nonnegative integer");
  }

  const uniqueTiles = [...new Set(winningTiles)];
  const winningCount = uniqueTiles.reduce(
    (total, tile) => total + countInPool(pool, tile),
    0
  );
  if (pool.total === 0 || winningCount === 0 || drawsRemaining === 0) {
    return { winProbability: 0, byTile: new Map() };
  }

  const winProbability = probabilityOfAnySuccess(
    pool.total,
    winningCount,
    drawsRemaining
  );
  const byTile = new Map<Tile, number>();
  for (const tile of uniqueTiles) {
    const count = countInPool(pool, tile);
    if (count > 0) {
      byTile.set(tile, winProbability * (count / winningCount));
    }
  }
  return { winProbability, byTile };
}

function physicalWaits(
  hand: readonly Tile[],
  pool: TilePool,
  meldCount: number
): Tile[] {
  const result: Tile[] = [];
  for (const wait of waits(hand, meldCount)) {
    if (wait[0] === "5" && wait[1] !== "z") {
      const red = `0${wait[1]}`;
      if (countInPool(pool, wait) > 0) {
        result.push(wait);
      }
      if (countInPool(pool, red) > 0) {
        result.push(red);
      }
    } else if (countInPool(pool, wait) > 0) {
      result.push(wait);
    }
  }
  return result;
}

function isLegalWin(score: ClosedHandScoreResult): boolean {
  return score.isAgari && (score.han > 0 || score.yakumanCount > 0);
}

function scoreWinMethods({
  scoreInput,
  winTile,
  hitProbability,
  uraDoraIndicators,
}: {
  scoreInput: Omit<ClosedHandScoreInput, "winTile" | "tsumo">;
  winTile: Tile;
  hitProbability: number;
  uraDoraIndicators?: readonly Tile[];
}): WinOutcomeValue[] {
  const methods: Array<{
    method: WinMethod;
    probability: number;
    tsumo: boolean;
  }> = [
    {
      method: "tsumo",
      probability: TSUMO_WIN_PROBABILITY,
      tsumo: true,
    },
    {
      method: "ron",
      probability: 1 - TSUMO_WIN_PROBABILITY,
      tsumo: false,
    },
  ];
  const outcomes: WinOutcomeValue[] = [];
  for (const method of methods) {
    const score = scoreClosedHand({
      ...scoreInput,
      winTile,
      tsumo: method.tsumo,
      uraDoraIndicators,
    });
    if (!isLegalWin(score)) {
      continue;
    }
    const outcomeProbability = hitProbability * method.probability;
    outcomes.push({
      method: method.method,
      uraDoraCount: score.uraDoraCount,
      hitProbability: outcomeProbability,
      expectedValueContribution: outcomeProbability * score.ten,
      score,
    });
  }
  return outcomes;
}

function representativeScore(
  outcomes: readonly WinOutcomeValue[]
): ClosedHandScoreResult {
  const representative = [...outcomes].sort(
    (left, right) =>
      right.hitProbability - left.hitProbability ||
      right.expectedValueContribution - left.expectedValueContribution
  )[0];
  if (!representative) {
    throw new Error(
      "A closed shape-completing wait must have a legal win method"
    );
  }
  return representative.score;
}

function valueWithoutUra(
  input: FixedTenpaiInput,
  policy: TenpaiPolicy,
  physicalWinningTiles: readonly Tile[],
  probabilities: FixedWaitProbabilityResult
): TenpaiPolicyValue {
  const scoreInput: Omit<ClosedHandScoreInput, "winTile" | "tsumo"> = {
    hand: input.hand,
    doraIndicators: input.doraIndicators,
    roundWind: input.roundWind,
    seatWind: input.seatWind,
    riichi: policy === "riichi",
    noAka: input.noAka,
    melds: input.melds,
  };
  const waitValues = physicalWinningTiles.map<TenpaiWaitValue>((tile) => {
    const outcomes = scoreWinMethods({
      scoreInput,
      winTile: tile,
      hitProbability: probabilities.byTile.get(tile) ?? 0,
    });
    return {
      tile,
      remaining: countInPool(input.unseenPool, tile),
      hitProbability: outcomes.reduce(
        (total, outcome) => total + outcome.hitProbability,
        0
      ),
      expectedValueContribution: outcomes.reduce(
        (total, outcome) => total + outcome.expectedValueContribution,
        0
      ),
      score: representativeScore(outcomes),
      outcomes,
    };
  });
  const winProbability = waitValues.reduce(
    (total, wait) => total + wait.hitProbability,
    0
  );
  const grossExpectedValue = waitValues.reduce(
    (total, wait) => total + wait.expectedValueContribution,
    0
  );
  const stake = input.riichiStickValue ?? 1000;
  return {
    policy,
    expectedValue:
      policy === "riichi"
        ? grossExpectedValue - stake * (1 - winProbability)
        : grossExpectedValue,
    grossExpectedValue,
    winProbability,
    conditionalWinValue:
      winProbability > 0 ? grossExpectedValue / winProbability : 0,
    waits: waitValues,
  };
}

interface UraGroup {
  count: number;
  uraHan: number;
  waitIndex: number;
  physicalTiles: Array<{ tile: Tile; count: number }>;
}

interface UraState {
  selected: number;
  uraHan: number;
  removedWaits: number[];
  combinations: number;
  indicators: Tile[];
}

function combination(total: number, selected: number): number {
  if (selected < 0 || selected > total) {
    return 0;
  }
  const smaller = Math.min(selected, total - selected);
  let result = 1;
  for (let index = 1; index <= smaller; index++) {
    result = (result * (total - smaller + index)) / index;
  }
  return result;
}

function representativeIndicators(group: UraGroup, count: number): Tile[] {
  const result: Tile[] = [];
  let remaining = count;
  for (const physicalTile of group.physicalTiles) {
    const selected = Math.min(remaining, physicalTile.count);
    for (let index = 0; index < selected; index++) {
      result.push(physicalTile.tile);
    }
    remaining -= selected;
    if (remaining === 0) {
      return result;
    }
  }
  throw new Error("Unable to construct representative ura indicators");
}

function buildUraGroups(
  input: FixedTenpaiInput,
  targetWinTile: Tile,
  physicalWinningTiles: readonly Tile[]
): UraGroup[] {
  const finalHand = [
    ...input.hand,
    targetWinTile,
    ...(input.melds?.flatMap((meld) => meld.tiles) ?? []),
  ];
  const groups = new Map<string, UraGroup>();
  for (const entry of tilePoolEntries(input.unseenPool)) {
    const dora = normalizeTile(indicatorToDora(entry.tile));
    const uraHan = finalHand.filter(
      (tile) => normalizeTile(tile) === dora
    ).length;
    const waitIndex = physicalWinningTiles.indexOf(entry.tile);
    const key = `${uraHan}|${waitIndex}`;
    const group = groups.get(key);
    if (group) {
      group.count += entry.count;
      group.physicalTiles.push(entry);
    } else {
      groups.set(key, {
        count: entry.count,
        uraHan,
        waitIndex,
        physicalTiles: [entry],
      });
    }
  }
  return [...groups.values()];
}

function enumerateUraStates(
  input: FixedTenpaiInput,
  targetWinTile: Tile,
  physicalWinningTiles: readonly Tile[],
  indicatorCount: number
): UraState[] {
  let states = new Map<string, UraState>();
  const initialRemoved = new Array(physicalWinningTiles.length).fill(0);
  states.set(`0|0|${initialRemoved.join(",")}`, {
    selected: 0,
    uraHan: 0,
    removedWaits: initialRemoved,
    combinations: 1,
    indicators: [],
  });

  for (const group of buildUraGroups(
    input,
    targetWinTile,
    physicalWinningTiles
  )) {
    const nextStates = new Map<string, UraState>();
    for (const state of states.values()) {
      const maxSelected = Math.min(
        group.count,
        indicatorCount - state.selected
      );
      for (let selected = 0; selected <= maxSelected; selected++) {
        const removedWaits = [...state.removedWaits];
        if (group.waitIndex >= 0) {
          removedWaits[group.waitIndex] += selected;
        }
        const next: UraState = {
          selected: state.selected + selected,
          uraHan: state.uraHan + selected * group.uraHan,
          removedWaits,
          combinations: state.combinations * combination(group.count, selected),
          indicators: [
            ...state.indicators,
            ...representativeIndicators(group, selected),
          ],
        };
        const key = `${next.selected}|${next.uraHan}|${removedWaits.join(",")}`;
        const existing = nextStates.get(key);
        if (existing) {
          existing.combinations += next.combinations;
        } else {
          nextStates.set(key, next);
        }
      }
    }
    states = nextStates;
  }
  return [...states.values()].filter(
    (state) => state.selected === indicatorCount
  );
}

function valueRiichiWithUra(
  input: FixedTenpaiInput,
  physicalWinningTiles: readonly Tile[]
): TenpaiPolicyValue {
  const indicatorCount = input.doraIndicators?.length ?? 0;
  if (indicatorCount < 1) {
    const probabilities = fixedWaitHitProbabilities(
      input.unseenPool,
      physicalWinningTiles,
      input.drawsRemaining
    );
    return valueWithoutUra(
      input,
      "riichi",
      physicalWinningTiles,
      probabilities
    );
  }
  if (indicatorCount > 5) {
    throw new Error("At most five ura-dora indicators are supported");
  }
  if (indicatorCount > input.unseenPool.total) {
    throw new Error("Not enough unseen tiles for the ura-dora indicators");
  }

  const waitCounts = physicalWinningTiles.map((tile) =>
    countInPool(input.unseenPool, tile)
  );
  const totalCombinations = combination(input.unseenPool.total, indicatorCount);
  const waitValues = physicalWinningTiles.map<TenpaiWaitValue>(
    (targetWinTile, targetWaitIndex) => {
      const outcomes = new Map<
        number,
        { hitProbability: number; indicators: Tile[] }
      >();
      const states = enumerateUraStates(
        input,
        targetWinTile,
        physicalWinningTiles,
        indicatorCount
      );
      for (const state of states) {
        const remainingWaitCounts = waitCounts.map(
          (count, index) => count - state.removedWaits[index]
        );
        const successCount = remainingWaitCounts.reduce(
          (total, count) => total + count,
          0
        );
        const targetCount = remainingWaitCounts[targetWaitIndex];
        if (successCount <= 0 || targetCount <= 0) {
          continue;
        }
        const conditionalWinProbability = probabilityOfAnySuccess(
          input.unseenPool.total - indicatorCount,
          successCount,
          input.drawsRemaining
        );
        const jointProbability =
          (state.combinations / totalCombinations) *
          conditionalWinProbability *
          (targetCount / successCount);
        const existing = outcomes.get(state.uraHan);
        if (existing) {
          existing.hitProbability += jointProbability;
        } else {
          outcomes.set(state.uraHan, {
            hitProbability: jointProbability,
            indicators: state.indicators,
          });
        }
      }

      const scoreInput: Omit<ClosedHandScoreInput, "winTile" | "tsumo"> = {
        hand: input.hand,
        doraIndicators: input.doraIndicators,
        roundWind: input.roundWind,
        seatWind: input.seatWind,
        riichi: true,
        noAka: input.noAka,
        melds: input.melds,
      };
      const methodOutcomes = [...outcomes.entries()]
        .sort(([left], [right]) => left - right)
        .flatMap(([uraDoraCount, outcome]) => {
          const scoredOutcomes = scoreWinMethods({
            scoreInput,
            winTile: targetWinTile,
            hitProbability: outcome.hitProbability,
            uraDoraIndicators: outcome.indicators,
          });
          for (const scoredOutcome of scoredOutcomes) {
            if (scoredOutcome.uraDoraCount !== uraDoraCount) {
              throw new Error("Ura-dora state and scorer result diverged");
            }
          }
          return scoredOutcomes;
        });
      const hitProbability = methodOutcomes.reduce(
        (total, outcome) => total + outcome.hitProbability,
        0
      );
      return {
        tile: targetWinTile,
        remaining: waitCounts[targetWaitIndex],
        hitProbability,
        expectedValueContribution: methodOutcomes.reduce(
          (total, outcome) => total + outcome.expectedValueContribution,
          0
        ),
        score: representativeScore(methodOutcomes),
        outcomes: methodOutcomes,
      };
    }
  );
  const winProbability = waitValues.reduce(
    (total, wait) => total + wait.hitProbability,
    0
  );
  const grossExpectedValue = waitValues.reduce(
    (total, wait) => total + wait.expectedValueContribution,
    0
  );
  const stake = input.riichiStickValue ?? 1000;
  return {
    policy: "riichi",
    expectedValue: grossExpectedValue - stake * (1 - winProbability),
    grossExpectedValue,
    winProbability,
    conditionalWinValue:
      winProbability > 0 ? grossExpectedValue / winProbability : 0,
    waits: waitValues,
  };
}

export function valueFixedTenpai(input: FixedTenpaiInput): FixedTenpaiValue {
  const meldCount = input.melds?.length ?? 0;
  const expectedHandLength = 13 - 3 * meldCount;
  if (input.hand.length !== expectedHandLength) {
    throw new Error(
      `Fixed-tenpai hand must have ${expectedHandLength} concealed tiles with ${meldCount} open meld(s) (got ${input.hand.length})`
    );
  }
  if (shanten(input.hand, meldCount) !== 0) {
    throw new Error("Fixed-tenpai valuation requires a hand in tenpai");
  }
  const winningTiles = physicalWaits(input.hand, input.unseenPool, meldCount);
  const probabilities = fixedWaitHitProbabilities(
    input.unseenPool,
    winningTiles,
    input.drawsRemaining
  );
  const evaluation =
    meldCount === 0
      ? input.uraDoraEnabled
        ? valueRiichiWithUra(input, winningTiles)
        : valueWithoutUra(input, "riichi", winningTiles, probabilities)
      : valueWithoutUra(input, "open", winningTiles, probabilities);
  return {
    winProbability: evaluation.winProbability,
    evaluation,
  };
}

export function isSameNormalizedTile(left: Tile, right: Tile): boolean {
  return normalizeTile(left) === normalizeTile(right);
}
