import mongoose from "mongoose";
import { OngoingGameStatus } from "../services/connectors/ILeagueTournamentConnector.server";

const ObjectId = mongoose.Schema.Types.ObjectId;

const ongoingGameMessagePlayerSchema = new mongoose.Schema(
  {
    accountId: { type: String, required: true },
    nickname: { type: String, required: false },
    /**
     * Pre-formatted display label as rendered in the message body, e.g.
     * `<@123456> (PlatformNickname)` for a Discord-linked guild member or
     * `Bob D. (PlatformNickname)` for a known user not on the guild, or
     * just the raw platform nickname when no User record matched.
     */
    displayLabel: { type: String, required: true },
    teamId: { type: ObjectId, ref: "Team", required: false },
    teamName: { type: String, required: false },
  },
  { _id: false }
);

const ongoingGameMessageSchema = new mongoose.Schema(
  {
    league: { type: ObjectId, ref: "League", required: true },
    gameId: { type: String, required: true },
    channelId: { type: String, required: true },
    messageId: { type: String, required: true },
    renderedStatus: {
      type: String,
      enum: Object.values(OngoingGameStatus),
      required: true,
    },
    startTime: { type: Date, required: false },
    players: { type: [ongoingGameMessagePlayerSchema], default: [] },
  },
  { timestamps: true }
);

ongoingGameMessageSchema.index({ league: 1, gameId: 1 }, { unique: true });

export const OngoingGameMessageModel = mongoose.model(
  "OngoingGameMessage",
  ongoingGameMessageSchema
);

export type OngoingGameMessage = mongoose.InferSchemaType<
  typeof ongoingGameMessageSchema
> & { _id: mongoose.Types.ObjectId };

export type OngoingGameMessagePlayer = mongoose.InferSchemaType<
  typeof ongoingGameMessagePlayerSchema
>;
