import mongoose from "mongoose";

const joinUsContentSchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    textEn: { type: String, default: "" },
  },
  { timestamps: true }
);

export const JoinUsContentModel = mongoose.model(
  "JoinUsContent",
  joinUsContentSchema
);

export type JoinUsContent = mongoose.InferSchemaType<
  typeof joinUsContentSchema
> & {
  _id: mongoose.Types.ObjectId;
};
