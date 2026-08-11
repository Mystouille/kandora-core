import mongoose from "mongoose";
import { GameRecordModelName } from "./GameRecord";

export const GameModelName = "Game";
const resultSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
    score: { type: Number, required: true },
    place: { type: Number, required: true },
    nbChombo: { type: Number, required: true },
    subId: { type: mongoose.Schema.Types.ObjectId, required: false },
  },
  { _id: false }
);
const gameSchema = new mongoose.Schema(
  {
    gameId: { type: String, required: false },
    name: { type: String, required: false },
    platform: {
      type: String,
      enum: ["majsoul", "tenhou", "riichiCity", "IRL"],
      required: true,
    },
    rules: {
      type: String,
      enum: ["EMA", "WRC", "ONLINE", "MLEAGUE", "INDONESIAN"],
      required: true,
    },
    context: {
      type: String,
      required: true,
    },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: false },
    isValid: { type: Boolean, required: false, default: true },
    results: [{ type: resultSchema, required: false }],
    log: { type: String, required: false },
    league: { type: mongoose.Schema.Types.ObjectId, required: false },
    platformIndex: { type: Number, required: false },
    /**
     * Phase this game belongs to, tagged at ingestion from the tournament
     * lobby it was fetched from (per-phase leagues — see
     * `League.platformConfig.phaseTournaments`). Holds a phase id from the
     * LeagueTypeConfig (`regularPhase.id`, a `regularPhases[].id`, or
     * `finalPhase.id`). Absent for single-lobby leagues and for games ingested
     * before per-phase mode was enabled, in which case phase attribution falls
     * back to the time-based `League.phaseCutoffTimes`.
     */
    phaseId: { type: String, required: false },
    isPublished: { type: Boolean, required: false, default: false },
    gameRecord: {
      type: mongoose.Schema.Types.ObjectId,
      ref: GameRecordModelName,
      required: false,
    },
    blockGameRecord: { type: Boolean, required: false, default: false },
    refetchGameRecord: { type: Boolean, required: false, default: false },
    /**
     * Phase 4.5: pointer into the `replaylogs` collection. Set by
     * the portal-side hydration pipeline after the per-platform
     * replay adapter parses the raw log. Absent for IRL games and
     * for league games predating Phase 4.5 until the next
     * hydration cycle backfills them.
     */
    replayLogRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ReplayLog",
      required: false,
    },
    /** Mirrors `refetchGameRecord` for one-off replay re-parses. */
    refetchReplayLog: { type: Boolean, required: false, default: false },
  },
  {
    virtuals: {
      users: {
        get(): mongoose.Types.ObjectId[] {
          return (this.results ?? []).map(
            (result) => (result as unknown as GameResult).userId
          );
        },
      },
    },
    statics: {
      nbSimilarMatchups(userIds: string[]) {
        return mongoose
          .model("Game")
          .find({ users: { $all: userIds } })
          .countDocuments();
      },
    },
  }
);

export const GameModel = mongoose.model(GameModelName, gameSchema);
export type DbGame = mongoose.InferSchemaType<typeof gameSchema>;
/** Sub-document type for a single game result (plain object). */
export type GameResult = {
  userId: mongoose.Types.ObjectId;
  score: number;
  place: number;
  nbChombo: number;
  subId?: mongoose.Types.ObjectId | null;
};
/** Plain-object variant returned by `.lean()`. */
export type Game = Omit<DbGame, "results"> & {
  _id: mongoose.Types.ObjectId;
  results: GameResult[];
};
