import {
  emptyCounts,
  kokushiShanten,
  standardShanten,
  type HandCounts,
} from "./shanten";
import type { Tile } from "./types";

export const MCR_FLOWER_TILES = [
  "1f",
  "2f",
  "3f",
  "4f",
  "5f",
  "6f",
  "7f",
  "8f",
] as const;

export type McrFlowerTile = (typeof MCR_FLOWER_TILES)[number];

export const MCR_FLOWER_NAMES: Readonly<Record<McrFlowerTile, string>> = {
  "1f": "plum",
  "2f": "orchid",
  "3f": "chrysanthemum",
  "4f": "bamboo",
  "5f": "spring",
  "6f": "summer",
  "7f": "autumn",
  "8f": "winter",
};

export interface McrTileSplit {
  standingTiles: Tile[];
  flowers: McrFlowerTile[];
}

export interface McrDeclaredMeld {
  tiles: readonly Tile[];
}

export class McrHandValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "McrHandValidationError";
  }
}

const FLOWER_TILE_SET = new Set<string>(MCR_FLOWER_TILES);
const MCR_STRUCTURAL_TILE_PATTERN = /^(?:[1-9][mps]|[1-7]z)$/;
const SUITS = ["m", "p", "s", "z"] as const;
const SUIT_LENGTHS: Readonly<Record<(typeof SUITS)[number], number>> = {
  m: 9,
  p: 9,
  s: 9,
  z: 7,
};
const SUIT_OFFSETS = [0, 9, 18] as const;
const HONOR_OFFSET = 27;
const KNITTED_RANK_GROUPS = [
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
] as const;
const SUIT_PERMUTATIONS = [
  [0, 1, 2],
  [0, 2, 1],
  [1, 0, 2],
  [1, 2, 0],
  [2, 0, 1],
  [2, 1, 0],
] as const;

const KNITTED_PATTERNS = buildKnittedPatterns();
const HONORS_AND_KNITTED_TARGETS = buildHonorsAndKnittedTargets();
const CONCEALED_KNITTED_STRAIGHT_TARGETS =
  buildConcealedKnittedStraightTargets();
const OPEN_KNITTED_STRAIGHT_TARGETS = buildOpenKnittedStraightTargets();

export function isMcrFlowerTile(tile: string): tile is McrFlowerTile {
  return FLOWER_TILE_SET.has(tile);
}

export function splitMcrFlowers(tiles: readonly Tile[]): McrTileSplit {
  const standingTiles: Tile[] = [];
  const flowers: McrFlowerTile[] = [];
  const seenFlowers = new Set<McrFlowerTile>();

  for (const tile of tiles) {
    if (isMcrFlowerTile(tile)) {
      if (seenFlowers.has(tile)) {
        throw new McrHandValidationError(
          `Duplicate flower tile ${tile}; each MCR flower is unique`
        );
      }
      seenFlowers.add(tile);
      flowers.push(tile);
      continue;
    }
    structuralTileIndex(tile);
    standingTiles.push(tile);
  }

  return { standingTiles, flowers };
}

export function mcrShanten(
  input: readonly Tile[] | HandCounts,
  declaredMeldCount = 0
): number {
  const { counts } = validateStandingHand(input, declaredMeldCount, "either");
  return calculateMcrShanten(counts, declaredMeldCount);
}

export function mcrAcceptanceTiles(
  input: readonly Tile[] | HandCounts,
  declaredMeldCount = 0
): Tile[] {
  const { counts } = validateStandingHand(
    input,
    declaredMeldCount,
    "draw-ready"
  );
  const baseline = calculateMcrShanten(counts, declaredMeldCount);
  return collectImprovingTiles(counts, declaredMeldCount, baseline);
}

export function mcrWaits(
  input: readonly Tile[] | HandCounts,
  declaredMeldCount = 0
): Tile[] {
  const { counts } = validateStandingHand(
    input,
    declaredMeldCount,
    "draw-ready"
  );
  const baseline = calculateMcrShanten(counts, declaredMeldCount);
  if (baseline !== 0) {
    return [];
  }
  return collectImprovingTiles(counts, declaredMeldCount, baseline);
}

export function isMcrWinningShape(
  input: readonly Tile[] | HandCounts,
  ...context:
    | [declaredMeldCount?: number]
    | [melds: readonly McrDeclaredMeld[], winTile: Tile]
): boolean {
  const meldsOrCount = context[0] ?? 0;
  const winTile = context.length === 2 ? context[1] : undefined;
  if (typeof meldsOrCount !== "number") {
    if (!Array.isArray(input) || winTile === undefined) {
      throw new McrHandValidationError(
        "MCR meld-aware winning-shape analysis requires a standing tile array and a win tile"
      );
    }
    validateDeclaredMelds(input as readonly Tile[], meldsOrCount, winTile);
    const { counts } = validateStandingHand(
      [...(input as readonly Tile[]), winTile],
      meldsOrCount.length,
      "complete"
    );
    return calculateMcrShanten(counts, meldsOrCount.length) === -1;
  }

  if (winTile !== undefined) {
    throw new McrHandValidationError(
      "MCR winning-shape analysis received a win tile without declared meld details"
    );
  }
  const { counts } = validateStandingHand(input, meldsOrCount, "complete");
  return calculateMcrShanten(counts, meldsOrCount) === -1;
}

type StandingHandPhase = "either" | "draw-ready" | "complete";

interface ValidatedStandingHand {
  counts: HandCounts;
  tileCount: number;
}

function validateStandingHand(
  input: readonly Tile[] | HandCounts,
  declaredMeldCount: number,
  phase: StandingHandPhase
): ValidatedStandingHand {
  assertDeclaredMeldCount(declaredMeldCount);
  const validated = Array.isArray(input)
    ? countsFromMcrTiles(input as readonly Tile[])
    : cloneAndValidateCounts(input as HandCounts);
  const drawReadyCount = 13 - declaredMeldCount * 3;
  const completeCount = drawReadyCount + 1;

  if (phase === "draw-ready" && validated.tileCount !== drawReadyCount) {
    throw new McrHandValidationError(
      `MCR acceptance analysis requires a draw-ready standing hand of ${drawReadyCount} structural tiles with ${declaredMeldCount} declared melds; got ${validated.tileCount}`
    );
  }
  if (phase === "complete" && validated.tileCount !== completeCount) {
    throw new McrHandValidationError(
      `MCR winning-shape analysis requires a complete standing hand of ${completeCount} structural tiles with ${declaredMeldCount} declared melds; got ${validated.tileCount}`
    );
  }
  if (
    phase === "either" &&
    validated.tileCount !== drawReadyCount &&
    validated.tileCount !== completeCount
  ) {
    throw new McrHandValidationError(
      `MCR standing hand must contain ${drawReadyCount} or ${completeCount} structural tiles with ${declaredMeldCount} declared melds; got ${validated.tileCount}`
    );
  }

  return validated;
}

function assertDeclaredMeldCount(declaredMeldCount: number): void {
  if (
    !Number.isInteger(declaredMeldCount) ||
    declaredMeldCount < 0 ||
    declaredMeldCount > 4
  ) {
    throw new McrHandValidationError(
      `MCR declared meld count must be an integer from 0 to 4; got ${declaredMeldCount}`
    );
  }
}

function validateDeclaredMelds(
  hand: readonly Tile[],
  melds: readonly McrDeclaredMeld[],
  winTile: Tile
): void {
  assertDeclaredMeldCount(melds.length);
  const physicalCounts = new Uint8Array(34);

  for (const tile of [...hand, winTile]) {
    physicalCounts[structuralTileIndex(tile)]++;
  }
  for (const meld of melds) {
    if (
      meld === null ||
      typeof meld !== "object" ||
      !Array.isArray(meld.tiles)
    ) {
      throw new McrHandValidationError(
        "Each MCR declared meld must provide a tiles array"
      );
    }
    const indexes = meld.tiles.map((tile) => structuralTileIndex(tile));
    if (!isLegalDeclaredMeld(indexes)) {
      throw new McrHandValidationError(
        `Invalid MCR declared meld: ${meld.tiles.join(" ")}`
      );
    }
    for (const index of indexes) {
      physicalCounts[index]++;
    }
  }

  for (let index = 0; index < physicalCounts.length; index++) {
    if (physicalCounts[index] > 4) {
      throw new McrHandValidationError(
        `MCR hand and declared melds contain more than four copies of ${canonicalTile(index)}`
      );
    }
  }
}

function isLegalDeclaredMeld(indexes: readonly number[]): boolean {
  if (indexes.length === 4) {
    return indexes.every((index) => index === indexes[0]);
  }
  if (indexes.length !== 3) {
    return false;
  }
  if (indexes.every((index) => index === indexes[0])) {
    return true;
  }

  const sorted = [...indexes].sort((left, right) => left - right);
  const firstLocation = countLocation(sorted[0]);
  return (
    firstLocation.suit !== "z" &&
    countLocation(sorted[1]).suit === firstLocation.suit &&
    countLocation(sorted[2]).suit === firstLocation.suit &&
    sorted[1] === sorted[0] + 1 &&
    sorted[2] === sorted[1] + 1
  );
}

function countsFromMcrTiles(tiles: readonly Tile[]): ValidatedStandingHand {
  const counts = emptyCounts();
  let tileCount = 0;

  for (const tile of tiles) {
    const flatIndex = structuralTileIndex(tile);
    const location = countLocation(flatIndex);
    counts[location.suit][location.index]++;
    if (counts[location.suit][location.index] > 4) {
      throw new McrHandValidationError(
        `MCR standing hand contains more than four copies of ${canonicalTile(flatIndex)}`
      );
    }
    tileCount++;
  }

  return { counts, tileCount };
}

function cloneAndValidateCounts(input: HandCounts): ValidatedStandingHand {
  if (input === null || typeof input !== "object") {
    throw new McrHandValidationError(
      "MCR hand counts must be an object with m, p, s, and z arrays"
    );
  }

  const counts = emptyCounts();
  let tileCount = 0;
  for (const suit of SUITS) {
    const values = input[suit];
    const expectedLength = SUIT_LENGTHS[suit];
    if (!Array.isArray(values) || values.length !== expectedLength) {
      throw new McrHandValidationError(
        `MCR ${suit} counts must contain exactly ${expectedLength} counts`
      );
    }
    for (let index = 0; index < values.length; index++) {
      const count = values[index];
      if (!Number.isInteger(count) || count < 0 || count > 4) {
        throw new McrHandValidationError(
          `MCR count for ${canonicalTileFromSuit(suit, index)} must be an integer from 0 to 4; got ${count}`
        );
      }
      counts[suit][index] = count;
      tileCount += count;
    }
  }

  return { counts, tileCount };
}

function structuralTileIndex(tile: Tile): number {
  if (isMcrFlowerTile(tile)) {
    throw new McrHandValidationError(
      `MCR flower tile ${tile} is a bonus replacement tile and cannot be included in a standing hand`
    );
  }
  if (typeof tile !== "string" || !MCR_STRUCTURAL_TILE_PATTERN.test(tile)) {
    throw new McrHandValidationError(`Invalid MCR tile: ${tile}`);
  }

  const rankIndex = Number(tile[0]) - 1;
  const suit = tile[1];
  if (suit === "m") {
    return rankIndex;
  }
  if (suit === "p") {
    return 9 + rankIndex;
  }
  if (suit === "s") {
    return 18 + rankIndex;
  }
  return HONOR_OFFSET + rankIndex;
}

function countLocation(flatIndex: number): {
  suit: (typeof SUITS)[number];
  index: number;
} {
  if (flatIndex < 9) {
    return { suit: "m", index: flatIndex };
  }
  if (flatIndex < 18) {
    return { suit: "p", index: flatIndex - 9 };
  }
  if (flatIndex < 27) {
    return { suit: "s", index: flatIndex - 18 };
  }
  return { suit: "z", index: flatIndex - HONOR_OFFSET };
}

function canonicalTile(flatIndex: number): Tile {
  const location = countLocation(flatIndex);
  return canonicalTileFromSuit(location.suit, location.index);
}

function canonicalTileFromSuit(
  suit: (typeof SUITS)[number],
  index: number
): Tile {
  return `${index + 1}${suit}`;
}

function calculateMcrShanten(
  counts: HandCounts,
  declaredMeldCount: number
): number {
  let best = standardShanten(counts, declaredMeldCount);
  const flatCounts = flattenCounts(counts);

  if (declaredMeldCount === 0) {
    best = Math.min(
      best,
      mcrSevenPairsShanten(counts),
      kokushiShanten(counts),
      targetShanten(flatCounts, HONORS_AND_KNITTED_TARGETS),
      targetShanten(flatCounts, CONCEALED_KNITTED_STRAIGHT_TARGETS)
    );
  } else if (declaredMeldCount === 1) {
    best = Math.min(
      best,
      targetShanten(flatCounts, OPEN_KNITTED_STRAIGHT_TARGETS)
    );
  }

  return best;
}

function mcrSevenPairsShanten(counts: HandCounts): number {
  let pairs = 0;
  for (const suit of SUITS) {
    for (const count of counts[suit]) {
      pairs += Math.floor(count / 2);
    }
  }
  return 6 - pairs;
}

function flattenCounts(counts: HandCounts): Uint8Array {
  const flat = new Uint8Array(34);
  flat.set(counts.m, 0);
  flat.set(counts.p, 9);
  flat.set(counts.s, 18);
  flat.set(counts.z, HONOR_OFFSET);
  return flat;
}

function targetShanten(
  counts: Uint8Array,
  targets: readonly Uint8Array[]
): number {
  let fewestMissing = Number.POSITIVE_INFINITY;
  for (const target of targets) {
    let missing = 0;
    for (let index = 0; index < target.length; index++) {
      if (target[index] > counts[index]) {
        missing += target[index] - counts[index];
      }
    }
    if (missing < fewestMissing) {
      fewestMissing = missing;
    }
  }
  return fewestMissing - 1;
}

function collectImprovingTiles(
  counts: HandCounts,
  declaredMeldCount: number,
  baseline: number
): Tile[] {
  const result: Tile[] = [];
  for (const suit of SUITS) {
    for (let index = 0; index < counts[suit].length; index++) {
      if (counts[suit][index] >= 4) {
        continue;
      }
      counts[suit][index]++;
      if (calculateMcrShanten(counts, declaredMeldCount) < baseline) {
        result.push(canonicalTileFromSuit(suit, index));
      }
      counts[suit][index]--;
    }
  }
  return result;
}

function buildKnittedPatterns(): Uint8Array[] {
  return SUIT_PERMUTATIONS.map((permutation) => {
    const pattern = new Uint8Array(34);
    for (
      let groupIndex = 0;
      groupIndex < KNITTED_RANK_GROUPS.length;
      groupIndex++
    ) {
      const suitOffset = SUIT_OFFSETS[permutation[groupIndex]];
      for (const rankIndex of KNITTED_RANK_GROUPS[groupIndex]) {
        pattern[suitOffset + rankIndex] = 1;
      }
    }
    return pattern;
  });
}

function buildHonorsAndKnittedTargets(): Uint8Array[] {
  const targets: Uint8Array[] = [];
  for (const pattern of KNITTED_PATTERNS) {
    const universe: number[] = [];
    for (let index = 0; index < pattern.length; index++) {
      if (pattern[index] === 1) {
        universe.push(index);
      }
    }
    for (let index = HONOR_OFFSET; index < 34; index++) {
      universe.push(index);
    }

    // Every legal form is fourteen unique tiles selected from this
    // nine-knitted-plus-seven-honors universe.
    for (
      let firstOmission = 0;
      firstOmission < universe.length - 1;
      firstOmission++
    ) {
      for (
        let secondOmission = firstOmission + 1;
        secondOmission < universe.length;
        secondOmission++
      ) {
        const target = new Uint8Array(34);
        for (let index = 0; index < universe.length; index++) {
          if (index !== firstOmission && index !== secondOmission) {
            target[universe[index]] = 1;
          }
        }
        targets.push(target);
      }
    }
  }
  return targets;
}

function buildConcealedKnittedStraightTargets(): Uint8Array[] {
  const targets: Uint8Array[] = [];
  const regularMelds = buildRegularMelds();
  for (const pattern of KNITTED_PATTERNS) {
    for (const meld of regularMelds) {
      for (let pairIndex = 0; pairIndex < 34; pairIndex++) {
        const target = new Uint8Array(pattern);
        addTiles(target, meld);
        target[pairIndex] += 2;
        if (hasLegalMultiplicity(target)) {
          targets.push(target);
        }
      }
    }
  }
  return targets;
}

function buildOpenKnittedStraightTargets(): Uint8Array[] {
  const targets: Uint8Array[] = [];
  for (const pattern of KNITTED_PATTERNS) {
    for (let pairIndex = 0; pairIndex < 34; pairIndex++) {
      const target = new Uint8Array(pattern);
      target[pairIndex] += 2;
      targets.push(target);
    }
  }
  return targets;
}

function buildRegularMelds(): number[][] {
  const melds: number[][] = [];
  for (const suitOffset of SUIT_OFFSETS) {
    for (let start = 0; start <= 6; start++) {
      melds.push([
        suitOffset + start,
        suitOffset + start + 1,
        suitOffset + start + 2,
      ]);
    }
  }
  for (let index = 0; index < 34; index++) {
    melds.push([index, index, index]);
  }
  return melds;
}

function addTiles(target: Uint8Array, indexes: readonly number[]): void {
  for (const index of indexes) {
    target[index]++;
  }
}

function hasLegalMultiplicity(target: Uint8Array): boolean {
  for (const count of target) {
    if (count > 4) {
      return false;
    }
  }
  return true;
}
