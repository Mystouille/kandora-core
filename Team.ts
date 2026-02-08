import mongoose from "mongoose";

export const TeamModelName = "Team";
const teamSchema = new mongoose.Schema(
  {
    simpleName: { type: String, required: true },
    displayName: { type: String, required: true },
    leagueId: { type: mongoose.Schema.Types.ObjectId, required: true },
    captain: { type: mongoose.Schema.Types.ObjectId, required: true },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        default: [],
      },
    ],
  },
  {
    statics: {
      getUsersTeam(userId: string, leagueId: string) {
        return mongoose
          .model(TeamModelName)
          .findOne({
            leagueId,
            members: { $elemMatch: { $eq: userId } },
          })
          .exec();
      },
    },
  }
);

export const TeamModel = mongoose.model(TeamModelName, teamSchema);
export type Team = mongoose.InferSchemaType<typeof teamSchema>;
