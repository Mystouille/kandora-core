import mongoose from "mongoose";

const linkSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    nameEn: { type: String, required: false },
    link: { type: String, required: true },
    description: { type: String, required: true },
    descriptionEn: { type: String, required: false },
    type: {
      type: String,
      required: true,
      enum: ["website", "document", "video", "tool"],
    },
    order: { type: Number, required: false, default: 0 },
  },
  { timestamps: true }
);

linkSchema.index({ type: 1, order: 1 });

export const LinkModel = mongoose.model("Link", linkSchema);

export type Link = mongoose.InferSchemaType<typeof linkSchema> & {
  _id: mongoose.Types.ObjectId;
};
