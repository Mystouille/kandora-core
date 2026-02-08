import mongoose from "mongoose";

const ObjectId = mongoose.Schema.Types.ObjectId;

const leagueGameMessageSchema = new mongoose.Schema({
  messageId: { type: String, required: true },
  league: { type: ObjectId, required: true },
  gameId: { type: String, required: true },
  players: [
    {
      type: ObjectId,
      required: true,
      default: [],
    },
  ],
});

export const LeagueGameMessageModel = mongoose.model(
  "LeagueGameMessage",
  leagueGameMessageSchema
);
export type LeagueGameMessage = mongoose.InferSchemaType<
  typeof leagueGameMessageSchema
>;
