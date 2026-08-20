import mongoose from "mongoose";
import { glossaryTags } from "../../types/glossary";

export { glossaryTags };
export type { GlossaryTag } from "../../types/glossary";

const glossaryTermSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, index: true },
    synonyms: [{ type: String }],
    relatedNames: [{ type: String }],
    tag: {
      type: String,
      enum: glossaryTags,
      required: true,
      index: true,
    },
    japanese: { type: String, required: false },
    definition: { type: String, required: true },
    definitionEn: { type: String, required: false },
  },
  { timestamps: true }
);

glossaryTermSchema.index({ tag: 1, name: 1 });

const createGlossaryTermModel = () =>
  mongoose.model("GlossaryTerm", glossaryTermSchema);
export const GlossaryTermModel =
  (mongoose.models.GlossaryTerm as
    | ReturnType<typeof createGlossaryTermModel>
    | undefined) ?? createGlossaryTermModel();

export type GlossaryTerm = mongoose.InferSchemaType<
  typeof glossaryTermSchema
> & {
  _id: mongoose.Types.ObjectId;
};
