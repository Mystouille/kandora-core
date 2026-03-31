import mongoose from "mongoose";

const localizedStringSchema = new mongoose.Schema(
  {
    fr: { type: String, required: true, trim: true },
    en: { type: String, default: "", trim: true },
  },
  { _id: false }
);

const localizedOptionalStringSchema = new mongoose.Schema(
  {
    fr: { type: String, default: "" },
    en: { type: String, default: "" },
  },
  { _id: false }
);

const locationSchema = new mongoose.Schema(
  {
    address: { type: String, default: "", trim: true },
    mapsUrl: { type: String, default: "", trim: true },
  },
  { _id: false }
);

const bankInfoSchema = new mongoose.Schema(
  {
    holder: { type: String, default: "", trim: true },
    iban: { type: String, default: "", trim: true },
    bic: { type: String, default: "", trim: true },
    purpose: { type: String, default: "", trim: true },
  },
  { _id: false }
);

const scheduleItemSchema = new mongoose.Schema(
  {
    day: { type: Number, min: 1, default: 1 },
    name: { type: String, required: true, trim: true },
    startTime: { type: String, required: true, trim: true },
    endTime: { type: String, default: "", trim: true },
    isGameSession: { type: Boolean, default: false },
  },
  { _id: false }
);

const playerListItemSchema = new mongoose.Schema(
  {
    timestamp: { type: Date, required: true },
    playerName: { type: String, required: true, trim: true },
    licenceId: { type: String, default: "", trim: true },
    nationality: { type: String, default: "", trim: true },
    proOrg: {
      type: String,
      enum: ["None", "JPML", "NPM", "Saikouisen", "RMU", "WRC"],
      default: "None",
    },
    status: {
      type: String,
      enum: ["In progress", "Definitive"],
      default: "In progress",
    },
  },
  { _id: false }
);

const tournamentSchema = new mongoose.Schema(
  {
    name: { type: localizedStringSchema, required: true },
    slug: {
      type: String,
      required: true,
      unique: true,
      index: true,
      match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    },
    dates: [{ type: Date, required: true }],
    location: { type: locationSchema, default: () => ({}) },
    venueAccess: {
      type: localizedOptionalStringSchema,
      default: () => ({ fr: "", en: "" }),
    },
    description: {
      type: localizedOptionalStringSchema,
      default: () => ({ fr: "", en: "" }),
    },
    inscriptionFee: { type: String, default: "", trim: true },
    bankInfo: { type: bankInfoSchema, default: () => ({}) },
    mealsInfo: {
      type: localizedOptionalStringSchema,
      default: () => ({ fr: "", en: "" }),
    },
    schedule: { type: [scheduleItemSchema], default: [] },
    playerList: { type: [playerListItemSchema], default: [] },
  },
  { timestamps: true }
);

tournamentSchema.index({ dates: 1 });

export const TournamentModel =
  (mongoose.models.Tournament as mongoose.Model<any>) ||
  mongoose.model("Tournament", tournamentSchema);

export type Tournament = mongoose.InferSchemaType<typeof tournamentSchema> & {
  _id: mongoose.Types.ObjectId;
};
