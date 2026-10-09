import { describe, expect, it } from "vitest";

import {
  MCR_FLOWER_NAMES,
  MCR_FLOWER_TILES,
  isMcrFlowerTile,
  isMcrWinningShape,
  mcrAcceptanceTiles,
  mcrShanten,
  mcrWaits,
  splitMcrFlowers,
} from "./mcrShanten";
import type { HandCounts } from "./shanten";
import type { Tile } from "./types";

const honors: Tile[] = ["1z", "2z", "3z", "4z", "5z", "6z", "7z"];
const knittedStraight: Tile[] = [
  "1m",
  "4m",
  "7m",
  "2p",
  "5p",
  "8p",
  "3s",
  "6s",
  "9s",
];

describe("MCR structural analysis", () => {
  it("supports a standard hand with a declared meld", () => {
    const standingHand: Tile[] = [
      "1m",
      "2m",
      "3m",
      "1p",
      "2p",
      "3p",
      "1s",
      "2s",
      "3s",
      "7z",
    ];

    expect(mcrShanten(standingHand, 1)).toBe(0);
    expect(mcrWaits(standingHand, 1)).toEqual(["7z"]);
    expect(isMcrWinningShape([...standingHand, "7z"], 1)).toBe(true);
    expect(
      isMcrWinningShape(standingHand, [{ tiles: ["4m", "5m", "6m"] }], "7z")
    ).toBe(true);
  });

  it("supports seven pairs and treats a concealed quad as two pairs", () => {
    const standingHand: Tile[] = [
      "1m",
      "1m",
      "2m",
      "2m",
      "3m",
      "3m",
      "4p",
      "4p",
      "5p",
      "5p",
      "6s",
      "6s",
      "7z",
    ];

    expect(mcrShanten(standingHand)).toBe(0);
    expect(mcrWaits(standingHand)).toContain("7z");
    expect(isMcrWinningShape([...standingHand, "7z"])).toBe(true);

    const handWithQuad: Tile[] = [
      "1m",
      "1m",
      "1m",
      "1m",
      "2m",
      "2m",
      "3m",
      "3m",
      "4p",
      "4p",
      "5p",
      "5p",
      "6s",
      "6s",
    ];
    expect(isMcrWinningShape(handWithQuad)).toBe(true);
  });

  it("supports the thirteen-orphans thirteen-sided wait", () => {
    const standingHand: Tile[] = [
      "1m",
      "9m",
      "1p",
      "9p",
      "1s",
      "9s",
      ...honors,
    ];

    expect(mcrShanten(standingHand)).toBe(0);
    expect(mcrWaits(standingHand)).toEqual(standingHand);
    expect(isMcrWinningShape([...standingHand, "5z"])).toBe(true);
  });

  it("supports Greater and Lesser Honors and Knitted Tiles", () => {
    const greaterStandingHand: Tile[] = [
      ...honors,
      "1m",
      "4m",
      "7m",
      "2p",
      "5p",
      "8p",
    ];
    const greaterWaits: Tile[] = ["3s", "6s", "9s"];

    expect(mcrShanten(greaterStandingHand)).toBe(0);
    expect(mcrAcceptanceTiles(greaterStandingHand)).toEqual(greaterWaits);
    expect(mcrWaits(greaterStandingHand)).toEqual(greaterWaits);
    expect(isMcrWinningShape([...greaterStandingHand, "3s"])).toBe(true);

    const lesserWinningHand: Tile[] = [
      "2m",
      "5m",
      "8m",
      "1s",
      "4s",
      "7s",
      "3p",
      "6p",
      "1z",
      "2z",
      "3z",
      "5z",
      "6z",
      "7z",
    ];
    expect(mcrShanten(lesserWinningHand)).toBe(-1);
    expect(isMcrWinningShape(lesserWinningHand)).toBe(true);
  });

  it("supports a Knitted Straight with its residual meld and pair", () => {
    const standingHand: Tile[] = [...knittedStraight, "1m", "2m", "3m", "5z"];

    expect(mcrShanten(standingHand)).toBe(0);
    expect(mcrWaits(standingHand)).toContain("5z");
    expect(isMcrWinningShape([...standingHand, "5z"])).toBe(true);
  });

  it("allows the residual Knitted Straight meld to be declared", () => {
    const standingHand: Tile[] = [...knittedStraight, "5z"];

    expect(mcrShanten(standingHand, 1)).toBe(0);
    expect(mcrWaits(standingHand, 1)).toEqual(["5z"]);
    expect(isMcrWinningShape([...standingHand, "5z"], 1)).toBe(true);
  });
});

describe("MCR tile validation and flowers", () => {
  it("models all eight unique replacement flowers separately", () => {
    expect(MCR_FLOWER_TILES).toHaveLength(8);
    expect(new Set(MCR_FLOWER_TILES).size).toBe(8);
    expect(MCR_FLOWER_NAMES["1f"]).toBe("plum");
    expect(MCR_FLOWER_NAMES["8f"]).toBe("winter");
    expect(isMcrFlowerTile("1f")).toBe(true);
    expect(isMcrFlowerTile("8f")).toBe(true);
    expect(isMcrFlowerTile("1m")).toBe(false);
    expect(splitMcrFlowers(["1m", "1f", "8f", "2m"])).toEqual({
      standingTiles: ["1m", "2m"],
      flowers: ["1f", "8f"],
    });
  });

  it("rejects flowers, invalid tiles, impossible multiplicities, and bad sizes", () => {
    expect(() =>
      mcrShanten([
        "1m",
        "2m",
        "3m",
        "1p",
        "2p",
        "3p",
        "1s",
        "2s",
        "3s",
        "7z",
        "7z",
        "1z",
        "1f",
      ])
    ).toThrow(/flower.*bonus/i);
    expect(() =>
      mcrShanten([...knittedStraight, "8z", "1z", "2z", "3z"])
    ).toThrow(/invalid MCR tile/i);
    expect(() =>
      mcrShanten([
        "1m",
        "1m",
        "1m",
        "1m",
        "1m",
        "2m",
        "3m",
        "4m",
        "5m",
        "6m",
        "7m",
        "8m",
        "9m",
      ])
    ).toThrow(/more than four/i);
    expect(() => mcrShanten(knittedStraight)).toThrow(
      /standing hand.*13 or 14/i
    );
    expect(() => splitMcrFlowers(["1f", "1f"])).toThrow(/duplicate flower/i);
  });

  it("rejects malformed count arrays and wrong analysis phases", () => {
    const malformedCounts = {
      m: new Array(8).fill(0),
      p: new Array(9).fill(0),
      s: new Array(9).fill(0),
      z: new Array(7).fill(0),
    } as HandCounts;

    expect(() => mcrShanten(malformedCounts)).toThrow(/exactly 9 counts/i);
    expect(() =>
      mcrAcceptanceTiles([...knittedStraight, "1z", "2z", "3z", "4z", "5z"])
    ).toThrow(/draw-ready standing hand/i);
    expect(() =>
      isMcrWinningShape([...knittedStraight, "1z", "2z", "3z", "4z"])
    ).toThrow(/complete standing hand/i);
    expect(() =>
      mcrShanten([...knittedStraight, "1z", "2z", "3z", "0m"])
    ).toThrow(/invalid MCR tile/i);
    expect(() =>
      isMcrWinningShape(
        [...knittedStraight, "5z"],
        [{ tiles: ["1m", "2m", "4m"] }],
        "5z"
      )
    ).toThrow(/invalid MCR declared meld/i);
  });
});
