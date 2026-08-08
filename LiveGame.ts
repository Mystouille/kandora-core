import mongoose from "mongoose";
import { OngoingGameStatus } from "./types/ongoing-game-status";

const ObjectId = mongoose.Schema.Types.ObjectId;

/**
 * One seated player in a live (in-progress) game. Identity is resolved at poll
 * time (`userId`) when the platform name matches a linked account; team + logo
 * are resolved at read time from `userId` (see `/api/ongoing-games`), mirroring
 * how finished `Game.results` carry `userId` only.
 */
const liveGamePlayerSchema = new mongoose.Schema(
  {
    /** Seat index 0..3 (E, S, W, N). */
    seat: { type: Number, required: true },
    /** Platform display name (used as the fallback label when unlinked). */
    nickname: { type: String, required: true },
    /** Platform-native account id, when distinct from the nickname. */
    accountId: { type: String, required: false },
    /** Linked Kandora user, resolved from the platform identity at poll time. */
    userId: { type: ObjectId, ref: "User", required: false },
  },
  { _id: false }
);

/**
 * A currently in-progress game, projected from the platform by the league poll
 * loop so the UI reads only the DB (never the platform live). Deleted once the
 * game finishes — the finished `Game` doc is then created by the normal
 * hydration pipeline. Kept intentionally close to the finished-game shape.
 */
const liveGameSchema = new mongoose.Schema(
  {
    league: { type: ObjectId, ref: "League", required: true },
    platform: {
      type: String,
      enum: ["majsoul", "tenhou", "riichiCity"],
      required: true,
    },
    context: { type: String, required: false },
    phaseId: { type: String, required: false },
    /** Platform game id; for Tenhou this is the spectator watch-id. */
    gameId: { type: String, required: true },
    /** Tenhou spectator watch-id (equals `gameId` for Tenhou). */
    watchId: { type: String, required: false },
    tableId: { type: String, required: false },
    status: {
      type: String,
      enum: Object.values(OngoingGameStatus),
      required: true,
    },
    startTime: { type: Date, required: false },
    pausedAt: { type: Date, required: false },
    /** Last poll cycle that still observed this game (staleness / cleanup). */
    lastSeenAt: { type: Date, required: true },
    /** game-server matchId once a spectator relay is running for this game. */
    relayMatchId: { type: String, required: false },
    players: { type: [liveGamePlayerSchema], default: [] },
  },
  { timestamps: true }
);

liveGameSchema.index({ league: 1, gameId: 1 }, { unique: true });

export const LiveGameModel = mongoose.model("LiveGame", liveGameSchema);

export type LiveGame = mongoose.InferSchemaType<typeof liveGameSchema> & {
  _id: mongoose.Types.ObjectId;
};

export type LiveGamePlayer = mongoose.InferSchemaType<
  typeof liveGamePlayerSchema
>;
