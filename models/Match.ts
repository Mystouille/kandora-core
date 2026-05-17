import mongoose, { Schema } from "mongoose";

/**
 * `matches` collection — one document per played match.
 *
 * Phase 0.5 stores the seed, the player roster (seat → userId), the
 * full event log as an embedded array, and final scores. Append-only:
 * events are added live with `$push`, never edited.
 *
 * The model lives in `app/db/models/` (not the flat `app/db/`) per the
 * plan: it is a **shared schema layer** the game-server can import
 * across the portal/game ESLint boundary. See `app/game/README.md`.
 *
 * Extraction: collection name will be renamed to `mahjong_matches` (or
 * pointed at a new connection) per the extraction playbook.
 */

export interface MatchPlayer {
  userId: string;
  seat: 0 | 1 | 2 | 3;
  displayName: string;
  isBot: boolean;
  finalScore?: number;
  place?: 1 | 2 | 3 | 4;
}

export interface MatchEventEnvelope {
  seq: number;
  timestamp: Date;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  event: any;
}

const MatchPlayerSchema = new Schema<MatchPlayer>(
  {
    userId: { type: String, required: true },
    seat: { type: Number, required: true, min: 0, max: 3 },
    displayName: { type: String, required: true },
    isBot: { type: Boolean, required: true, default: false },
    finalScore: { type: Number, required: false },
    place: { type: Number, required: false, min: 1, max: 4 },
  },
  { _id: false }
);

const MatchEventEnvelopeSchema = new Schema<MatchEventEnvelope>(
  {
    seq: { type: Number, required: true },
    timestamp: { type: Date, required: true, default: () => new Date() },
    event: { type: Schema.Types.Mixed, required: true },
  },
  { _id: false }
);

const MatchSchema = new Schema(
  {
    _id: { type: String, required: true }, // matchId (nanoid / uuid)
    ruleSet: { type: String, required: true, default: "tenhou-default" },
    seed: { type: Number, required: true },
    status: {
      type: String,
      required: true,
      enum: ["playing", "finished", "aborted"],
      default: "playing",
    },
    startedAt: { type: Date, required: true, default: () => new Date() },
    endedAt: { type: Date, required: false },
    players: { type: [MatchPlayerSchema], required: true },
    events: { type: [MatchEventEnvelopeSchema], required: true, default: [] },
    nextSeq: { type: Number, required: true, default: 0 },
    /**
     * Session id that this match belongs to (Buu multi-game
     * sessions only). Absent for legacy single-game matches.
     * Multiple `Match` docs may share a `sessionId` — each
     * representing one Buu game (East-only hanchan) — linked in
     * play order by `gameIndex`.
     */
    sessionId: { type: String, required: false, index: true },
    /**
     * Zero-based index of this match within its `sessionId`.
     * Absent for legacy single-game matches; 0 for the first
     * game of a Buu session.
     */
    gameIndex: { type: Number, required: false, min: 0 },
  },
  { timestamps: true, _id: false }
);

MatchSchema.index({ "players.userId": 1, endedAt: -1 });
MatchSchema.index({ endedAt: -1 });
MatchSchema.index({ sessionId: 1, gameIndex: 1 });

export const MatchModel =
  mongoose.models.Match ?? mongoose.model("Match", MatchSchema, "matches");

export type DbMatch = mongoose.InferSchemaType<typeof MatchSchema> & {
  _id: string;
};
