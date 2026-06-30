import { Han } from "../types/Han";
import { hanRomaji } from "../i18n/hanRomaji";
import { YakuType } from "../types/yaku-type";

/**
 * Platform-specific yaku ID → canonical `Han` enum mappings.
 *
 * The app uses the Majsoul-derived `Han` enum as its internal
 * representation of yaku. Each replay adapter maps its native
 * yaku format to a `Han` value here so downstream consumers (the
 * win info panel, scoring stats, …) speak a single language.
 */

/** Tenhou XML `yaku` attribute id → canonical `Han`. */
export const TENHOU_YAKU_TO_HAN: Partial<Record<number, Han>> = {
  0: Han.Fully_Concealed_Hand, // menzen tsumo
  1: Han.Riichi,
  2: Han.Ippatsu,
  3: Han.Robbing_a_Kan, // chankan
  4: Han.After_a_Kan, // rinshan kaihou
  5: Han.Under_the_Sea, // haitei raoyue
  6: Han.Under_the_River, // houtei raoyui
  7: Han.Pinfu,
  8: Han.All_Simples, // tanyao
  9: Han.Pure_Double_Sequence, // iipeiko
  // 10–13: seat wind (east/south/west/north) → Seat_Wind
  10: Han.Seat_Wind,
  11: Han.Seat_Wind,
  12: Han.Seat_Wind,
  13: Han.Seat_Wind,
  // 14–17: round wind (east/south/west/north) → Prevalent_Wind
  14: Han.Prevalent_Wind,
  15: Han.Prevalent_Wind,
  16: Han.Prevalent_Wind,
  17: Han.Prevalent_Wind,
  18: Han.White_Dragon, // haku
  19: Han.Green_Dragon, // hatsu
  20: Han.Red_Dragon, // chun
  21: Han.Double_Riichi,
  22: Han.Seven_Pairs, // chiitoitsu
  23: Han.Half_Outside_Hand, // chanta
  24: Han.Pure_Straight, // ittsu
  25: Han.Mixed_Triple_Sequence, // sanshoku doujun
  26: Han.Triple_Triplets, // sanshoku doukou
  27: Han.Three_Quads, // sankantsu
  28: Han.All_Triplets, // toitoi
  29: Han.Three_Concealed_Triplets, // sanankou
  30: Han.Little_Three_Dragons, // shousangen
  31: Han.All_Terminals_and_Honors, // honroutou
  32: Han.Twice_Pure_Double_Sequence, // ryanpeikou
  33: Han.Fully_Outside_Hand, // junchan
  34: Han.Half_Flush, // honitsu
  35: Han.Full_Flush, // chinitsu
  // Yakuman
  36: Han.Blessing_of_Heaven, // tenhou
  37: Han.Blessing_of_Earth, // chiihou
  38: Han.Big_Three_Dragons, // daisangen
  39: Han.Four_Concealed_Triplets, // suuankou
  40: Han.Single_wait_Four_Concealed_Triplets, // suuankou tanki
  41: Han.All_Honors, // tsuuiisou
  42: Han.All_Green, // ryuuiisou
  43: Han.All_Terminals, // chinroutou
  44: Han.Nine_Gates, // chuuren poutou
  45: Han.True_Nine_Gates, // junsei chuuren
  46: Han.Thirteen_Orphans, // kokushi musou
  47: Han.Thirteen_wait_Thirteen_Orphans, // kokushi 13-sided
  48: Han.Four_Little_Winds, // shousuushii
  49: Han.Four_Big_Winds, // daisuushii
  50: Han.Four_Quads, // suukantsu
  // Dora family
  52: Han.Dora,
  53: Han.Ura_Dora,
  54: Han.Red_Five, // aka dora
};

/** Riichi City `YakuType` → canonical `Han`. */
export const RIICHI_CITY_YAKU_TO_HAN: Partial<Record<YakuType, Han>> = {
  [YakuType.Riichi]: Han.Riichi,
  [YakuType.Tsumo]: Han.Fully_Concealed_Hand,
  [YakuType.Ippatsu]: Han.Ippatsu,
  [YakuType.Rinshan]: Han.After_a_Kan,
  [YakuType.Haitei]: Han.Under_the_Sea,
  [YakuType.Houtei]: Han.Under_the_River,
  [YakuType.Chankan]: Han.Robbing_a_Kan,
  [YakuType.Chun]: Han.Red_Dragon,
  [YakuType.Hatsu]: Han.Green_Dragon,
  [YakuType.Haku]: Han.White_Dragon,
  [YakuType.RoundWind]: Han.Prevalent_Wind,
  [YakuType.SeatWind]: Han.Seat_Wind,
  [YakuType.Iipeikou]: Han.Pure_Double_Sequence,
  [YakuType.Pinfu]: Han.Pinfu,
  [YakuType.Tanyao]: Han.All_Simples,
  [YakuType.DoubleRiichi]: Han.Double_Riichi,
  [YakuType.Toitoi]: Han.All_Triplets,
  [YakuType.Chiitoitsu]: Han.Seven_Pairs,
  [YakuType.Sanankou]: Han.Three_Concealed_Triplets,
  [YakuType.Sankantsu]: Han.Three_Quads,
  [YakuType.Honroutou]: Han.All_Terminals_and_Honors,
  [YakuType.Chanta]: Han.Half_Outside_Hand,
  [YakuType.Ittsu]: Han.Pure_Straight,
  [YakuType.SanshokuDoujoun]: Han.Mixed_Triple_Sequence,
  [YakuType.Shousangen]: Han.Little_Three_Dragons,
  [YakuType.SanshokuDoukou]: Han.Triple_Triplets,
  [YakuType.Junchan]: Han.Fully_Outside_Hand,
  [YakuType.Honitsu]: Han.Half_Flush,
  [YakuType.Ryanpeikou]: Han.Twice_Pure_Double_Sequence,
  [YakuType.Chinitsu]: Han.Full_Flush,
  [YakuType.NagashiMangan]: Han.Mangan_at_Draw,
  [YakuType.Tenhou]: Han.Blessing_of_Heaven,
  [YakuType.Chiihou]: Han.Blessing_of_Earth,
  [YakuType.Renhou]: Han.Hand_of_Man,
  [YakuType.Kokushi]: Han.Thirteen_Orphans,
  [YakuType.Kokushi13]: Han.Thirteen_wait_Thirteen_Orphans,
  [YakuType.Chuuren]: Han.Nine_Gates,
  [YakuType.Chuuren9]: Han.True_Nine_Gates,
  [YakuType.Suuankou]: Han.Four_Concealed_Triplets,
  [YakuType.SuuankouTanki]: Han.Single_wait_Four_Concealed_Triplets,
  [YakuType.Suukantsu]: Han.Four_Quads,
  [YakuType.Chinroutou]: Han.All_Terminals,
  [YakuType.Tsuuiisou]: Han.All_Honors,
  [YakuType.Daisuushii]: Han.Four_Big_Winds,
  [YakuType.Shousuushii]: Han.Four_Little_Winds,
  [YakuType.Daisangen]: Han.Big_Three_Dragons,
  [YakuType.Ryuuiisou]: Han.All_Green,
  [YakuType.Paarenchan]: Han.Eight_time_East_Staying,
  [YakuType.Aka]: Han.Red_Five,
  [YakuType.Dora]: Han.Dora,
  [YakuType.Ura]: Han.Ura_Dora,
  [YakuType.NukiDora]: Han.Kita,
};

/**
 * `riichi` npm package (kanji) yaku name → canonical `Han`.
 *
 * The internal scorer (`app/game/rules/score.ts`) wraps the
 * `riichi` package, which emits yaku names exclusively in
 * Japanese kanji (e.g. `"立直"`, `"場風東"`). This map mirrors
 * what {@link TENHOU_YAKU_TO_HAN} / {@link RIICHI_CITY_YAKU_TO_HAN}
 * do for replay adapters: it normalizes the lib's native output
 * onto the canonical `Han` enum so live-game win events emit the
 * same romaji yaku names as replays.
 *
 * Names are taken verbatim from `node_modules/riichi/yaku.js`
 * (and `node_modules/riichi/index.js` for the dora family). The
 * lib uses one entry per wind tile / dragon tile rather than a
 * single seat/round/dragon yaku, so e.g. all four `自風X` collapse
 * to {@link Han.Seat_Wind}.
 */
export const RIICHI_LIB_YAKU_TO_HAN: Record<string, Han> = {
  // 1+ han yaku
  立直: Han.Riichi,
  ダブル立直: Han.Double_Riichi,
  一発: Han.Ippatsu,
  門前清自摸和: Han.Fully_Concealed_Hand,
  搶槓: Han.Robbing_a_Kan,
  嶺上開花: Han.After_a_Kan,
  海底摸月: Han.Under_the_Sea,
  河底撈魚: Han.Under_the_River,
  平和: Han.Pinfu,
  断么九: Han.All_Simples,
  一気通貫: Han.Pure_Straight,
  一盃口: Han.Pure_Double_Sequence,
  三色同順: Han.Mixed_Triple_Sequence,
  三色同刻: Han.Triple_Triplets,
  三槓子: Han.Three_Quads,
  対々和: Han.All_Triplets,
  三暗刻: Han.Three_Concealed_Triplets,
  小三元: Han.Little_Three_Dragons,
  混老頭: Han.All_Terminals_and_Honors,
  七対子: Han.Seven_Pairs,
  混全帯么九: Han.Half_Outside_Hand,
  純全帯么九: Han.Fully_Outside_Hand,
  混一色: Han.Half_Flush,
  二盃口: Han.Twice_Pure_Double_Sequence,
  清一色: Han.Full_Flush,
  // Wind / dragon yakuhai — the lib breaks these out per tile.
  場風東: Han.Prevalent_Wind,
  場風南: Han.Prevalent_Wind,
  場風西: Han.Prevalent_Wind,
  場風北: Han.Prevalent_Wind,
  自風東: Han.Seat_Wind,
  自風南: Han.Seat_Wind,
  自風西: Han.Seat_Wind,
  自風北: Han.Seat_Wind,
  役牌白: Han.White_Dragon,
  役牌発: Han.Green_Dragon,
  役牌中: Han.Red_Dragon,
  // Yakuman
  天和: Han.Blessing_of_Heaven,
  地和: Han.Blessing_of_Earth,
  人和: Han.Hand_of_Man,
  国士無双: Han.Thirteen_Orphans,
  国士無双十三面待ち: Han.Thirteen_wait_Thirteen_Orphans,
  四暗刻: Han.Four_Concealed_Triplets,
  四暗刻単騎待ち: Han.Single_wait_Four_Concealed_Triplets,
  大三元: Han.Big_Three_Dragons,
  小四喜: Han.Four_Little_Winds,
  大四喜: Han.Four_Big_Winds,
  字一色: Han.All_Honors,
  緑一色: Han.All_Green,
  清老頭: Han.All_Terminals,
  四槓子: Han.Four_Quads,
  九蓮宝燈: Han.Nine_Gates,
  純正九蓮宝燈: Han.True_Nine_Gates,
  大七星: Han.Big_Seven_Stars,
  // Dora family (lib appends these in index.js after yaku check)
  ドラ: Han.Dora,
  赤ドラ: Han.Red_Five,
};

/** Tenhou yaku id → canonical `Han`, or `undefined` if unknown. */
export function tenhouYakuIdToHan(id: number): Han | undefined {
  return TENHOU_YAKU_TO_HAN[id];
}

/** Riichi City `YakuType` → canonical `Han`, or `undefined` if unknown. */
export function riichiCityYakuTypeToHan(yt: YakuType): Han | undefined {
  return RIICHI_CITY_YAKU_TO_HAN[yt];
}

/** Majsoul stores fan ids directly using the `Han` enum. This is a
 * no-op wrapper kept for symmetry with the other platforms. */
export function majsoulFanIdToHan(id: number | undefined): Han | undefined {
  if (id === undefined || id === null) {
    return undefined;
  }
  if (!(id in Han)) {
    return undefined;
  }
  return id as Han;
}

/** `riichi` npm package yaku name (kanji) → canonical `Han`, or
 * `undefined` if unknown. */
export function riichiLibYakuToHan(name: string): Han | undefined {
  return RIICHI_LIB_YAKU_TO_HAN[name];
}

/**
 * Convert a yaku record emitted by the internal `riichi`-backed
 * scorer (kanji keys, e.g. `{ "立直": "1飜" }`) into the same
 * shape with canonical romaji keys (`{ "Riichi": "1飜" }`),
 * preserving insertion order and copying values verbatim.
 *
 * Unknown kanji keys fall through unchanged so custom / future
 * yaku still surface in the UI rather than being silently
 * dropped. Values (han / yakuman labels) are NOT translated —
 * they're already a mix of digits and kanji units shared across
 * every adapter (`"1飜"`, `"役満"`, `"2×役満"`).
 */
export function riichiLibYakuToRomaji(
  yaku: Record<string, string>
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [name, value] of Object.entries(yaku)) {
    const han = RIICHI_LIB_YAKU_TO_HAN[name];
    const romaji = han !== undefined ? hanRomaji(han) : undefined;
    out[romaji ?? name] = value;
  }
  return out;
}
