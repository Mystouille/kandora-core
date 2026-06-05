import mongoose from "mongoose";
import type { PicturePair } from "../types/pictures";

export const LeagueUserModelName = "LeagueUser";

const picturePairSchema = new mongoose.Schema(
  {
    fullPicture: { type: String, required: true },
    croppedPicture: { type: String, required: true },
  },
  { _id: false }
);

const leagueUserSchema = new mongoose.Schema(
  {
    leagueId: { type: mongoose.Schema.Types.ObjectId, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
    pictures: { type: picturePairSchema, required: false, default: null },
  },
  { timestamps: true }
);

leagueUserSchema.index({ leagueId: 1, userId: 1 }, { unique: true });

export const LeagueUserModel = mongoose.model(
  LeagueUserModelName,
  leagueUserSchema
);

export type DbLeagueUser = mongoose.InferSchemaType<typeof leagueUserSchema>;

export type LeagueUser = Omit<
  DbLeagueUser,
  "leagueId" | "userId" | "pictures"
> & {
  _id: mongoose.Types.ObjectId;
  leagueId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  pictures: PicturePair | null;
};
