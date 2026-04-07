import mongoose from "mongoose";

export const LeagueModelName = "League";
export enum Ruleset {
  EMA = "EMA",
  WRC = "WRC",
  ONLINE = "ONLINE",
  MLEAGUE = "MLEAGUE",
  INDONESIAN = "INDONESIAN",
}
export enum Platform {
  MAJSOUL = "MAJSOUL",
  TENHOU = "TENHOU",
  RIICHICITY = "RIICHICITY",
  IRL = "IRL",
}
export enum LeagueConfig {
  LFCR = "LFCR",
  LFCR_FINAL = "LFCR_FINAL",
  TRI_KINDOM_TILES = "TRI_KINDOM_TILES",
  TRI_KINDOM_TILES_FINAL = "TRI_KINDOM_TILES_FINAL",
  INDONESIAN = "INDONESIAN",
}

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
          enum: Object.values(LeagueConfig),
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
      },
      { _id: false }
    ),
    required: false,
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

/** LeagueConfig values that represent a finals / elimination bracket league. */
export const FINALS_LEAGUE_CONFIGS = [
  LeagueConfig.LFCR_FINAL,
  LeagueConfig.TRI_KINDOM_TILES_FINAL,
] as const;

/** Mongoose filter for leagues with a finals structure. */
export function finalsLeagueFilter() {
  return { "rulesConfig.structure": { $in: [...FINALS_LEAGUE_CONFIGS] } };
}
export type League = mongoose.InferSchemaType<typeof leagueSchema> & {
  _id: mongoose.Types.ObjectId;
};
/** Plain-object variant returned by `.lean()` — no Mongoose wrappers. */
export type LeanLeague = Omit<League, "phaseCutoffTimes"> & {
  phaseCutoffTimes: Date[];
};
