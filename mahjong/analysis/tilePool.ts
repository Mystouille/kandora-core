import type { Suit, Tile } from "../rules/types";

export interface RedFiveConfiguration {
  m: number;
  p: number;
  s: number;
}

export interface TilePoolInput {
  hand: readonly Tile[];
  visibleTiles?: readonly Tile[];
  doraIndicators?: readonly Tile[];
  redFives?: Partial<RedFiveConfiguration>;
}

export interface TilePool {
  counts: number[];
  total: number;
  packedKey?: bigint;
}

const suitedPhysicalTiles = (suit: Suit): Tile[] => [
  `1${suit}`,
  `2${suit}`,
  `3${suit}`,
  `4${suit}`,
  `5${suit}`,
  `0${suit}`,
  `6${suit}`,
  `7${suit}`,
  `8${suit}`,
  `9${suit}`,
];

export const PHYSICAL_TILE_TYPES: readonly Tile[] = [
  ...suitedPhysicalTiles("m"),
  ...suitedPhysicalTiles("p"),
  ...suitedPhysicalTiles("s"),
  "1z",
  "2z",
  "3z",
  "4z",
  "5z",
  "6z",
  "7z",
];

const TILE_INDEX = new Map(
  PHYSICAL_TILE_TYPES.map((tile, index) => [tile, index])
);
const PACKED_TILE_WEIGHTS = PHYSICAL_TILE_TYPES.map(
  (_, index) => 5n ** BigInt(index)
);

const DEFAULT_RED_FIVES: RedFiveConfiguration = { m: 1, p: 1, s: 1 };

export function isTileNotation(value: string): value is Tile {
  return /^(?:0[mps]|[1-9][mps]|[1-7]z)$/.test(value);
}

export function normalizeTile(tile: Tile): Tile {
  return tile[0] === "0" ? `5${tile[1]}` : tile;
}

export function physicalTileIndex(tile: Tile): number {
  const index = TILE_INDEX.get(tile);
  if (index === undefined) {
    throw new Error(`Invalid tile notation: ${tile}`);
  }
  return index;
}

export function physicalTileKey(tile: Tile): bigint {
  return PACKED_TILE_WEIGHTS[physicalTileIndex(tile)];
}

export function tileMultisetKey(tiles: readonly Tile[]): bigint {
  let key = 0n;
  for (const tile of tiles) {
    key += physicalTileKey(tile);
  }
  return key;
}

function resolveRedFives(
  input?: Partial<RedFiveConfiguration>
): RedFiveConfiguration {
  const result: RedFiveConfiguration = {
    ...DEFAULT_RED_FIVES,
    ...input,
  };
  for (const suit of ["m", "p", "s"] as const) {
    const count = result[suit];
    if (!Number.isInteger(count) || count < 0 || count > 4) {
      throw new Error(
        `Red-five count for ${suit} must be an integer from 0 to 4`
      );
    }
  }
  return result;
}

function createFullPool(redFives: RedFiveConfiguration): TilePool {
  const counts = PHYSICAL_TILE_TYPES.map((tile) => {
    if (tile[0] === "0") {
      return redFives[tile[1] as Suit];
    }
    if (tile[0] === "5" && tile[1] !== "z") {
      return 4 - redFives[tile[1] as Suit];
    }
    return 4;
  });
  return { counts, total: 136, packedKey: packTileCounts(counts) };
}

function packTileCounts(counts: readonly number[]): bigint {
  let key = 0n;
  for (let index = 0; index < counts.length; index++) {
    key += BigInt(counts[index]) * PACKED_TILE_WEIGHTS[index];
  }
  return key;
}

function removeKnownTile(pool: TilePool, tile: Tile): void {
  if (!isTileNotation(tile)) {
    throw new Error(`Invalid tile notation: ${tile}`);
  }
  const index = physicalTileIndex(tile);
  if (pool.counts[index] <= 0) {
    throw new Error(`${tile} has no configured copies available`);
  }
  const packedKey = tilePoolKey(pool);
  pool.counts[index]--;
  pool.total--;
  pool.packedKey = packedKey - PACKED_TILE_WEIGHTS[index];
}

export function buildUnseenTilePool(input: TilePoolInput): TilePool {
  const pool = createFullPool(resolveRedFives(input.redFives));
  const knownTiles = [
    ...input.hand,
    ...(input.visibleTiles ?? []),
    ...(input.doraIndicators ?? []),
  ];
  for (const tile of knownTiles) {
    removeKnownTile(pool, tile);
  }
  return pool;
}

export function cloneTilePool(pool: TilePool): TilePool {
  return {
    counts: [...pool.counts],
    total: pool.total,
    packedKey: tilePoolKey(pool),
  };
}

export function countInPool(pool: TilePool, tile: Tile): number {
  return pool.counts[physicalTileIndex(tile)];
}

export function takeFromPool(pool: TilePool, tile: Tile): void {
  const index = physicalTileIndex(tile);
  if (pool.counts[index] <= 0) {
    throw new Error(`Cannot draw unavailable tile ${tile}`);
  }
  const packedKey = tilePoolKey(pool);
  pool.counts[index]--;
  pool.total--;
  pool.packedKey = packedKey - PACKED_TILE_WEIGHTS[index];
}

export function returnToPool(pool: TilePool, tile: Tile): void {
  const index = physicalTileIndex(tile);
  const packedKey = tilePoolKey(pool);
  pool.counts[index]++;
  pool.total++;
  pool.packedKey = packedKey + PACKED_TILE_WEIGHTS[index];
}

export function tilePoolEntries(
  pool: TilePool
): Array<{ tile: Tile; count: number }> {
  const entries: Array<{ tile: Tile; count: number }> = [];
  for (let index = 0; index < pool.counts.length; index++) {
    const count = pool.counts[index];
    if (count > 0) {
      entries.push({ tile: PHYSICAL_TILE_TYPES[index], count });
    }
  }
  return entries;
}

export function tilePoolKey(pool: TilePool): bigint {
  pool.packedKey ??= packTileCounts(pool.counts);
  return pool.packedKey;
}
