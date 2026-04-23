import mongoose from "mongoose";

const ObjectId = mongoose.Schema.Types.ObjectId;

const leagueRankingMessageSchema = new mongoose.Schema({
  messageId: { type: String, required: true },
  league: { type: ObjectId, required: true },
  phaseKey: { type: String, required: false, default: null },
  lastUpdatedAt: { type: Date, required: true },
});

export const LeagueRankingMessageModel = mongoose.model(
  "LeagueRankingMessage",
  leagueRankingMessageSchema
);
export type LeagueRankingMessage = mongoose.InferSchemaType<
  typeof leagueRankingMessageSchema
>;
