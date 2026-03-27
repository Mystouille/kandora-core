import mongoose from "mongoose";

const localizedStringSchema = new mongoose.Schema(
  {
    fr: { type: String, required: true },
    en: { type: String, default: "" },
  },
  { _id: false }
);

const articleSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["news", "post"],
      required: true,
      index: true,
    },
    title: { type: localizedStringSchema, required: true },
    slug: {
      type: String,
      required: true,
      unique: true,
      index: true,
      match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    },
    summary: { type: localizedStringSchema, required: true },
    content: { type: localizedStringSchema, required: true },
    coverImageUrl: { type: String, required: false },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["draft", "published"],
      required: true,
      default: "draft",
      index: true,
    },
    publishedAt: { type: Date, required: false, index: true },
    tags: [{ type: String }],
  },
  { timestamps: true }
);

// Compound index for public queries
articleSchema.index({ type: 1, status: 1, publishedAt: -1 });

export const ArticleModel = mongoose.model("Article", articleSchema);

export type Article = mongoose.InferSchemaType<typeof articleSchema> & {
  _id: mongoose.Types.ObjectId;
};
