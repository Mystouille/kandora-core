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
    isPublished: { type: Boolean, required: false, default: false },
    gameRecord: {
      type: mongoose.Schema.Types.ObjectId,
      ref: GameRecordModelName,
      required: false,
    },
    blockGameRecord: { type: Boolean, required: false, default: false },
    refetchGameRecord: { type: Boolean, required: false, default: false },
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
export type Game = mongoose.InferSchemaType<typeof gameSchema>;
/** Sub-document type for a single game result (plain object). */
export type GameResult = {
  userId: mongoose.Types.ObjectId;
  score: number;
  place: number;
  nbChombo: number;
  subId?: mongoose.Types.ObjectId | null;
};
/** Plain-object variant returned by `.lean()`. */
export type LeanGame = Omit<Game, "results"> & {
  _id: mongoose.Types.ObjectId;
  results: GameResult[];
};
