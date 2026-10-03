import mongoose from "mongoose";
import { describe, expect, it } from "vitest";
import { TeamModel } from "./Team";

function team(summaryCenterY?: number) {
  const playerId = new mongoose.Types.ObjectId();
  return new TeamModel({
    simpleName: "focus-fixture",
    displayName: "Focus fixture",
    leagueId: new mongoose.Types.ObjectId(),
    roster: { captain: playerId, members: [playerId], substitutes: [] },
    pictures: {
      fullPicture: "/api/uploads/full.webp",
      croppedPicture: "/api/uploads/crop.webp",
      ...(summaryCenterY === undefined ? {} : { summaryCenterY }),
    },
  });
}

describe("team picture focus metadata", () => {
  it("defaults legacy picture pairs to the vertical midpoint", () => {
    expect(team().pictures?.summaryCenterY).toBe(0.5);
  });

  it.each([0, 0.25, 0.5, 1])(
    "persists normalized center %s alongside the URLs",
    async (value) => {
      const document = team(value);
      await expect(document.validate()).resolves.toBeUndefined();
      expect(document.toObject().pictures).toMatchObject({
        fullPicture: "/api/uploads/full.webp",
        croppedPicture: "/api/uploads/crop.webp",
        summaryCenterY: value,
      });
    }
  );

  it.each([-0.1, 1.1, NaN, Infinity])(
    "rejects invalid normalized center %s",
    async (value) => {
      await expect(team(value).validate()).rejects.toBeInstanceOf(Error);
    }
  );
});
