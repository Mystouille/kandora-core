import type { Tile } from "./types";

export interface HandCounts {
  m: number[];
  p: number[];
  s: number[];
  z: number[];
}

export interface SuitBlock {
  melds: number;
  partials: number;
  pair: 0 | 1;
}

interface SuitBest {
  noPair: { melds: number; partials: number };
  withPair: { melds: number; partials: number } | null;
}

const SUIT_TABLE_LENGTH = 2 * 5 ** 9;
const SUIT_CACHE = new Map<number, SuitBest>();
const HONOR_CACHE = new Map<number, SuitBest>();
let suitTable: Uint8Array | null = null;

export function emptyCounts(): HandCounts {
  return {
    m: new Array(9).fill(0),
    p: new Array(9).fill(0),
    s: new Array(9).fill(0),
    z: new Array(7).fill(0),
  };
}

export function tileToIndex(tile: Tile): {
  suit: "m" | "p" | "s" | "z";
  index: number;
} {
  const suit = tile[tile.length - 1] as "m" | "p" | "s" | "z";
  const number = tile[0] === "0" ? 5 : Number(tile[0]);
  return { suit, index: number - 1 };
}

export function countsFromTiles(tiles: readonly Tile[]): HandCounts {
  const counts = emptyCounts();
  for (const tile of tiles) {
    const { suit, index } = tileToIndex(tile);
    counts[suit][index]++;
  }
  return counts;
}

/** Install the dense 2 * 5^9 suit table in browser or worker contexts. */
export function installSuitTable(table: Uint8Array): void {
  if (table.byteLength !== SUIT_TABLE_LENGTH) {
    throw new Error(
      `Invalid shanten suit table length: expected ${SUIT_TABLE_LENGTH}, got ${table.byteLength}`
    );
  }
  suitTable = table;
}

if (
  typeof process !== "undefined" &&
  typeof process.versions?.node === "string"
) {
  try {
    const nodeFsSpecifier = ["node", "fs"].join(":");
    const nodeUrlSpecifier = ["node", "url"].join(":");
    const { readFileSync } = (await import(
      /* @vite-ignore */ nodeFsSpecifier
    )) as typeof import("node:fs");
    const { fileURLToPath } = (await import(
      /* @vite-ignore */ nodeUrlSpecifier
    )) as typeof import("node:url");
    const path = fileURLToPath(
      new URL([".", "shanten-suit-table.bin"].join("/"), import.meta.url)
    );
    const table = new Uint8Array(readFileSync(path));
    if (table.byteLength === SUIT_TABLE_LENGTH) {
      installSuitTable(table);
    }
  } catch {
    suitTable = null;
  }
}

export function isSuitTableLoaded(): boolean {
  return suitTable !== null;
}

function encode(counts: readonly number[]): number {
  let value = 0;
  for (let index = counts.length - 1; index >= 0; index--) {
    value = value * 5 + counts[index];
  }
  return value;
}

export function solveSuit(counts: readonly number[]): SuitBest {
  const key = encode(counts);
  if (suitTable !== null) {
    const offset = key * 2;
    const noPair = suitTable[offset];
    const withPair = suitTable[offset + 1];
    return {
      noPair: { melds: (noPair / 5) | 0, partials: noPair % 5 },
      withPair:
        withPair === 0xff
          ? null
          : { melds: (withPair / 5) | 0, partials: withPair % 5 },
    };
  }

  const cached = SUIT_CACHE.get(key);
  if (cached) {
    return cached;
  }

  const work = [...counts];
  const result: SuitBest = {
    noPair: { melds: 0, partials: 0 },
    withPair: null,
  };
  exploreSuit(work, 0, 0, 0, false, result);
  SUIT_CACHE.set(key, result);
  return result;
}

function better(
  current: { melds: number; partials: number },
  candidate: { melds: number; partials: number }
): { melds: number; partials: number } {
  if (candidate.melds > current.melds) {
    return candidate;
  }
  if (
    candidate.melds === current.melds &&
    candidate.partials > current.partials
  ) {
    return candidate;
  }
  return current;
}

function exploreSuit(
  counts: number[],
  startIndex: number,
  melds: number,
  partials: number,
  pairUsed: boolean,
  result: SuitBest
): void {
  let index = startIndex;
  while (index < 9 && counts[index] === 0) {
    index++;
  }
  if (index === 9) {
    record(result, melds, partials, pairUsed);
    return;
  }

  if (counts[index] >= 3 && melds < 4) {
    counts[index] -= 3;
    exploreSuit(counts, index, melds + 1, partials, pairUsed, result);
    counts[index] += 3;
  }
  if (
    index <= 6 &&
    counts[index] >= 1 &&
    counts[index + 1] >= 1 &&
    counts[index + 2] >= 1 &&
    melds < 4
  ) {
    counts[index]--;
    counts[index + 1]--;
    counts[index + 2]--;
    exploreSuit(counts, index, melds + 1, partials, pairUsed, result);
    counts[index]++;
    counts[index + 1]++;
    counts[index + 2]++;
  }
  if (counts[index] >= 2 && !pairUsed) {
    counts[index] -= 2;
    exploreSuit(counts, index, melds, partials, true, result);
    counts[index] += 2;
  }
  if (counts[index] >= 2 && melds + partials < 4) {
    counts[index] -= 2;
    exploreSuit(counts, index, melds, partials + 1, pairUsed, result);
    counts[index] += 2;
  }
  if (
    index <= 7 &&
    counts[index] >= 1 &&
    counts[index + 1] >= 1 &&
    melds + partials < 4
  ) {
    counts[index]--;
    counts[index + 1]--;
    exploreSuit(counts, index, melds, partials + 1, pairUsed, result);
    counts[index]++;
    counts[index + 1]++;
  }
  if (
    index <= 6 &&
    counts[index] >= 1 &&
    counts[index + 2] >= 1 &&
    melds + partials < 4
  ) {
    counts[index]--;
    counts[index + 2]--;
    exploreSuit(counts, index, melds, partials + 1, pairUsed, result);
    counts[index]++;
    counts[index + 2]++;
  }

  counts[index]--;
  exploreSuit(counts, index, melds, partials, pairUsed, result);
  counts[index]++;
}

function record(
  result: SuitBest,
  melds: number,
  partials: number,
  pairUsed: boolean
): void {
  const candidate = {
    melds,
    partials: Math.min(partials, 4 - melds),
  };
  if (pairUsed) {
    result.withPair = result.withPair
      ? better(result.withPair, candidate)
      : candidate;
  } else {
    result.noPair = better(result.noPair, candidate);
  }
}

export function solveHonors(counts: readonly number[]): SuitBest {
  const key = encode(counts);
  const cached = HONOR_CACHE.get(key);
  if (cached) {
    return cached;
  }

  let melds = 0;
  let pairs = 0;
  for (const count of counts) {
    if (count >= 3) {
      melds++;
    } else if (count === 2) {
      pairs++;
    }
  }

  const result: SuitBest = {
    noPair: { melds, partials: Math.min(pairs, 4 - melds) },
    withPair:
      pairs >= 1 ? { melds, partials: Math.min(pairs - 1, 4 - melds) } : null,
  };
  HONOR_CACHE.set(key, result);
  return result;
}

export function standardShanten(counts: HandCounts, meldCount = 0): number {
  const blocks = [
    solveSuit(counts.m),
    solveSuit(counts.p),
    solveSuit(counts.s),
    solveHonors(counts.z),
  ];

  let best = scoreCombo(
    blocks.map((block) => block.noPair),
    false,
    meldCount
  );
  for (let index = 0; index < blocks.length; index++) {
    if (!blocks[index].withPair) {
      continue;
    }
    const combination = blocks.map((block, blockIndex) =>
      blockIndex === index ? blocks[index].withPair! : block.noPair
    );
    best = Math.min(best, scoreCombo(combination, true, meldCount));
  }
  return best;
}

function scoreCombo(
  blocks: { melds: number; partials: number }[],
  hasPair: boolean,
  meldCount: number
): number {
  let melds = meldCount;
  let partials = 0;
  for (const block of blocks) {
    melds += block.melds;
    partials += block.partials;
  }
  melds = Math.min(melds, 4);
  partials = Math.min(partials, 4 - melds);
  return 8 - 2 * melds - partials - (hasPair ? 1 : 0);
}

export function chiitoitsuShanten(counts: HandCounts): number {
  let pairs = 0;
  let kinds = 0;
  for (const suitCounts of [counts.m, counts.p, counts.s, counts.z]) {
    for (const count of suitCounts) {
      if (count >= 1) {
        kinds++;
      }
      if (count >= 2) {
        pairs++;
      }
    }
  }
  return 6 - pairs + Math.max(0, 7 - kinds);
}

export function kokushiShanten(counts: HandCounts): number {
  const orphanCounts = [
    counts.m[0],
    counts.m[8],
    counts.p[0],
    counts.p[8],
    counts.s[0],
    counts.s[8],
    ...counts.z,
  ];
  let kinds = 0;
  let hasPair = 0;
  for (const count of orphanCounts) {
    if (count >= 1) {
      kinds++;
    }
    if (count >= 2) {
      hasPair = 1;
    }
  }
  return 13 - kinds - hasPair;
}

export function shanten(
  input: readonly Tile[] | HandCounts,
  meldCount = 0
): number {
  const counts = Array.isArray(input)
    ? countsFromTiles(input as readonly Tile[])
    : (input as HandCounts);
  if (meldCount > 0) {
    return standardShanten(counts, meldCount);
  }
  return Math.min(
    standardShanten(counts),
    chiitoitsuShanten(counts),
    kokushiShanten(counts)
  );
}

export function acceptanceTiles(
  input: readonly Tile[] | HandCounts,
  meldCount = 0
): Tile[] {
  const counts = Array.isArray(input)
    ? countsFromTiles(input as readonly Tile[])
    : {
        m: [...(input as HandCounts).m],
        p: [...(input as HandCounts).p],
        s: [...(input as HandCounts).s],
        z: [...(input as HandCounts).z],
      };
  const baseline = shanten(counts, meldCount);
  const result: Tile[] = [];
  const suits: Array<"m" | "p" | "s"> = ["m", "p", "s"];
  for (const suit of suits) {
    for (let index = 0; index < 9; index++) {
      if (counts[suit][index] >= 4) {
        continue;
      }
      counts[suit][index]++;
      if (shanten(counts, meldCount) < baseline) {
        result.push(`${index + 1}${suit}`);
      }
      counts[suit][index]--;
    }
  }
  for (let index = 0; index < 7; index++) {
    if (counts.z[index] >= 4) {
      continue;
    }
    counts.z[index]++;
    if (shanten(counts, meldCount) < baseline) {
      result.push(`${index + 1}z`);
    }
    counts.z[index]--;
  }
  return result;
}

export function isTenpai(
  input: readonly Tile[] | HandCounts,
  meldCount = 0
): boolean {
  return shanten(input, meldCount) === 0;
}

export function waits(
  input: readonly Tile[] | HandCounts,
  meldCount = 0
): Tile[] {
  const counts = Array.isArray(input)
    ? countsFromTiles(input as readonly Tile[])
    : (input as HandCounts);
  if (shanten(counts, meldCount) !== 0) {
    return [];
  }
  return acceptanceTiles(counts, meldCount);
}

export function precomputeSuitTable(maxTotal = 14): void {
  const counts = new Array(9).fill(0);
  fillSuitCache(counts, 0, 0, maxTotal);
}

function fillSuitCache(
  counts: number[],
  index: number,
  total: number,
  maxTotal: number
): void {
  if (index === 9) {
    solveSuit(counts);
    return;
  }
  for (let count = 0; count <= 4 && total + count <= maxTotal; count++) {
    counts[index] = count;
    fillSuitCache(counts, index + 1, total + count, maxTotal);
  }
  counts[index] = 0;
}

export function isWinningShape(
  hand: readonly Tile[],
  melds: readonly { tiles: readonly Tile[] }[],
  winTile: Tile
): boolean {
  const counts = countsFromTiles(hand);
  for (const meld of melds) {
    const limit = meld.tiles.length === 4 ? 3 : meld.tiles.length;
    for (let index = 0; index < limit; index++) {
      const position = tileToIndex(meld.tiles[index]);
      counts[position.suit][position.index]++;
    }
  }
  const winPosition = tileToIndex(winTile);
  counts[winPosition.suit][winPosition.index]++;
  if (standardShanten(counts) === -1) {
    return true;
  }
  if (melds.length === 0) {
    return chiitoitsuShanten(counts) === -1 || kokushiShanten(counts) === -1;
  }
  return false;
}
