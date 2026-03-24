import mongoose from "mongoose";

export const ExerciceRecordModelName = "ExerciceRecord";

const exerciceRecordSchema = new mongoose.Schema(
  {
    problemId: { type: String, required: true, unique: true },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    problemType: {
      type: String,
      enum: ["pure-hand-waits", "wwyd"],
      required: true,
    },
    difficulty: {
      type: String,
      required: true,
    },
    question: { type: String, required: true },
    answer: { type: [String], required: true },
    attempts: { type: Number, required: true, default: 0 },
    wrongAttempts: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
);

// Compound index for fast lookups of user's failed problems
exerciceRecordSchema.index({ userId: 1, problemType: 1, difficulty: 1 });

export const ExerciceRecordModel =
  mongoose.models[ExerciceRecordModelName] ||
  mongoose.model(ExerciceRecordModelName, exerciceRecordSchema);
