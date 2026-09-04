const YAKU_PRIORITY_FIRST: readonly (readonly string[])[] = [
  ["Riichi", "Daburu Riichi", "立直", "両立直", "ダブル立直"],
  ["Ippatsu", "一発"],
  ["Tsumo", "門前清自摸和"],
  ["Chankan", "搶槓", "槍槓"],
  ["Rinshan Kaihou", "嶺上開花"],
  ["Haitei Raoyue", "Houtei Raoyui", "海底摸月", "河底撈魚"],
  ["Pinfu", "平和"],
  ["Tanyao", "断么九", "断幺九", "タンヤオ"],
  ["Ittsu", "一気通貫"],
  ["Sanshoku Doujun", "Sanshoku Doukou", "三色同順", "三色同刻"],
  ["Iipeikou", "一盃口"],
];

const YAKU_PRIORITY_LAST: readonly (readonly string[])[] = [
  ["Dora", "ドラ"],
  ["Aka Dora", "赤ドラ", "赤"],
  ["Ura Dora", "裏ドラ"],
  ["Kita", "北", "抜きドラ", "ヌキドラ"],
];

const NAME_ORDER: ReadonlyMap<string, number> = (() => {
  const map = new Map<string, number>();
  YAKU_PRIORITY_FIRST.forEach((group, index) => {
    for (const name of group) {
      map.set(name.toLowerCase(), -YAKU_PRIORITY_FIRST.length + index);
    }
  });
  YAKU_PRIORITY_LAST.forEach((group, index) => {
    for (const name of group) {
      map.set(name.toLowerCase(), 1000 + index);
    }
  });
  return map;
})();

export function sortYakuNames(names: readonly string[]): string[] {
  const orderOf = (name: string): number =>
    NAME_ORDER.get(name.toLowerCase()) ?? 0;
  return [...names]
    .map((name, index) => ({ name, index, order: orderOf(name) }))
    .sort((left, right) => left.order - right.order || left.index - right.index)
    .map((entry) => entry.name);
}

export function sortYakuRecord(
  yaku: Record<string, string>
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const key of sortYakuNames(Object.keys(yaku))) {
    result[key] = yaku[key];
  }
  return result;
}
