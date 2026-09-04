/**
 * Pure types shared by Mahjong rules and analysis consumers.
 *
 * Tile notation:
 * - suited: `${1-9}${m|p|s}`, plus `0${m|p|s}` for red fives
 * - honors: `${1-7}z`, with winds followed by dragons
 */
export type Tile = string;

export type Seat = 0 | 1 | 2 | 3;

export type Wind = "E" | "S" | "W" | "N";

export const SEATS: readonly Seat[] = [0, 1, 2, 3] as const;

export const WIND_TILES: Record<Wind, Tile> = {
  E: "1z",
  S: "2z",
  W: "3z",
  N: "4z",
};

export const DRAGON_TILES = ["5z", "6z", "7z"] as const;

export const SUITS = ["m", "p", "s"] as const;
export type Suit = (typeof SUITS)[number];

/** Canonical order: man, pin, sou, honors; white five before red five. */
export function compareTiles(a: Tile, b: Tile): number {
  if (a === b) {
    return 0;
  }
  const suitA = a[a.length - 1];
  const suitB = b[b.length - 1];
  if (suitA !== suitB) {
    return "mpsz".indexOf(suitA) - "mpsz".indexOf(suitB);
  }

  const numberA = a[0] === "0" ? 5 : Number(a[0]);
  const numberB = b[0] === "0" ? 5 : Number(b[0]);
  if (numberA !== numberB) {
    return numberA - numberB;
  }

  if (a[0] === "0") {
    return 1;
  }
  if (b[0] === "0") {
    return -1;
  }
  return 0;
}
