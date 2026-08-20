import mongoose from "mongoose";
import type { PicturePair } from "../../types/pictures";

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
    isParticipant: { type: Boolean, required: true, default: true },
    pictures: { type: picturePairSchema, required: false, default: null },
  },
  { timestamps: true }
);

leagueUserSchema.index({ leagueId: 1, userId: 1 }, { unique: true });

const createLeagueUserModel = () =>
  mongoose.model(LeagueUserModelName, leagueUserSchema);
export const LeagueUserModel =
  (mongoose.models[LeagueUserModelName] as
    | ReturnType<typeof createLeagueUserModel>
    | undefined) ?? createLeagueUserModel();

export type DbLeagueUser = mongoose.InferSchemaType<typeof leagueUserSchema>;

export type LeagueUser = Omit<
  DbLeagueUser,
  "leagueId" | "userId" | "pictures" | "isParticipant"
> & {
  _id: mongoose.Types.ObjectId;
  leagueId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  isParticipant: boolean;
  pictures: PicturePair | null;
};
