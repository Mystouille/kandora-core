import mongoose from "mongoose";

export const TeamModelName = "Team";
const teamSchema = new mongoose.Schema(
  {
    simpleName: { type: String, required: true },
    displayName: { type: String, required: true },
    roleId: { type: String, required: false },
    leagueId: { type: mongoose.Schema.Types.ObjectId, required: true },
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
  {
    statics: {
      getUsersTeam(userId: string, leagueId: string) {
        return mongoose
          .model(TeamModelName)
          .findOne({
            leagueId,
            $or: [
              { members: { $elemMatch: { $eq: userId } } },
              { substitutes: { $elemMatch: { $eq: userId } } },
            ],
          })
          .exec();
      },
    },
  }
);

export const TeamModel = mongoose.model(TeamModelName, teamSchema);
export type Team = mongoose.InferSchemaType<typeof teamSchema>;
