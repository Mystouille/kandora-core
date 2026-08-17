import { describe, expect, it } from "vitest";

import {
  MAHJONG_TABLE_POSITIONS,
  createDefaultMahjongTableState,
} from "./mahjongTableState";
import { getMahjongTableWarnings } from "./mahjongTableWarnings";

describe("getMahjongTableWarnings", () => {
  it("accepts standard point totals and includes outstanding riichi sticks", () => {
    const state = createDefaultMahjongTableState();
    for (const position of MAHJONG_TABLE_POSITIONS) {
      state.players[position].points = 25000;
    }

    expect(getMahjongTableWarnings(state)).toEqual([]);

    for (const position of MAHJONG_TABLE_POSITIONS) {
      state.players[position].points = 30000;
    }
    expect(getMahjongTableWarnings(state)).toEqual([]);

    for (const position of MAHJONG_TABLE_POSITIONS) {
      state.players[position].points = 25000;
    }
    state.players.bottom.points = 24000;
    state.riichiSticks = 1;
    expect(getMahjongTableWarnings(state)).toEqual([]);

    state.players.bottom.points = 23900;
    expect(getMahjongTableWarnings(state)).toContainEqual({
      code: "unexpected-points-total",
      total: 99900,
    });
  });

  it("does not warn about points when no scores are entered", () => {
    expect(getMahjongTableWarnings(createDefaultMahjongTableState())).toEqual(
      []
    );
  });

  it("counts concealed kans and red fives but not called discards twice", () => {
    const state = createDefaultMahjongTableState();
    state.players.bottom.hand = "1p xx55m";
    state.players.right.discards = [
      {
        tile: "0m",
        called: true,
        riichi: false,
        tsumogiri: false,
      },
    ];

    expect(getMahjongTableWarnings(state)).toEqual([]);

    state.doraIndicators = ["0m"];
    expect(getMahjongTableWarnings(state)).toEqual([
      {
        code: "tile-copy-limit",
        tiles: [{ tile: "5m", count: 5 }],
      },
    ]);
  });
});
