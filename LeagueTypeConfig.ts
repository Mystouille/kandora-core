import mongoose from "mongoose";
import type {
  LeagueTypeConfig as LeagueTypeConfigType,
  RegularPhaseDefinition,
  FinalPhaseDefinition,
} from "./types/league-config";

export const LeagueTypeConfigModelName = "LeagueTypeConfig";

const leagueTypeConfigSchema = new mongoose.Schema(
  {
    displayName: { type: String, required: true },
    isTeamMode: { type: Boolean, required: true, default: false },
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

export type DbLeagueTypeConfig = {
  _id: mongoose.Types.ObjectId;
  displayName: string;
  isTeamMode: boolean;
  regularPhase?: RegularPhaseDefinition;
  regularPhases?: RegularPhaseDefinition[];
  finalPhase?: FinalPhaseDefinition;
  createdAt: Date;
  updatedAt: Date;
};

/** Plain-object variant returned by `.lean()`. */
export type LeagueTypeConfigDoc = LeagueTypeConfigType & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};
