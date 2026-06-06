import mongoose from "mongoose";

const ObjectId = mongoose.Schema.Types.ObjectId;

export const SubstitutionModelName = "Substitution";

const substitutionSchema = new mongoose.Schema(
  {
    league: { type: ObjectId, ref: "League", required: true },
    team: { type: ObjectId, ref: "Team", required: false },
    replacedPlayer: { type: ObjectId, ref: "User", required: true },
    substitutePlayer: { type: ObjectId, ref: "User", required: true },
    // Bracket stage this substitution is scoped to.
    stageId: { type: String, required: true },
    // 1-based round numbers within the stage this substitution targets.
    rounds: { type: [Number], required: true },
  },
  { timestamps: true }
);

substitutionSchema.index({ league: 1, team: 1 });

export const SubstitutionModel = mongoose.model(
  SubstitutionModelName,
  substitutionSchema
);

export type Substitution = mongoose.InferSchemaType<
  typeof substitutionSchema
> & { _id: mongoose.Types.ObjectId };
