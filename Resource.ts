import mongoose from "mongoose";

const resourceSchema = new mongoose.Schema(
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

resourceSchema.index({ type: 1, order: 1 });

export const ResourceModel = mongoose.model("Resource", resourceSchema);

export type Resource = mongoose.InferSchemaType<typeof resourceSchema> & {
  _id: mongoose.Types.ObjectId;
};
