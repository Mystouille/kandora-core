import mongoose from "mongoose";
import { GameModel } from "./Game";
import { TeamModel } from "./Team";
const majsoulIdentitySchema = new mongoose.Schema(
  {
    friendId: { type: String, required: true },
    userId: { type: String, required: false },
    name: { type: String, required: true },
  },
  { _id: false }
);
const tenhouIdentitySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
  },
  { _id: false }
);
const riichiCityIdentitySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    id: { type: String, required: true },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    discordId: { type: String, required: false },
    name: { type: String, required: true },
    majsoulIdentity: { type: majsoulIdentitySchema, required: false },
    tenhouIdentity: { type: tenhouIdentitySchema, required: false },
    riichiCityIdentity: { type: riichiCityIdentitySchema, required: false },
    isDeleted: { type: Boolean, required: true, default: false },
    emailVerified: { type: Boolean, required: true, default: false },
    passwordHash: {
      type: String,
      required: false,
    },
    email: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
      trim: true,
      lowercase: true,
    },
    avatar: { type: String, required: false },
    lastLogin: { type: Date, required: false },
    verificationToken: {
      type: String,
      required: false,
    },
    verificationTokenExpires: {
      type: Date,
      required: false,
    },
  },
  {
    methods: {},
    statics: {
      async canUserPlayInLeague(userId: string, leagueId: string) {
        // Count games played by user in this league
        const userGamesCount = await GameModel.countDocuments({
          league: leagueId,
          users: {
            $elemMatch: { $eq: userId },
          },
        });

        // If user has played 5 games or less, they can play
        if (userGamesCount <= 5) {
          return true;
        }

        const userTeam = await TeamModel.getUsersTeam(userId, leagueId);
        const teamId = userTeam ? userTeam._id : null;

        if (!teamId) {
          // User is not in a team, so they can play
          return false;
        }
        // Count games played by the team in this league
        const teamGamesCount = await GameModel.countDocuments({
          league: leagueId,
          users: {
            $in: userTeam.members,
          },
        });

        // Calculate contribution percentage after next game (rounded down)
        const contributionPercentage = Math.floor(
          ((userGamesCount + 1) / (teamGamesCount + 1)) * 100
        );

        // User can play if contribution is less than 35%
        return contributionPercentage < 35;
      },
    },
  }
);

// Remove password from JSON output
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  return obj;
};

export const UserModel = mongoose.model("User", userSchema);

export type User = mongoose.InferSchemaType<typeof userSchema> & {
  _id: mongoose.Types.ObjectId;
};
