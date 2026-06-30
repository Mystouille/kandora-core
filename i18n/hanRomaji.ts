import { Han } from "../types/Han";

/**
 * Display name (Japanese yaku in romaji) for each `Han` enum
 * value. This is the canonical app-internal display table used by
 * the in-game win info panel.
 *
 * Each yaku is listed individually so that variants the canonical
 * enum keeps distinct (dragons: Haku/Hatsu/Chun, seat/round wind
 * stayed merged at the `Han` level since the enum doesn't track
 * the specific wind tile) keep their distinction at display time.
 */
export const HAN_ROMAJI: Record<Han, string> = {
  [Han.Mangan_at_Draw]: "Nagashi Mangan",
  [Han.Fully_Concealed_Hand]: "Tsumo",
  [Han.Riichi]: "Riichi",
  [Han.Robbing_a_Kan]: "Chankan",
  [Han.After_a_Kan]: "Rinshan Kaihou",
  [Han.Under_the_Sea]: "Haitei Raoyue",
  [Han.Under_the_River]: "Houtei Raoyui",
  [Han.White_Dragon]: "Haku",
  [Han.Green_Dragon]: "Hatsu",
  [Han.Red_Dragon]: "Chun",
  [Han.Seat_Wind]: "Jikaze",
  [Han.Prevalent_Wind]: "Bakaze",
  [Han.All_Simples]: "Tanyao",
  [Han.Pure_Double_Sequence]: "Iipeikou",
  [Han.Pinfu]: "Pinfu",
  [Han.Half_Outside_Hand]: "Chanta",
  [Han.Pure_Straight]: "Ittsu",
  [Han.Mixed_Triple_Sequence]: "Sanshoku Doujun",
  [Han.Double_Riichi]: "Daburu Riichi",
  [Han.Triple_Triplets]: "Sanshoku Doukou",
  [Han.Three_Quads]: "Sankantsu",
  [Han.All_Triplets]: "Toitoi",
  [Han.Three_Concealed_Triplets]: "Sanankou",
  [Han.Little_Three_Dragons]: "Shousangen",
  [Han.All_Terminals_and_Honors]: "Honroutou",
  [Han.Seven_Pairs]: "Chiitoitsu",
  [Han.Fully_Outside_Hand]: "Junchan",
  [Han.Half_Flush]: "Honitsu",
  [Han.Twice_Pure_Double_Sequence]: "Ryanpeikou",
  [Han.Full_Flush]: "Chinitsu",
  [Han.Ippatsu]: "Ippatsu",
  [Han.Dora]: "Dora",
  [Han.Red_Five]: "Aka Dora",
  [Han.Ura_Dora]: "Ura Dora",
  [Han.Kita]: "Kita",
  [Han.Blessing_of_Heaven]: "Tenhou",
  [Han.Blessing_of_Earth]: "Chiihou",
  [Han.Big_Three_Dragons]: "Daisangen",
  [Han.Four_Concealed_Triplets]: "Suuankou",
  [Han.All_Honors]: "Tsuuiisou",
  [Han.All_Green]: "Ryuuiisou",
  [Han.All_Terminals]: "Chinroutou",
  [Han.Thirteen_Orphans]: "Kokushi Musou",
  [Han.Four_Little_Winds]: "Shousuushii",
  [Han.Four_Quads]: "Suukantsu",
  [Han.Nine_Gates]: "Chuuren Poutou",
  [Han.Eight_time_East_Staying]: "Paarenchan",
  [Han.True_Nine_Gates]: "Junsei Chuuren Poutou",
  [Han.Single_wait_Four_Concealed_Triplets]: "Suuankou Tanki",
  [Han.Thirteen_wait_Thirteen_Orphans]: "Kokushi Juusanmen Machi",
  [Han.Four_Big_Winds]: "Daisuushii",
  [Han.Tsubame_gaeshi]: "Tsubame Gaeshi",
  [Han.Kanburi]: "Kanburi",
  [Han.Shiiaruraotai]: "Shiiaruraotai",
  [Han.Uumensai]: "Uumensai",
  [Han.Three_Chained_Triplets]: "Sanrenkou",
  [Han.Pure_Triple_Chow]: "Isshoku Sanjun",
  [Han.Iipinmoyue]: "Iipin Moyue",
  [Han.Chuupinraoyui]: "Chuupin Raoyui",
  [Han.Hand_of_Man]: "Renhou",
  [Han.Big_Wheels]: "Daisharin",
  [Han.Bamboo_Forest]: "Daichikurin",
  [Han.Numerous_Neighbours]: "Daisuurin",
  [Han.Ishinouenimosannen]: "Ishi no Ue ni mo Sannen",
  [Han.Big_Seven_Stars]: "Dai Shichisei",
};

/** Romaji display name for the given `Han` enum value, or `undefined` if unknown. */
export function hanRomaji(han: Han | undefined | null): string | undefined {
  if (han === undefined || han === null) {
    return undefined;
  }
  return HAN_ROMAJI[han];
}
