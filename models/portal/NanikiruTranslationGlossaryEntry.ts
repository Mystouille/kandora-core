import mongoose from "mongoose";

export const NanikiruTranslationGlossaryEntryModelName =
  "NanikiruTranslationGlossaryEntry";

const nanikiruTranslationGlossaryEntrySchema = new mongoose.Schema(
  {
    source: { type: String, required: true, trim: true, maxlength: 1024 },
    normalizedSource: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    target: { type: String, required: true, trim: true, maxlength: 1024 },
  },
  {
    collection: "nanikiru_translation_glossary_entries",
    timestamps: true,
  }
);

export type NanikiruTranslationGlossaryEntryDocument = mongoose.InferSchemaType<
  typeof nanikiruTranslationGlossaryEntrySchema
> & {
  _id: mongoose.Types.ObjectId;
};

export const NanikiruTranslationGlossaryEntryModel =
  (mongoose.models[
    NanikiruTranslationGlossaryEntryModelName
  ] as mongoose.Model<NanikiruTranslationGlossaryEntryDocument>) ||
  mongoose.model(
    NanikiruTranslationGlossaryEntryModelName,
    nanikiruTranslationGlossaryEntrySchema
  );
