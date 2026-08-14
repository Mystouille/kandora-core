export const MAHJONG_TABLE_STATE_VERSION = 1 as const;

export const MAHJONG_TABLE_POSITIONS = [
  "bottom",
  "right",
  "top",
  "left",
] as const;

export const MAHJONG_TABLE_WINDS = ["E", "S", "W", "N"] as const;

export type MahjongTablePosition = (typeof MAHJONG_TABLE_POSITIONS)[number];
export type MahjongTableWind = (typeof MAHJONG_TABLE_WINDS)[number];

export interface MahjongTableDiscard {
  tile: string;
  tsumogiri: boolean;
  called: boolean;
  riichi: boolean;
}

export interface MahjongTableDiscardTextSegment {
  text: string;
  line: 0 | 1 | 2 | null;
}

export interface MahjongTablePlayerState {
  hand: string;
  showConcealed: boolean;
  points: number | null;
  discards: MahjongTableDiscard[];
}

export interface MahjongTableStateV1 {
  version: typeof MAHJONG_TABLE_STATE_VERSION;
  bottomWind: MahjongTableWind;
  roundWind: MahjongTableWind;
  roundNumber: number;
  honba: number;
  riichiSticks: number;
  doraIndicators: string[];
  players: Record<MahjongTablePosition, MahjongTablePlayerState>;
}

export interface MahjongTableParseSuccess<T> {
  ok: true;
  value: T;
}

export interface MahjongTableParseFailure {
  ok: false;
  error: string;
}

// prettier-ignore
export type MahjongTableParseResult<T> =
  | MahjongTableParseSuccess<T>
  | MahjongTableParseFailure;

const TILE_SUIT_PATTERN = /^[mpsz]$/;
const DISCARD_SUIT_PATTERN = /^[mpszMPSZ]$/;

function success<T>(value: T): MahjongTableParseResult<T> {
  return { ok: true, value };
}

function failure<T>(error: string): MahjongTableParseResult<T> {
  return { ok: false, error };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && typeof value === "number" && value >= 0;
}

function isWind(value: unknown): value is MahjongTableWind {
  return MAHJONG_TABLE_WINDS.includes(value as MahjongTableWind);
}

function validateTileRank(
  rank: string,
  suit: string,
  allowBack: boolean
): string | null {
  const numericRank = Number(rank);
  const normalizedSuit = suit.toLowerCase();

  if (normalizedSuit === "z") {
    if (numericRank >= 1 && numericRank <= 7) {
      return `${rank}z`;
    }
    if (allowBack && numericRank === 8) {
      return "8z";
    }
    return null;
  }

  if (
    normalizedSuit !== "m" &&
    normalizedSuit !== "p" &&
    normalizedSuit !== "s"
  ) {
    return null;
  }
  if (numericRank < 0 || numericRank > 9) {
    return null;
  }
  return `${rank}${normalizedSuit}`;
}

export function isMahjongTableTile(
  value: unknown,
  allowBack = false
): value is string {
  if (typeof value !== "string" || value.length !== 2) {
    return false;
  }
  return validateTileRank(value[0], value[1], allowBack) === value;
}

export function createDefaultMahjongTableState(): MahjongTableStateV1 {
  const players = {} as Record<MahjongTablePosition, MahjongTablePlayerState>;

  for (const position of MAHJONG_TABLE_POSITIONS) {
    players[position] = {
      hand: "",
      showConcealed: position === "bottom",
      points: null,
      discards: [],
    };
  }

  return {
    version: MAHJONG_TABLE_STATE_VERSION,
    bottomWind: "E",
    roundWind: "E",
    roundNumber: 1,
    honba: 0,
    riichiSticks: 0,
    doraIndicators: [],
    players,
  };
}

export function deriveMahjongTableWind(
  bottomWind: MahjongTableWind,
  position: MahjongTablePosition
): MahjongTableWind {
  const bottomIndex = MAHJONG_TABLE_WINDS.indexOf(bottomWind);
  const positionIndex = MAHJONG_TABLE_POSITIONS.indexOf(position);
  return MAHJONG_TABLE_WINDS[
    (bottomIndex + positionIndex) % MAHJONG_TABLE_WINDS.length
  ];
}

function parsePlainTileSequence(
  input: string,
  options: { allowBack: boolean; maximum: number; label: string }
): MahjongTableParseResult<string[]> {
  const tiles: string[] = [];
  let index = 0;

  while (index < input.length) {
    const character = input[index];
    if (/\s/.test(character)) {
      index += 1;
      continue;
    }

    if (character === "x" || character === "X") {
      if (!options.allowBack) {
        return failure(`${options.label} cannot contain facedown tiles.`);
      }
      tiles.push("8z");
      index += 1;
    } else if (/\d/.test(character)) {
      const ranks: string[] = [];
      while (index < input.length && /\d/.test(input[index])) {
        ranks.push(input[index]);
        index += 1;
      }

      const suit = input[index];
      if (!suit || !TILE_SUIT_PATTERN.test(suit)) {
        return failure(`${options.label} has a tile without a valid suit.`);
      }
      index += 1;

      for (const rank of ranks) {
        const tile = validateTileRank(rank, suit, false);
        if (!tile) {
          return failure(`${rank}${suit} is not a valid tile.`);
        }
        tiles.push(tile);
      }
    } else {
      return failure(
        `${options.label} contains an unexpected character at position ${index + 1}.`
      );
    }

    if (tiles.length > options.maximum) {
      return failure(
        `${options.label} can contain at most ${options.maximum} tiles.`
      );
    }
  }

  return success(tiles);
}

export function parseDoraIndicators(
  input: string
): MahjongTableParseResult<string[]> {
  const result = parsePlainTileSequence(input.trim(), {
    allowBack: false,
    maximum: 5,
    label: "Dora indicators",
  });
  if (!result.ok) {
    return result;
  }
  if (result.value.length === 0) {
    return failure("At least one dora indicator is required.");
  }
  return result;
}

export function expandDoraIndicatorSlots(
  indicators: readonly string[]
): string[] {
  return [...indicators.slice(0, 5), ...Array(5).fill("8z")].slice(0, 5);
}

export function validateHandNotation(
  input: string
): MahjongTableParseResult<string> {
  const normalized = input.trim().replace(/\s+/g, " ");
  if (!normalized) {
    return success("");
  }

  const segments = normalized.split(" ");
  for (
    let segmentIndex = 0;
    segmentIndex < segments.length;
    segmentIndex += 1
  ) {
    const segment = segments[segmentIndex];
    const allowCalledMarker = segmentIndex > 0;
    let index = 0;
    let pending: Array<{ rank: string; back: boolean }> = [];

    while (index < segment.length) {
      const character = segment[index];
      if (character === "_") {
        index += 1;
        continue;
      }
      if (!/\d/.test(character) && character !== "x" && character !== "X") {
        return failure(`Hand segment "${segment}" has invalid notation.`);
      }

      const back = character === "x" || character === "X";
      pending.push({ rank: back ? "8" : character, back });
      index += 1;

      let calledMarkerCount = 0;
      while (segment[index] === "'") {
        calledMarkerCount += 1;
        index += 1;
      }
      if (calledMarkerCount > 0 && !allowCalledMarker) {
        return failure("Called-tile markers are only valid inside melds.");
      }
      if (calledMarkerCount > 2) {
        return failure("A meld tile can contain at most two called markers.");
      }

      const suit = segment[index];
      if (suit && TILE_SUIT_PATTERN.test(suit)) {
        for (const token of pending) {
          if (!token.back && !validateTileRank(token.rank, suit, false)) {
            return failure(`${token.rank}${suit} is not a valid tile.`);
          }
        }
        pending = [];
        index += 1;
      } else if (
        index < segment.length &&
        !/\d/.test(segment[index]) &&
        segment[index] !== "x" &&
        segment[index] !== "X" &&
        segment[index] !== "_"
      ) {
        return failure(`Hand segment "${segment}" has invalid notation.`);
      }
    }

    if (pending.some((token) => !token.back)) {
      return failure(`Hand segment "${segment}" has a tile without a suit.`);
    }
  }

  return success(normalized);
}

export function parseDiscardNotation(
  input: string
): MahjongTableParseResult<MahjongTableDiscard[]> {
  const discards: MahjongTableDiscard[] = [];
  let index = 0;

  while (index < input.length) {
    if (/\s/.test(input[index])) {
      index += 1;
      continue;
    }

    const pending: Array<{
      rank: string;
      called: boolean;
      riichi: boolean;
    }> = [];

    while (index < input.length && /\d/.test(input[index])) {
      const rank = input[index];
      index += 1;
      let called = false;
      let riichi = false;

      while (input[index] === "c" || input[index] === "'") {
        if (input[index] === "c") {
          if (called) {
            return failure("A discard cannot contain two called markers.");
          }
          called = true;
        } else {
          if (riichi) {
            return failure("A discard cannot contain two riichi markers.");
          }
          riichi = true;
        }
        index += 1;
      }

      pending.push({ rank, called, riichi });
    }

    if (pending.length === 0) {
      return failure(`Discard notation is invalid at position ${index + 1}.`);
    }

    const suit = input[index];
    if (!suit || !DISCARD_SUIT_PATTERN.test(suit)) {
      return failure("A discard tile is missing a valid suit.");
    }
    index += 1;

    for (const token of pending) {
      const tile = validateTileRank(token.rank, suit, false);
      if (!tile) {
        return failure(`${token.rank}${suit} is not a valid discard tile.`);
      }
      discards.push({
        tile,
        called: token.called,
        riichi: token.riichi,
        tsumogiri: suit === suit.toUpperCase(),
      });
    }
  }

  return success(discards);
}

export function parseDiscardSequence(
  input: string
): MahjongTableParseResult<MahjongTableDiscard[]> {
  const parsed = parseDiscardNotation(input);
  if (!parsed.ok) {
    return parsed;
  }
  if (parsed.value.length > 21) {
    return failure("A discard pond can contain at most 21 tiles.");
  }
  if (parsed.value.filter((discard) => discard.riichi).length > 1) {
    return failure("A player can have only one riichi discard.");
  }
  return parsed;
}

export function parseDiscardRows(
  rows: readonly string[]
): MahjongTableParseResult<MahjongTableDiscard[]> {
  if (rows.length > 3) {
    return failure("A discard pond can contain at most three rows.");
  }

  const discards: MahjongTableDiscard[] = [];
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const parsed = parseDiscardNotation(rows[rowIndex]);
    if (!parsed.ok) {
      return failure(`Discard row ${rowIndex + 1}: ${parsed.error}`);
    }
    const maximum = rowIndex === 2 ? 9 : 6;
    if (parsed.value.length > maximum) {
      return failure(
        `Discard row ${rowIndex + 1} can contain at most ${maximum} tiles.`
      );
    }
    discards.push(...parsed.value);
  }

  if (discards.length > 21) {
    return failure("A discard pond can contain at most 21 tiles.");
  }
  if (discards.filter((discard) => discard.riichi).length > 1) {
    return failure("A player can have only one riichi discard.");
  }
  return success(discards);
}

export function formatDiscard(discard: MahjongTableDiscard): string {
  const rank = discard.tile[0];
  const baseSuit = discard.tile[1];
  const suit = discard.tsumogiri ? baseSuit.toUpperCase() : baseSuit;
  return `${rank}${discard.riichi ? "'" : ""}${discard.called ? "c" : ""}${suit}`;
}

export function formatDiscardSequence(
  discards: readonly MahjongTableDiscard[]
): string {
  return discards.map(formatDiscard).join(" ");
}

export function segmentDiscardNotation(
  input: string
): MahjongTableDiscardTextSegment[] {
  const segments: MahjongTableDiscardTextSegment[] = [];
  let tileIndex = 0;
  let index = 0;
  let lastTileLine: 0 | 1 | 2 | null = null;

  const append = (text: string, line: 0 | 1 | 2 | null) => {
    const previous = segments[segments.length - 1];
    if (previous?.line === line) {
      previous.text += text;
    } else {
      segments.push({ text, line });
    }
  };

  while (index < input.length) {
    const character = input[index];
    if (/\d/.test(character)) {
      const start = index;
      index += 1;
      while (input[index] === "c" || input[index] === "'") {
        index += 1;
      }
      const line =
        tileIndex < 6 ? 0 : tileIndex < 12 ? 1 : tileIndex < 21 ? 2 : null;
      append(input.slice(start, index), line);
      lastTileLine = line;
      tileIndex += 1;
    } else if (DISCARD_SUIT_PATTERN.test(character)) {
      append(character, lastTileLine);
      index += 1;
    } else {
      append(character, null);
      index += 1;
    }
  }

  return segments;
}

export function discardsToRows(
  discards: readonly MahjongTableDiscard[]
): [string, string, string] {
  return [
    discards.slice(0, 6).map(formatDiscard).join(" "),
    discards.slice(6, 12).map(formatDiscard).join(" "),
    discards.slice(12, 21).map(formatDiscard).join(" "),
  ];
}

function validateDiscard(
  value: unknown
): MahjongTableParseResult<MahjongTableDiscard> {
  if (!isRecord(value)) {
    return failure("A discard entry is not an object.");
  }
  if (!isMahjongTableTile(value.tile)) {
    return failure("A discard entry contains an invalid tile.");
  }
  if (
    typeof value.tsumogiri !== "boolean" ||
    typeof value.called !== "boolean" ||
    typeof value.riichi !== "boolean"
  ) {
    return failure("A discard entry contains invalid flags.");
  }
  return success({
    tile: value.tile,
    tsumogiri: value.tsumogiri,
    called: value.called,
    riichi: value.riichi,
  });
}

function validatePlayer(
  value: unknown,
  position: MahjongTablePosition
): MahjongTableParseResult<MahjongTablePlayerState> {
  if (!isRecord(value)) {
    return failure(`The ${position} player is missing.`);
  }
  if (typeof value.hand !== "string") {
    return failure(`The ${position} hand is invalid.`);
  }
  const hand = validateHandNotation(value.hand);
  if (!hand.ok) {
    return failure(`The ${position} hand is invalid: ${hand.error}`);
  }
  if (typeof value.showConcealed !== "boolean") {
    return failure(`The ${position} hand visibility is invalid.`);
  }
  if (
    value.points !== null &&
    (typeof value.points !== "number" || !Number.isInteger(value.points))
  ) {
    return failure(`The ${position} points must be an integer or null.`);
  }
  if (!Array.isArray(value.discards) || value.discards.length > 21) {
    return failure(`The ${position} discard pond is invalid.`);
  }

  const discards: MahjongTableDiscard[] = [];
  for (const rawDiscard of value.discards) {
    const discard = validateDiscard(rawDiscard);
    if (!discard.ok) {
      return failure(
        `The ${position} discard pond is invalid: ${discard.error}`
      );
    }
    discards.push(discard.value);
  }
  if (discards.filter((discard) => discard.riichi).length > 1) {
    return failure(`The ${position} player has more than one riichi discard.`);
  }

  return success({
    hand: hand.value,
    showConcealed: value.showConcealed,
    points: value.points as number | null,
    discards,
  });
}

export function validateMahjongTableState(
  value: unknown
): MahjongTableParseResult<MahjongTableStateV1> {
  if (!isRecord(value) || value.version !== MAHJONG_TABLE_STATE_VERSION) {
    return failure("Unsupported Mahjong table state version.");
  }
  if (!isWind(value.bottomWind) || !isWind(value.roundWind)) {
    return failure("The table contains an invalid wind.");
  }
  if (
    !Number.isInteger(value.roundNumber) ||
    typeof value.roundNumber !== "number" ||
    value.roundNumber < 1 ||
    value.roundNumber > 4
  ) {
    return failure("The round number must be between 1 and 4.");
  }
  if (!isNonNegativeInteger(value.honba)) {
    return failure("Honba must be a non-negative integer.");
  }
  if (!isNonNegativeInteger(value.riichiSticks)) {
    return failure("Riichi sticks must be a non-negative integer.");
  }
  if (
    !Array.isArray(value.doraIndicators) ||
    value.doraIndicators.length < 1 ||
    value.doraIndicators.length > 5 ||
    value.doraIndicators.some((tile) => !isMahjongTableTile(tile))
  ) {
    return failure("The table must contain between 1 and 5 dora indicators.");
  }
  if (!isRecord(value.players)) {
    return failure("The table players are missing.");
  }

  const players = {} as Record<MahjongTablePosition, MahjongTablePlayerState>;
  for (const position of MAHJONG_TABLE_POSITIONS) {
    const player = validatePlayer(value.players[position], position);
    if (!player.ok) {
      return player;
    }
    players[position] = player.value;
  }

  return success({
    version: MAHJONG_TABLE_STATE_VERSION,
    bottomWind: value.bottomWind,
    roundWind: value.roundWind,
    roundNumber: value.roundNumber,
    honba: value.honba,
    riichiSticks: value.riichiSticks,
    doraIndicators: [...value.doraIndicators] as string[],
    players,
  });
}

export function encodeMahjongTableState(
  state: MahjongTableStateV1
): MahjongTableParseResult<string> {
  const validated = validateMahjongTableState(state);
  if (!validated.ok) {
    return validated;
  }
  return success(JSON.stringify(validated.value));
}

export function decodeMahjongTableState(
  serialized: string,
  version: string | number = MAHJONG_TABLE_STATE_VERSION
): MahjongTableParseResult<MahjongTableStateV1> {
  if (Number(version) !== MAHJONG_TABLE_STATE_VERSION) {
    return failure("Unsupported Mahjong table state version.");
  }

  try {
    return validateMahjongTableState(JSON.parse(serialized));
  } catch {
    return failure("Mahjong table state is not valid JSON.");
  }
}
