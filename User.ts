import mongoose from "mongoose";
import { GameModel } from "./Game";
import { TeamModel } from "./Team";

/**
 * Compute the canonical display name for a user.
 *
 * Priority:
 *   1. `firstName` + last-name initial (`"John D."`) when `firstName` is set.
 *   2. `discordIdentity.displayName` for Discord-only accounts.
 *   3. The literal string `"Unknown"` as a last-resort fallback.
 *
 * This is the single source of truth for `user.name`. The pre-save hook
 * below keeps the stored value in sync; bulk update paths (e.g. the daily
 * Discord sync) must apply the same formula explicitly.
 */
export function computeUserName(
  user:
    | Pick<Partial<DbUser>, "firstName" | "lastName" | "discordIdentity">
    | null
    | undefined
): string {
  if (!user) {
    return "Unknown";
  }
  const firstName = user.firstName?.trim();
  if (firstName) {
    const last = user.lastName?.trim();
    return last ? `${firstName} ${last.charAt(0).toUpperCase()}.` : firstName;
  }
  const displayName = user.discordIdentity?.displayName?.trim();
  if (displayName) {
    return displayName;
  }
  return "Unknown";
}
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

const discordIdentitySchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    displayName: { type: String, required: false },
    guildDisplayNames: {
      type: Map,
      of: String,
      required: false,
      default: undefined,
    },
  },
  { _id: false }
);

const preferencesSchema = new mongoose.Schema(
  {
    tileSet: {
      type: String,
      enum: ["default", "tenhou", "trainer"],
      default: "default",
    },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    discordIdentity: { type: discordIdentitySchema, required: false },
    name: { type: String, required: true },
    firstName: { type: String, required: false },
    lastName: { type: String, required: false },
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
    lastLogin: { type: Date, required: false },
    avatarUrl: { type: String, required: false },
    locale: { type: String, required: false, default: "en" },
    verificationToken: {
      type: String,
      required: false,
    },
    verificationTokenExpires: {
      type: Date,
      required: false,
    },
    passwordResetToken: {
      type: String,
      required: false,
    },
    passwordResetTokenExpires: {
      type: Date,
      required: false,
    },
    isAdmin: { type: Boolean, required: true, default: false },
    isEditor: { type: Boolean, required: false, default: false },
    isTNTMember: { type: Boolean, required: true, default: false },
    preferences: {
      type: preferencesSchema,
      required: false,
      default: () => ({}),
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
        // Count games played by the team in this league (members + substitutes)
        const allTeamPlayerIds = [
          ...userTeam.roster.members,
          ...(userTeam.roster.substitutes ?? []),
        ];
        const teamGamesCount = await GameModel.countDocuments({
          league: leagueId,
          users: {
            $in: allTeamPlayerIds,
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

// Always keep `name` in sync with the canonical formula. See
// {@link computeUserName} for the priority order.
//
// Use `pre("validate")` (not `pre("save")`) so the computed value is in
// place before Mongoose's required-field validation runs — otherwise new
// users created without an explicit `name` would fail validation.
userSchema.pre("validate", function () {
  // `this` is loosely typed inside Mongoose hooks; cast to the field shape
  // accepted by the helper.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  this.name = computeUserName(this as any);
});

userSchema.index(
  { "majsoulIdentity.friendId": 1 },
  { unique: true, sparse: true }
);
userSchema.index(
  { "riichiCityIdentity.id": 1 },
  { unique: true, sparse: true }
);
userSchema.index({ "discordIdentity.id": 1 }, { unique: true, sparse: true });

export const UserModel = mongoose.model("User", userSchema);

type RawUser = mongoose.InferSchemaType<typeof userSchema>;

/**
 * `guildDisplayNames` is stored as a Mongoose `Map`, but most consumers use
 * `.lean()` queries which serialize it to a plain object. Expose it as a
 * union of both shapes here so callers either branch on the runtime form
 * or simply read keys via the helpers in this file.
 */
export type DbUser = Omit<RawUser, "discordIdentity"> & {
  _id: mongoose.Types.ObjectId;
  discordIdentity?:
    | (Omit<NonNullable<RawUser["discordIdentity"]>, "guildDisplayNames"> & {
        guildDisplayNames?: Map<string, string> | Record<string, string> | null;
      })
    | null;
};
/** Plain-object variant returned by `.lean()`. */
export type User = DbUser;
