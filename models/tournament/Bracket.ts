import mongoose from "mongoose";

export const BracketModelName = "Bracket";

const bracketSeedingSchema = new mongoose.Schema(
  {
    seed: { type: Number, required: true },
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
    },
  },
  { _id: false }
);

const bracketSchema = new mongoose.Schema({
  league: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    unique: true,
  },
  seedings: [bracketSeedingSchema],
});

export const BracketModel = mongoose.model(BracketModelName, bracketSchema);
export type DbBracket = mongoose.InferSchemaType<typeof bracketSchema> & {
  _id: mongoose.Types.ObjectId;
};
/** Sub-document type for a single bracket seeding (plain object). */
export type BracketSeeding = {
  seed: number;
  teamId?: mongoose.Types.ObjectId | null;
  userId?: mongoose.Types.ObjectId | null;
};
/** Plain-object variant returned by `.lean()`. */
export type Bracket = Omit<DbBracket, "seedings"> & {
  seedings: BracketSeeding[];
};

/**
 * Return the participant ObjectId from a bracket seeding.
 * In team mode `teamId` is set; in individual mode `userId` is set.
 */
export function getSeedingParticipantId(
  s: BracketSeeding,
  isTeamMode: boolean
): mongoose.Types.ObjectId {
  const id = isTeamMode ? s.teamId : s.userId;
  if (!id) {
    throw new Error(
      `BracketSeeding seed=${s.seed} missing ${isTeamMode ? "teamId" : "userId"}`
    );
  }
  return id;
}
