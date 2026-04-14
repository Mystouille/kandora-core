import mongoose from "mongoose";
import type { LeagueTypeConfig as LeagueTypeConfigType } from "../services/league-configs/types";

export const LeagueTypeConfigModelName = "LeagueTypeConfig";

const leagueTypeConfigSchema = new mongoose.Schema(
  {
    displayName: { type: String, required: true },
    isTeamMode: { type: Boolean, required: true, default: false },
    pilotBrackets: { type: Boolean, required: false, default: false },
    regularPhase: { type: mongoose.Schema.Types.Mixed, required: false },
    regularPhases: { type: mongoose.Schema.Types.Mixed, required: false },
    finalPhase: { type: mongoose.Schema.Types.Mixed, required: false },
  },
  { timestamps: true }
);

export const LeagueTypeConfigModel = mongoose.model(
  LeagueTypeConfigModelName,
  leagueTypeConfigSchema
);

export type DbLeagueTypeConfig = mongoose.InferSchemaType<
  typeof leagueTypeConfigSchema
> & {
  _id: mongoose.Types.ObjectId;
};

/** Plain-object variant returned by `.lean()`. */
export type LeagueTypeConfigDoc = LeagueTypeConfigType & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};
