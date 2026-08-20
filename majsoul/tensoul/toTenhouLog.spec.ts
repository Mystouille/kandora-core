import { describe, expect, it } from "vitest";

import fixture from "../../../api/_fixtures/replay/majsoul/250913-638affa1-cee0-4aee-869b-69b9cb40c983.json";
import type { GameRecord } from "../data/types/GameRecord";
import { toTenhou5Json } from "./toTenhouLog";

describe("toTenhou5Json", () => {
  it("recognizes anonymous protobufjs records by $type.name", () => {
    const game = {
      ...fixture,
      records: fixture.records.map(({ __type, ...record }) => ({
        ...record,
        $type: { name: __type },
      })),
    } as unknown as GameRecord;

    const converted = toTenhou5Json(game);

    expect(converted.log).toHaveLength(9);
    expect(converted.log.every((round) => (round as unknown[]).length === 17)).toBe(
      true
    );
  });
});