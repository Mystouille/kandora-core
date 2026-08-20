import mongoose from "mongoose";

const joinUsContentSchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    textEn: { type: String, default: "" },
  },
  { timestamps: true }
);

const createJoinUsContentModel = () =>
  mongoose.model("JoinUsContent", joinUsContentSchema);
export const JoinUsContentModel =
  (mongoose.models.JoinUsContent as
    | ReturnType<typeof createJoinUsContentModel>
    | undefined) ?? createJoinUsContentModel();

export type JoinUsContent = mongoose.InferSchemaType<
  typeof joinUsContentSchema
> & {
  _id: mongoose.Types.ObjectId;
};
