import mongoose from "mongoose";

const ObjectId = mongoose.Schema.Types.ObjectId;

const leagueRankingMessageSchema = new mongoose.Schema({
  messageId: { type: String, required: true },
  league: { type: ObjectId, required: true },
  phaseKey: { type: String, required: false, default: null },
  partIndex: { type: Number, required: true, default: 0 },
  contentHash: { type: String, required: false, default: null },
  lastUpdatedAt: { type: Date, required: true },
});

const createLeagueRankingMessageModel = () =>
  mongoose.model("LeagueRankingMessage", leagueRankingMessageSchema);
export const LeagueRankingMessageModel =
  (mongoose.models.LeagueRankingMessage as
    | ReturnType<typeof createLeagueRankingMessageModel>
    | undefined) ?? createLeagueRankingMessageModel();
export type LeagueRankingMessage = mongoose.InferSchemaType<
  typeof leagueRankingMessageSchema
>;
