import { describe, expect, it } from "vitest";

import {
  createDefaultMahjongTableState,
  decodeMahjongTableState,
  deriveMahjongTableWind,
  discardsToRows,
  encodeMahjongTableState,
  expandDoraIndicatorSlots,
  formatDiscardSequence,
  parseDiscardNotation,
  parseDiscardRows,
  parseDiscardSequence,
  parseDoraIndicators,
  segmentDiscardNotation,
  validateHandNotation,
} from "./mahjongTableState";

describe("Mahjong table discard notation", () => {
  it("parses each discard modifier and both combined marker orders", () => {
    const result = parseDiscardNotation("3s 3S 3's 3cs 3'cs 3c's");

    expect(result).toEqual({
      ok: true,
      value: [
        { tile: "3s", tsumogiri: false, called: false, riichi: false },
        { tile: "3s", tsumogiri: true, called: false, riichi: false },
        { tile: "3s", tsumogiri: false, called: false, riichi: true },
        { tile: "3s", tsumogiri: false, called: true, riichi: false },
        { tile: "3s", tsumogiri: false, called: true, riichi: true },
        { tile: "3s", tsumogiri: false, called: true, riichi: true },
      ],
    });
  });

  it("accepts compact groups and red fives", () => {
    const result = parseDiscardNotation("123m0P77z");

    expect(result).toMatchObject({
      ok: true,
      value: [
        { tile: "1m", tsumogiri: false },
        { tile: "2m", tsumogiri: false },
        { tile: "3m", tsumogiri: false },
        { tile: "0p", tsumogiri: true },
        { tile: "7z", tsumogiri: false },
        { tile: "7z", tsumogiri: false },
      ],
    });
  });

  it("round-trips normalized discard rows", () => {
    const parsed = parseDiscardRows(["1m 2M 3'cs 4p 5p 6p", "7s 8s 9s", ""]);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }

    expect(discardsToRows(parsed.value)).toEqual([
      "1m 2M 3'cs 4p 5p 6p",
      "7s 8s 9s",
      "",
    ]);
  });

  it("rejects overfull rows and multiple riichi declarations", () => {
    expect(parseDiscardRows(["1234567m"])).toMatchObject({ ok: false });
    expect(
      parseDiscardRows(["123456m", "123456p", "123456789s"])
    ).toMatchObject({ ok: true });
    expect(
      parseDiscardRows(["123456m", "123456p", "123456789s1z"])
    ).toMatchObject({ ok: false });
    expect(parseDiscardRows(["1'm", "2'p"])).toMatchObject({ ok: false });
  });

  it("validates and formats one discard field up to 21 tiles", () => {
    const parsed = parseDiscardSequence(
      "1m 2M 3'cs 4p 5p 6p 7s 8S 9s 1z 2z 3z 4z 5z 6z 7z 1p 2p 3p 4p 5p"
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }

    expect(formatDiscardSequence(parsed.value)).toBe(
      "1m 2M 3'cs 4p 5p 6p 7s 8S 9s 1z 2z 3z 4z 5z 6z 7z 1p 2p 3p 4p 5p"
    );
    expect(parseDiscardSequence("123456789m123456789p1234s")).toMatchObject({
      ok: false,
    });
    expect(parseDiscardSequence("1'm 2'p")).toMatchObject({ ok: false });
  });

  it("segments discard characters by their logical 6/6/9 row", () => {
    const segments = segmentDiscardNotation("123456m 789p123s 456789s123z");

    expect(segments).toEqual([
      { text: "123456m", line: 0 },
      { text: " ", line: null },
      { text: "789p123s", line: 1 },
      { text: " ", line: null },
      { text: "456789s123z", line: 2 },
    ]);
  });

  it("rejects invalid ranks and duplicate markers", () => {
    expect(parseDiscardNotation("8z")).toMatchObject({ ok: false });
    expect(parseDiscardNotation("3ccs")).toMatchObject({ ok: false });
    expect(parseDiscardNotation("3''s")).toMatchObject({ ok: false });
  });
});

describe("Mahjong table hand and center notation", () => {
  it("accepts compact hands, explicit backs, gaps, and meld markers", () => {
    expect(validateHandNotation("123m456p789s11z_x 1'23m xx55p")).toEqual({
      ok: true,
      value: "123m456p789s11z_x 1'23m xx55p",
    });
  });

  it("rejects called markers in the concealed hand", () => {
    expect(validateHandNotation("1'23m")).toMatchObject({ ok: false });
  });

  it("parses revealed indicators and fills the five dead-wall slots", () => {
    const parsed = parseDoraIndicators("4m7p");
    expect(parsed).toEqual({ ok: true, value: ["4m", "7p"] });
    expect(expandDoraIndicatorSlots(["4m", "7p"])).toEqual([
      "4m",
      "7p",
      "8z",
      "8z",
      "8z",
    ]);
  });

  it("does not accept explicit dora backs or more than five indicators", () => {
    expect(parseDoraIndicators("4mx")).toMatchObject({ ok: false });
    expect(parseDoraIndicators("123456m")).toMatchObject({ ok: false });
  });
});

describe("Mahjong table state codec", () => {
  it("derives winds clockwise from the focused bottom seat", () => {
    expect(deriveMahjongTableWind("S", "bottom")).toBe("S");
    expect(deriveMahjongTableWind("S", "right")).toBe("W");
    expect(deriveMahjongTableWind("S", "top")).toBe("N");
    expect(deriveMahjongTableWind("S", "left")).toBe("E");
  });

  it("creates a blank draft with only the focused hand visible", () => {
    const state = createDefaultMahjongTableState();
    expect(state.doraIndicators).toEqual([]);
    expect(state.players.bottom.showConcealed).toBe(true);
    expect(state.players.right.showConcealed).toBe(false);
    expect(state.players.top.showConcealed).toBe(false);
    expect(state.players.left.showConcealed).toBe(false);
    for (const position of ["bottom", "right", "top", "left"] as const) {
      expect(state.players[position].hand).toBe("");
      expect(state.players[position].points).toBeNull();
      expect(state.players[position].discards).toEqual([]);
    }
  });

  it("round-trips a validated V1 state", () => {
    const state = createDefaultMahjongTableState();
    state.doraIndicators = ["4m", "7p"];
    state.players.bottom.hand = "123m456p789s11z";
    state.players.bottom.points = -500;
    const discards = parseDiscardNotation("1m2M3'cs");
    expect(discards.ok).toBe(true);
    if (!discards.ok) {
      return;
    }
    state.players.bottom.discards = discards.value;

    const encoded = encodeMahjongTableState(state);
    expect(encoded.ok).toBe(true);
    if (!encoded.ok) {
      return;
    }
    expect(decodeMahjongTableState(encoded.value, "1")).toEqual({
      ok: true,
      value: state,
    });
  });

  it("fails closed for malformed JSON, incomplete states, and unknown versions", () => {
    expect(decodeMahjongTableState("not-json")).toMatchObject({ ok: false });
    expect(decodeMahjongTableState("{}", 1)).toMatchObject({ ok: false });
    expect(decodeMahjongTableState("{}", 2)).toMatchObject({ ok: false });

    const state = createDefaultMahjongTableState();
    expect(encodeMahjongTableState(state)).toMatchObject({ ok: false });
  });
});
