import mongoose from "mongoose";

export const LeagueModelName = "League";
export enum Ruleset {
  EMA = "EMA",
  WRC = "WRC",
  ONLINE = "ONLINE",
  MLEAGUE = "MLEAGUE",
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
}

export enum LeagueScoringMode {
  TEAM_BASED = "TEAM_BASED",
  NON_TEAM_BASED = "NON_TEAM_BASED",
}

const rulesetList = [Ruleset.EMA, Ruleset.WRC, Ruleset.ONLINE, Ruleset.MLEAGUE];
const platformList = [
  Platform.MAJSOUL,
  Platform.TENHOU,
  Platform.RIICHICITY,
  Platform.IRL,
];
const leagueSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  startTime: { type: Date, required: true },
  finalsCutoffTime: { type: Date, required: false },
  endTime: { type: Date, required: false },
  isOngoing: { type: Boolean, required: true, default: true },
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
  serverId: { type: String, required: true },
  adminChannel: { type: String, required: true },
  gameChannel: { type: String, required: true },
  rankingChannel: { type: String, required: false },
  tournamentId: { type: String, required: false },
});

export const LeagueModel = mongoose.model(LeagueModelName, leagueSchema);
export type League = mongoose.InferSchemaType<typeof leagueSchema> & {
  _id: mongoose.Types.ObjectId;
};
