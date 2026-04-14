import mongoose from "mongoose";

export const TeamModelName = "Team";

const rosterSchema = new mongoose.Schema(
  {
    captain: { type: mongoose.Schema.Types.ObjectId, required: true },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        default: [],
      },
    ],
    substitutes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        required: false,
        default: [],
      },
    ],
  },
  { _id: false }
);

const teamSchema = new mongoose.Schema(
  {
    simpleName: { type: String, required: true },
    displayName: { type: String, required: true },
    roleId: { type: String, required: false },
    leagueId: { type: mongoose.Schema.Types.ObjectId, required: true },
    roster: { type: rosterSchema, required: true },
    finalsRoster: { type: rosterSchema, required: false, default: null },
  },
  {
    statics: {
      getUsersTeam(userId: string, leagueId: string) {
        return mongoose
          .model(TeamModelName)
          .findOne({
            leagueId,
            $or: [
              { "roster.members": { $elemMatch: { $eq: userId } } },
              { "roster.substitutes": { $elemMatch: { $eq: userId } } },
              { "finalsRoster.members": { $elemMatch: { $eq: userId } } },
              {
                "finalsRoster.substitutes": { $elemMatch: { $eq: userId } },
              },
            ],
          })
          .exec();
      },
    },
  }
);

export const TeamModel = mongoose.model(TeamModelName, teamSchema);
export type DbTeam = mongoose.InferSchemaType<typeof teamSchema>;

export interface Roster {
  captain: mongoose.Types.ObjectId;
  members: mongoose.Types.ObjectId[];
  substitutes: mongoose.Types.ObjectId[];
}

/** Plain-object variant returned by `.lean()`. */
export type Team = Omit<DbTeam, "roster" | "finalsRoster"> & {
  _id: mongoose.Types.ObjectId;
  roster: Roster;
  finalsRoster: Roster | null;
};
