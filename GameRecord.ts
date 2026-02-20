import mongoose from "mongoose";

export const GameRecordModelName = "GameRecord";

const roundEventSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    wasDealer: { type: Boolean, required: true },
    haipaiShanten: { type: Number, required: true },
    wasOpened: { type: Boolean, required: true },
    numberOfCalls: { type: Number, required: true },
    kanNumber: { type: Number, required: true },
    yakus: [{ type: Number, required: true }],
    hasRiichi: { type: Boolean, required: true },
    firstTenpaiTurn: { type: Number, required: true },
    finishedTenpai: { type: Boolean, required: true },
    ryuukyoku: { type: Boolean, required: true },
    isWinner: { type: Boolean, required: true },
    isTsumo: { type: Boolean, required: true },
    gotRonned: { type: Boolean, required: true },
    winningTile: { type: String, required: false },
    totalDoraValue: { type: Number, required: true },
    uraDoraValue: { type: Number, required: true },
    hanValue: { type: Number, required: true },
    fuValue: { type: Number, required: true },
    ryuukyokuValue: { type: Number, required: true },
    pointsDiff: { type: Number, required: true },
    riichiStickDiff: { type: Number, required: true },
  },
  { _id: false }
);

const userGameRecordSchema = new mongoose.Schema(
  {
    userDbId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    teamDbId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      required: true,
    },
    teamName: { type: String, required: false },
    score: { type: Number, required: true },
    place: { type: Number, required: true },
    deltaPoints: { type: Number, required: true },
    userId: { type: String, required: true },
    seat: { type: Number, required: true },
    nickname: { type: String, required: true },
    roundEvents: [{ type: roundEventSchema, required: true }],
  },
  { _id: false }
);
const gameRecordSchema = new mongoose.Schema({
  gameId: { type: String, required: true, unique: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  byUserData: [{ type: userGameRecordSchema, required: true }],
});

export const GameRecordModel = mongoose.model(
  GameRecordModelName,
  gameRecordSchema
);

export type GameRecord = mongoose.InferSchemaType<typeof gameRecordSchema>;
