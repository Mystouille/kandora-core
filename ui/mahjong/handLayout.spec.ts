import { describe, expect, it } from "vitest";

import { TILE_SETS, TileSetName, resolveTileSetImageUrls } from "./handLayout";

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
