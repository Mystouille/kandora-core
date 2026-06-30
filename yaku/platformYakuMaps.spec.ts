import { describe, it, expect } from "vitest";

import { riichiLibYakuToRomaji } from "./platformYakuMaps";

describe("riichiLibYakuToRomaji", () => {
  it("converts kanji yaku keys emitted by the riichi lib to romaji", () => {
    const input = {
      立直: "1飜",
      一発: "1飜",
      平和: "1飜",
      断么九: "1飜",
      ドラ: "2飜",
      赤ドラ: "1飜",
    };
    expect(riichiLibYakuToRomaji(input)).toEqual({
      Riichi: "1飜",
      Ippatsu: "1飜",
      Pinfu: "1飜",
      Tanyao: "1飜",
      Dora: "2飜",
      "Aka Dora": "1飜",
    });
  });

  it("collapses per-tile wind / dragon variants onto the canonical Han", () => {
    expect(
      riichiLibYakuToRomaji({
        場風東: "1飜",
        自風南: "1飜",
        役牌白: "1飜",
        役牌発: "1飜",
        役牌中: "1飜",
      })
    ).toEqual({
      Bakaze: "1飜",
      Jikaze: "1飜",
      Haku: "1飜",
      Hatsu: "1飜",
      Chun: "1飜",
    });
  });

  it("maps yakuman labels and preserves the lib's value format", () => {
    expect(
      riichiLibYakuToRomaji({
        大三元: "役満",
        四暗刻単騎待ち: "役満",
      })
    ).toEqual({
      Daisangen: "役満",
      "Suuankou Tanki": "役満",
    });
  });

  it("preserves insertion order so downstream display matches scorer output", () => {
    const result = riichiLibYakuToRomaji({
      立直: "1飜",
      一発: "1飜",
      ドラ: "2飜",
    });
    expect(Object.keys(result)).toEqual(["Riichi", "Ippatsu", "Dora"]);
  });

  it("leaves unknown / custom yaku keys unchanged", () => {
    expect(
      riichiLibYakuToRomaji({
        立直: "1飜",
        "Custom Yaku": "5飜",
      })
    ).toEqual({
      Riichi: "1飜",
      "Custom Yaku": "5飜",
    });
  });
});
