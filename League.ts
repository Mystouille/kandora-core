import mongoose from "mongoose";
import { Ruleset, Platform, LeagueConfig } from "../types/league-enums";
import type { LeagueTypeConfig } from "../services/league-configs/types";
import { LeagueTypeConfigModelName } from "./LeagueTypeConfig";

export { Ruleset, Platform, LeagueConfig };

export const LeagueModelName = "League";

const rulesetList = [
  Ruleset.EMA,
  Ruleset.WRC,
  Ruleset.ONLINE,
  Ruleset.MLEAGUE,
  Ruleset.INDONESIAN,
];
const platformList = [
  Platform.MAJSOUL,
  Platform.TENHOU,
  Platform.RIICHICITY,
  Platform.IRL,
];
const leagueSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  startTime: { type: Date, required: true },
  phaseCutoffTimes: { type: [Date], required: false, default: [] },
  endTime: { type: Date, required: true },
  isIgnored: { type: Boolean, required: true, default: false },
  isDisplayed: { type: Boolean, required: true, default: true },
  rulesConfig: {
    type: new mongoose.Schema(
      {
        gameRules: {
          type: String,
          enum: rulesetList,
          required: true,
        },
        structure: {
          type: String,
          required: false,
        },
        isTeamMode: { type: Boolean, required: true, default: true },
      },
      { _id: false }
    ),
    required: true,
  },
  platformConfig: {
    type: new mongoose.Schema(
      {
        platformName: {
          type: String,
          enum: platformList,
          required: true,
        },
        tournamentId: { type: String, required: false },
        internalTournamentId: { type: String, required: false },
        seasonId: { type: String, required: false },
      },
      { _id: false }
    ),
    required: true,
  },
  discordConfig: {
    type: new mongoose.Schema(
      {
        serverId: { type: String, required: false },
        adminChannel: { type: String, required: false },
        resultChannel: { type: String, required: false },
        rankingChannel: { type: String, required: false },
        schedulingChannel: { type: String, required: false },
      },
      { _id: false }
    ),
    required: false,
  },
  presentation: {
    type: new mongoose.Schema(
      {
        fr: { type: String, default: "" },
        en: { type: String, default: "" },
      },
      { _id: false }
    ),
    required: false,
  },
  leagueTypeConfig: {
    type: mongoose.Schema.Types.ObjectId,
    ref: LeagueTypeConfigModelName,
    required: false,
    default: null,
  },
});

export const LeagueModel = mongoose.model(LeagueModelName, leagueSchema);

/**
 * Returns a Mongoose filter object that matches leagues currently ongoing:
 * started before now, and either no endTime or endTime in the future.
 */
export function ongoingLeagueFilter() {
  const now = new Date();
  return {
    startTime: { $lte: now },
    endTime: { $gt: now },
  };
}

/** Mongoose filter for leagues that have a league type config assigned. */
export function bracketLeagueFilter() {
  return { leagueTypeConfig: { $ne: null } };
}

export type DbLeague = mongoose.InferSchemaType<typeof leagueSchema> & {
  _id: mongoose.Types.ObjectId;
};
/**
 * Plain-object variant returned by `.lean()` after `.populate("leagueTypeConfig")`.
 * When the ref is populated the field holds the full config object; otherwise null.
 */
export type League = Omit<DbLeague, "phaseCutoffTimes" | "leagueTypeConfig"> & {
  phaseCutoffTimes: Date[];
  leagueTypeConfig:
    | (LeagueTypeConfig & { _id: mongoose.Types.ObjectId })
    | null;
};
