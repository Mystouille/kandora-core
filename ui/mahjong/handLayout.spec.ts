import { describe, expect, it } from "vitest";

import {
  MeldSource,
  MeldType,
  TILE_SETS,
  TileSetName,
  parseHand,
  resolveTileSetImageUrls,
} from "./handLayout";

describe("parseHand", () => {
  it("separates adjacent unmarked triplets", () => {
    expect(parseHand("1234567p 444z333s").melds).toEqual([
      {
        tiles: ["4z", "4z", "4z"],
        type: MeldType.Pon,
        source: MeldSource.Kamicha,
      },
      {
        tiles: ["3s", "3s", "3s"],
        type: MeldType.Pon,
        source: MeldSource.Kamicha,
      },
    ]);
  });
});

describe("resolveTileSetImageUrls", () => {
  it("uses the light-border Uzaku atlas only in dark mode", () => {
    const config = TILE_SETS[TileSetName.Uzaku];

    const lightUrls = resolveTileSetImageUrls(config, false);
    const darkUrls = resolveTileSetImageUrls(config, true);

    expect(lightUrls.tilesImageUrl).toBe(config.tilesImageUrl);
    expect(darkUrls.tilesImageUrl).toBe(config.darkImageUrls?.tilesImageUrl);
    expect(darkUrls.inlineTilesImageUrl).toBe(
      config.darkImageUrls?.inlineTilesImageUrl
    );
    expect(darkUrls.calledImageUrl).toBe(config.darkImageUrls?.calledImageUrl);
    expect(darkUrls.tilesImageUrl).not.toBe(lightUrls.tilesImageUrl);
  });

  it("falls back to the default atlas when no dark override exists", () => {
    const config = TILE_SETS[TileSetName.MahjongSoul];

    expect(resolveTileSetImageUrls(config, true)).toEqual(
      resolveTileSetImageUrls(config, false)
    );
  });
});
