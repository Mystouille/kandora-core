import mongoose from "mongoose";

export const WaitTypeModelName = "WaitType";

const waitTypeSchema = new mongoose.Schema({
  tileshape: { type: String, required: true },
  name_en: { type: String, required: false },
  name_fr: { type: String, required: false },
});

export const WaitTypeModel =
  mongoose.models[WaitTypeModelName] ||
  mongoose.model(WaitTypeModelName, waitTypeSchema);
