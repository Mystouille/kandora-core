import mongoose from "mongoose";
import { TeamModelName } from "./Team";

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
      enum: ["EMA", "WRC", "ONLINE", "MLEAGUE"],
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
  },
  {
    virtuals: {
      users: {
        get: function (this: any) {
          return this.results.map((result: any) => result.userId);
        },
      },
      teams: {
        get: async function (this: any) {
          const TeamModel = mongoose.model(TeamModelName);
          const teams = await TeamModel.find({
            members: { $in: this.users },
          }).exec();
          return teams;
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

gameSchema.virtual("users").get(function (this: any) {
  return this.results.map((result: any) => result.userId);
});

gameSchema.virtual("hasSameUsers").get(function (
  this: any,
  userIds: mongoose.Types.ObjectId[]
) {
  const gameUserIds = this.users.map((id: mongoose.Types.ObjectId) =>
    id.toString()
  ) as string[];
  return (
    userIds.every((userId) => gameUserIds.includes(userId.toString())) &&
    userIds.length === gameUserIds.length
  );
});

export const GameModel = mongoose.model(GameModelName, gameSchema);
export type Game = mongoose.InferSchemaType<typeof gameSchema>;
