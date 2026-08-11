import mongoose from "mongoose";

const palmaresSchema = new mongoose.Schema(
  {
    playerName: { type: String, required: true },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    ranking: { type: Number, required: true },
    totalParticipants: { type: Number, required: true },
    country: { type: String, required: true },
    tournamentName: { type: String, required: true },
    tournamentLink: { type: String, required: false },
    date: { type: Date, required: true, index: true },
  },
  { timestamps: true }
);

palmaresSchema.index({ date: -1 });

export const PalmaresModel = mongoose.model("Palmares", palmaresSchema);

export type Palmares = mongoose.InferSchemaType<typeof palmaresSchema> & {
  _id: mongoose.Types.ObjectId;
};
