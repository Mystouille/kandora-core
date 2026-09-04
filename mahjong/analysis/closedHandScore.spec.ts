import { describe, expect, it } from "vitest";

import { Han } from "../../types/Han";
import {
  createClosedHandScoreCache,
  doraToIndicator,
  scoreClosedHand,
} from "./closedHandScore";
import type { Tile } from "../rules/types";

function tiles(notation: string): Tile[] {
  const result: Tile[] = [];
  let digits = "";
  for (const character of notation) {
    if (/\d/.test(character)) {
      digits += character;
      continue;
    }
    for (const digit of digits) {
      result.push(`${digit}${character}`);
    }
    digits = "";
  }
  return result;
}

describe("scoreClosedHand", () => {
  it("converts dora tiles back to their physical indicators", () => {
    expect(doraToIndicator("1m")).toBe("9m");
    expect(doraToIndicator("5m")).toBe("4m");
    expect(doraToIndicator("0m")).toBe("4m");
    expect(doraToIndicator("1z")).toBe("4z");
    expect(doraToIndicator("4z")).toBe("3z");
    expect(doraToIndicator("5z")).toBe("7z");
    expect(doraToIndicator("7z")).toBe("6z");
  });

  it("scores the same closed tsumo differently for dama and riichi", () => {
    const input = {
      hand: tiles("234m234p11s23445s"),
      winTile: "6s" as Tile,
      tsumo: true,
    };

    const dama = scoreClosedHand(input);
    const riichi = scoreClosedHand({ ...input, riichi: true });

    expect(dama.isAgari).toBe(true);
    expect(dama.han).toBe(4);
    expect(dama.ten).toBe(5200);
    expect(riichi.han).toBe(5);
    expect(riichi.ten).toBe(8000);
    expect(riichi.yaku.map((entry) => entry.id)).toContain(Han.Riichi);
  });

  it("separates regular, red, and ura dora with canonical ids", () => {
    const result = scoreClosedHand({
      hand: tiles("234m234p11s23445s"),
      winTile: "6s",
      tsumo: true,
      riichi: true,
      doraIndicators: ["1m"],
      uraDoraIndicators: ["1m"],
    });

    expect(result.doraCount).toBe(1);
    expect(result.uraDoraCount).toBe(1);
    expect(result.akaDoraCount).toBe(0);
    expect(result.yaku).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: Han.Dora, value: "1飜" }),
        expect.objectContaining({ id: Han.Ura_Dora, value: "1飜" }),
      ])
    );
  });

  it("keeps the corrected penchan wait fu", () => {
    const result = scoreClosedHand({
      hand: tiles("12355m23445689p"),
      winTile: "7p",
      tsumo: false,
      riichi: true,
      roundWind: "E",
      seatWind: "E",
    });

    expect(result.fu).toBe(40);
    expect(result.ten).toBe(2000);
  });

  it("scores an open hand with a declared yakuhai meld", () => {
    const result = scoreClosedHand({
      hand: tiles("123m456p78s11z"),
      winTile: "9s",
      tsumo: false,
      melds: [{ type: "pon", tiles: ["5z", "5z", "5z"] }],
    });

    expect(result.isAgari).toBe(true);
    expect(result.yaku.map((entry) => entry.id)).toContain(Han.White_Dragon);
  });

  it("rejects a hand that does not contain thirteen pre-win tiles", () => {
    expect(() =>
      scoreClosedHand({ hand: tiles("12m"), winTile: "3m", tsumo: true })
    ).toThrow(/13 concealed tiles/i);
  });

  it("caches complete inputs without conflating regular and ura dora", () => {
    const score = createClosedHandScoreCache();
    const input = {
      hand: tiles("234m234p11s23445s"),
      winTile: "6s" as Tile,
      tsumo: true,
      riichi: true,
    };
    const regularDora = score({ ...input, doraIndicators: ["1m"] });

    expect(score({ ...input, doraIndicators: ["1m"] })).toBe(regularDora);

    const uraDora = score({ ...input, uraDoraIndicators: ["1m"] });
    expect(uraDora).not.toBe(regularDora);
    expect(regularDora.doraCount).toBe(1);
    expect(regularDora.uraDoraCount).toBe(0);
    expect(uraDora.doraCount).toBe(0);
    expect(uraDora.uraDoraCount).toBe(1);
    expect(score({ ...input, doraIndicators: ["0m"] })).toBe(
      score({ ...input, doraIndicators: ["5m"] })
    );
  });
});
