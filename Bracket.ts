import mongoose from "mongoose";

export const BracketModelName = "Bracket";

const bracketSeedingSchema = new mongoose.Schema(
  {
    seed: { type: Number, required: true },
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
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
export type Bracket = mongoose.InferSchemaType<typeof bracketSchema> & {
  _id: mongoose.Types.ObjectId;
};
