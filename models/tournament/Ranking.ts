import mongoose from "mongoose";

const ObjectId = mongoose.Schema.Types.ObjectId;
const rankingSchema = new mongoose.Schema({
  userId: { type: ObjectId, required: true },
  gameId: { type: ObjectId, required: true },
  oldRanking: { type: Number, required: false },
  newRanking: { type: Number, required: true },
  timestamp: { type: Date, required: true, default: new Date() },
});

const createRankingModel = () => mongoose.model("Ranking", rankingSchema);
export const RankingModel =
  (mongoose.models.Ranking as
    | ReturnType<typeof createRankingModel>
    | undefined) ?? createRankingModel();
export type Ranking = mongoose.InferSchemaType<typeof rankingSchema>;
