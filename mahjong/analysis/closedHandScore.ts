import Riichi from "riichi";

import type { Han } from "../../types/Han";
import { riichiLibYakuToHan } from "../../yaku/platformYakuMaps";
import { compareTiles, type Tile, type Wind } from "../rules/types";

export interface OpenMeld {
  type: "chi" | "pon" | "kan" | "ankan" | "daiminkan" | "shouminkan";
  tiles: readonly Tile[];
}

export interface ClosedHandScoreInput {
  hand: readonly Tile[];
  winTile: Tile;
  tsumo: boolean;
  doraIndicators?: readonly Tile[];
  uraDoraIndicators?: readonly Tile[];
  roundWind?: Wind;
  seatWind?: Wind;
  riichi?: boolean;
  noAka?: boolean;
  kiriageMangan?: boolean;
  melds?: readonly OpenMeld[];
}

export interface ScoredYaku {
  id: Han | null;
  name: string;
  value: string;
}

export interface ClosedHandScoreResult {
  isAgari: boolean;
  han: number;
  fu: number;
  ten: number;
  yaku: ScoredYaku[];
  doraCount: number;
  akaDoraCount: number;
  uraDoraCount: number;
  isYakuman: boolean;
  yakumanCount: number;
  oya: readonly number[];
  ko: readonly number[];
  text: string;
}

export type ClosedHandScorer = (
  input: ClosedHandScoreInput
) => ClosedHandScoreResult;

export interface ClosedHandScoreCacheStats {
  hits: number;
  misses: number;
  evictions: number;
}

interface RiichiRaw {
  isAgari: boolean;
  yakuman: number;
  yaku: Record<string, string>;
  han: number;
  fu: number;
  ten: number;
  text: string;
  oya: number[];
  ko: number[];
  error: boolean;
}

const WIND_DIGIT: Record<Wind, string> = { E: "1", S: "2", W: "3", N: "4" };

function tileSuit(tile: Tile): "m" | "p" | "s" | "z" {
  return tile[tile.length - 1] as "m" | "p" | "s" | "z";
}

function tileNumber(tile: Tile): number {
  return tile[0] === "0" ? 5 : Number(tile[0]);
}

function sortTiles(tiles: readonly Tile[]): Tile[] {
  return [...tiles].sort(compareTiles);
}

function tilesToGroups(tiles: readonly Tile[]): string {
  if (tiles.length === 0) {
    return "";
  }
  const groups: string[] = [];
  let currentSuit = tileSuit(tiles[0]);
  let digits = "";
  for (const tile of tiles) {
    const suit = tileSuit(tile);
    if (suit !== currentSuit) {
      groups.push(digits + currentSuit);
      currentSuit = suit;
      digits = "";
    }
    digits += tile[0];
  }
  groups.push(digits + currentSuit);
  return groups.join("");
}

function appendWinningTile(hand: string, winTile: Tile): string {
  const suit = tileSuit(winTile);
  if (hand.endsWith(suit)) {
    return `${hand.slice(0, -1)}${winTile[0]}${suit}`;
  }
  return `${hand}${winTile[0]}${suit}`;
}

function meldToGroup(meld: OpenMeld): string {
  assertValidOpenMeld(meld);
  if (meld.type === "ankan") {
    const tile = meld.tiles[0];
    return `${tile[0]}${tile[0]}${tileSuit(tile)}`;
  }
  return tilesToGroups(sortTiles(meld.tiles));
}

export function assertValidOpenMeld(meld: OpenMeld): void {
  const expectedLength = meld.type === "chi" || meld.type === "pon" ? 3 : 4;
  if (meld.tiles.length !== expectedLength) {
    throw new Error(
      `${meld.type} meld must contain ${expectedLength} physical tiles`
    );
  }
  const normalized = meld.tiles.map(
    (tile) => `${tileNumber(tile)}${tileSuit(tile)}`
  );
  if (meld.type !== "chi") {
    if (new Set(normalized).size !== 1) {
      throw new Error(`${meld.type} meld must contain identical tiles`);
    }
    return;
  }
  const suits = new Set(normalized.map((tile) => tile[1]));
  const numbers = normalized
    .map((tile) => Number(tile[0]))
    .sort((left, right) => left - right);
  if (
    suits.size !== 1 ||
    normalized[0][1] === "z" ||
    numbers[1] !== numbers[0] + 1 ||
    numbers[2] !== numbers[1] + 1
  ) {
    throw new Error("chi meld must contain a suited sequence");
  }
}

export function indicatorToDora(indicator: Tile): Tile {
  const suit = tileSuit(indicator);
  const number = tileNumber(indicator);
  if (suit === "z") {
    if (number <= 4) {
      return `${(number % 4) + 1}z`;
    }
    return `${((number - 4) % 3) + 5}z`;
  }
  return `${(number % 9) + 1}${suit}`;
}

export function doraToIndicator(dora: Tile): Tile {
  const suit = tileSuit(dora);
  const number = tileNumber(dora);
  if (suit === "z") {
    if (number <= 4) {
      return `${((number + 2) % 4) + 1}z`;
    }
    return `${((number - 5 + 2) % 3) + 5}z`;
  }
  return `${number === 1 ? 9 : number - 1}${suit}`;
}

function normalizeRedFive(tile: Tile): Tile {
  return tile[0] === "0" ? `5${tileSuit(tile)}` : tile;
}

function countIndicatorDora(
  tiles: readonly Tile[],
  indicators: readonly Tile[]
): number {
  return indicators.reduce((total, indicator) => {
    const dora = normalizeRedFive(indicatorToDora(indicator));
    return (
      total + tiles.filter((tile) => normalizeRedFive(tile) === dora).length
    );
  }, 0);
}

export function buildClosedRiichiInput(input: ClosedHandScoreInput): string {
  const meldCount = input.melds?.length ?? 0;
  const expectedHandLength = 13 - 3 * meldCount;
  if (input.hand.length !== expectedHandLength) {
    throw new Error(
      `scoreClosedHand: hand must have ${expectedHandLength} concealed tiles with ${meldCount} open meld(s) (got ${input.hand.length})`
    );
  }

  const hand = tilesToGroups(sortTiles(input.hand));
  const winningHand = input.tsumo
    ? appendWinningTile(hand, input.winTile)
    : `${hand}+${input.winTile}`;
  const tail: string[] = [];
  const round = WIND_DIGIT[input.roundWind ?? "E"];
  const seat = WIND_DIGIT[input.seatWind ?? "S"];
  const wind = round === "1" && seat === "2" ? "" : round + seat;
  if (input.riichi || wind) {
    tail.push(`${input.riichi ? "r" : ""}${wind}`);
  }

  const indicators = [
    ...(input.doraIndicators ?? []),
    ...(input.uraDoraIndicators ?? []),
  ];
  if (indicators.length > 0) {
    const dora = indicators.map(indicatorToDora);
    tail.push(`d${tilesToGroups(sortTiles(dora))}`);
  }
  const melds = (input.melds ?? []).map(meldToGroup);
  return [winningHand, ...melds, ...tail].join("+");
}

function calculateClosedHandScore(
  input: ClosedHandScoreInput,
  riichiInput: string
): ClosedHandScoreResult {
  const scorer = new Riichi(riichiInput);
  if (input.noAka) {
    scorer.disableAka();
  }
  const raw = scorer.calc() as RiichiRaw;
  if (input.kiriageMangan) {
    applyKiriageMangan(raw, input.tsumo, input.seatWind === "E");
  }
  const winningTiles = [
    ...input.hand,
    input.winTile,
    ...(input.melds?.flatMap((meld) => meld.tiles) ?? []),
  ];
  const doraCount = countIndicatorDora(
    winningTiles,
    input.doraIndicators ?? []
  );
  const uraDoraCount = countIndicatorDora(
    winningTiles,
    input.uraDoraIndicators ?? []
  );
  const akaDoraCount = input.noAka
    ? 0
    : winningTiles.filter((tile) => tile[0] === "0").length;
  const yakuRecord = { ...raw.yaku };

  delete yakuRecord["ドラ"];
  delete yakuRecord["赤ドラ"];
  delete yakuRecord["裏ドラ"];
  if (raw.yakuman === 0) {
    if (doraCount > 0) {
      yakuRecord["ドラ"] = `${doraCount}飜`;
    }
    if (akaDoraCount > 0) {
      yakuRecord["赤ドラ"] = `${akaDoraCount}飜`;
    }
    if ((input.uraDoraIndicators?.length ?? 0) > 0) {
      yakuRecord["裏ドラ"] = `${uraDoraCount}飜`;
    }
  }

  return {
    isAgari: raw.isAgari && !raw.error,
    han: raw.han,
    fu: raw.fu,
    ten: raw.ten,
    yaku: Object.entries(yakuRecord).map(([name, value]) => ({
      id: riichiLibYakuToHan(name) ?? null,
      name,
      value,
    })),
    doraCount,
    akaDoraCount,
    uraDoraCount,
    isYakuman: raw.yakuman > 0,
    yakumanCount: raw.yakuman,
    oya: raw.oya,
    ko: raw.ko,
    text: raw.text,
  };
}

export function scoreClosedHand(
  input: ClosedHandScoreInput
): ClosedHandScoreResult {
  return calculateClosedHandScore(input, buildClosedRiichiInput(input));
}

function scoreCacheKey(
  input: ClosedHandScoreInput,
  riichiInput: string
): string {
  return JSON.stringify([
    riichiInput,
    input.noAka === true,
    input.kiriageMangan === true,
    sortTiles((input.doraIndicators ?? []).map(indicatorToDora)),
    sortTiles((input.uraDoraIndicators ?? []).map(indicatorToDora)),
  ]);
}

function applyKiriageMangan(
  raw: RiichiRaw,
  isTsumo: boolean,
  isDealer: boolean
): void {
  const isKiriageBoundary =
    (raw.han === 4 && raw.fu === 30) || (raw.han === 3 && raw.fu === 60);
  if (!raw.isAgari || raw.error || raw.yakuman > 0 || !isKiriageBoundary) {
    return;
  }
  const base = 2_000;
  if (isTsumo) {
    raw.oya = [base * 2, base * 2, base * 2];
    raw.ko = [base * 2, base, base];
  } else {
    raw.oya = [base * 6];
    raw.ko = [base * 4];
  }
  raw.ten = isDealer ? base * 6 : base * 4;
}

export function createClosedHandScoreCache(
  maxEntries = 4096,
  stats?: ClosedHandScoreCacheStats
): ClosedHandScorer {
  if (!Number.isInteger(maxEntries) || maxEntries < 1) {
    throw new Error("Score cache size must be a positive integer");
  }
  const cache = new Map<string, ClosedHandScoreResult>();
  return (input) => {
    const riichiInput = buildClosedRiichiInput(input);
    const key = scoreCacheKey(input, riichiInput);
    const cached = cache.get(key);
    if (cached) {
      if (stats) {
        stats.hits++;
      }
      cache.delete(key);
      cache.set(key, cached);
      return cached;
    }
    if (stats) {
      stats.misses++;
    }
    const result = calculateClosedHandScore(input, riichiInput);
    if (cache.size >= maxEntries) {
      const oldestKey = cache.keys().next().value;
      if (oldestKey !== undefined) {
        cache.delete(oldestKey);
        if (stats) {
          stats.evictions++;
        }
      }
    }
    cache.set(key, result);
    return result;
  };
}

// `riichi@1.2.0` compares penchan edges to a boolean instead of the win tile.
{
  const ceil10 = (value: number): number => Math.ceil(value / 10) * 10;
  const isTerminalOrHonor = (tile: unknown): boolean =>
    typeof tile === "string" &&
    tile.length === 2 &&
    (tile.includes("1") || tile.includes("9") || tile.includes("z"));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (Riichi.prototype as any).calcFu = function calcFuPatched(this: any): void {
    let fu = 0;
    if (this.tmpResult.yaku["七対子"]) {
      fu = 25;
    } else if (this.tmpResult.yaku["平和"]) {
      fu = this.isTsumo ? 20 : 30;
    } else {
      fu = 20;
      let hasWinningTileFu = false;
      for (const pattern of this.currentPattern) {
        if (typeof pattern === "string") {
          if (pattern.includes("z")) {
            for (const value of [this.bakaze, this.jikaze, 5, 6, 7]) {
              if (parseInt(pattern) === value) {
                fu += 2;
              }
            }
          }
          if (this.agari === pattern) {
            hasWinningTileFu = true;
          }
        } else if (pattern.length === 4) {
          fu += isTerminalOrHonor(pattern[0]) ? 16 : 8;
        } else if (pattern.length === 2) {
          fu += isTerminalOrHonor(pattern[0]) ? 32 : 16;
        } else if (pattern.length === 1) {
          fu += isTerminalOrHonor(pattern[0]) ? 8 : 4;
        } else if (pattern.length === 3 && pattern[0] === pattern[1]) {
          fu += isTerminalOrHonor(pattern[0]) ? 4 : 2;
        } else if (!hasWinningTileFu) {
          if (pattern[1] === this.agari) {
            hasWinningTileFu = true;
          } else if (pattern[0] === this.agari && parseInt(pattern[2]) === 9) {
            hasWinningTileFu = true;
          } else if (pattern[2] === this.agari && parseInt(pattern[0]) === 1) {
            hasWinningTileFu = true;
          }
        }
      }
      if (!this.isTsumo && this.isMenzen()) {
        fu += 10;
      }
      if (hasWinningTileFu) {
        fu += 2;
      }
      if (this.isTsumo) {
        fu += 2;
      }
      fu = Math.max(30, ceil10(fu));
    }
    this.tmpResult.fu = fu;
  };
}
