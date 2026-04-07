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

export enum LeagueScoringMode {
  TEAM_BASED = "TEAM_BASED",
  NON_TEAM_BASED = "NON_TEAM_BASED",
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
  hasTeams: { type: Boolean, required: true, default: false },
  rules: {
    type: String,
    enum: rulesetList,
    required: true,
  },
  platform: {
    type: String,
    enum: platformList,
    required: true,
  },
  configuration: {
    type: String,
    enum: Object.values(LeagueConfig),
    required: false,
  },
  scoringMode: {
    type: String,
    enum: Object.values(LeagueScoringMode),
    required: false,
    default: LeagueScoringMode.TEAM_BASED,
  },
  serverId: { type: String, required: false },
  adminChannel: { type: String, required: false },
  gameChannel: { type: String, required: false },
  rankingChannel: { type: String, required: false },
  tournamentId: { type: String, required: false },
  internalTournamentId: { type: String, required: false },
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
export type League = mongoose.InferSchemaType<typeof leagueSchema> & {
  _id: mongoose.Types.ObjectId;
};
/** Plain-object variant returned by `.lean()` — no Mongoose wrappers. */
export type LeanLeague = Omit<League, "phaseCutoffTimes"> & {
  phaseCutoffTimes: Date[];
};
