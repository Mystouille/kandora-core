import mongoose from "mongoose";

const ObjectId = mongoose.Schema.Types.ObjectId;

export const SubstitutionModelName = "Substitution";

const substitutionSchema = new mongoose.Schema(
  {
    league: { type: ObjectId, ref: "League", required: true },
    team: { type: ObjectId, ref: "Team", required: true },
    replacedPlayer: { type: ObjectId, ref: "User", required: true },
    substitutePlayer: { type: ObjectId, ref: "User", required: true },
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
