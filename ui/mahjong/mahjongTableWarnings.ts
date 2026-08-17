import { MeldType, parseHand, type MeldToDisplay } from "./handLayout";
import {
  MAHJONG_TABLE_POSITIONS,
  type MahjongTableStateV1,
} from "./mahjongTableState";

export interface MahjongTableTileCount {
  tile: string;
  count: number;
}

export type MahjongTableWarning =
  | {
      code: "unexpected-points-total";
      total: number;
    }
  | {
      code: "tile-copy-limit";
      tiles: MahjongTableTileCount[];
    };

function canonicalTile(tile: string): string | null {
  if (tile === "8z") {
    return null;
  }
  return tile[0] === "0" ? `5${tile[1]}` : tile;
}

function addTile(
  tileCounts: Map<string, number>,
  tile: string,
  copies = 1
): void {
  const canonical = canonicalTile(tile);
  if (canonical) {
    tileCounts.set(canonical, (tileCounts.get(canonical) ?? 0) + copies);
  }
}

function addMeldTiles(
  tileCounts: Map<string, number>,
  meld: MeldToDisplay
): void {
  const knownTiles = meld.tiles
    .map(canonicalTile)
    .filter((tile): tile is string => tile !== null);
  const knownTile = knownTiles[0];

  if (
    meld.type === MeldType.Ankan &&
    knownTile &&
    knownTiles.every((tile) => tile === knownTile)
  ) {
    addTile(tileCounts, knownTile, meld.tiles.length);
    return;
  }

  for (const tile of knownTiles) {
    addTile(tileCounts, tile);
  }
}

export function getMahjongTableWarnings(
  state: MahjongTableStateV1
): MahjongTableWarning[] {
  const warnings: MahjongTableWarning[] = [];
  const hasPoints = MAHJONG_TABLE_POSITIONS.some(
    (position) => state.players[position].points !== null
  );
  const pointsTotal = MAHJONG_TABLE_POSITIONS.reduce(
    (total, position) => total + (state.players[position].points ?? 0),
    state.riichiSticks * 1000
  );

  if (hasPoints && pointsTotal !== 100000 && pointsTotal !== 120000) {
    warnings.push({ code: "unexpected-points-total", total: pointsTotal });
  }

  const tileCounts = new Map<string, number>();
  for (const tile of state.doraIndicators) {
    addTile(tileCounts, tile);
  }

  for (const position of MAHJONG_TABLE_POSITIONS) {
    const player = state.players[position];
    const parsedHand = parseHand(player.hand);
    for (const tile of parsedHand.closedTiles) {
      addTile(tileCounts, tile);
    }
    for (const meld of parsedHand.melds) {
      addMeldTiles(tileCounts, meld);
    }
    for (const discard of player.discards) {
      if (!discard.called) {
        addTile(tileCounts, discard.tile);
      }
    }
  }

  const excessiveTiles = [...tileCounts.entries()]
    .filter(([, count]) => count > 4)
    .map(([tile, count]) => ({ tile, count }));
  if (excessiveTiles.length > 0) {
    warnings.push({ code: "tile-copy-limit", tiles: excessiveTiles });
  }

  return warnings;
}
