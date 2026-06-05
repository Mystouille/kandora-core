import mongoose from "mongoose";

const ObjectId = mongoose.Schema.Types.ObjectId;

export const schedulingStatuses = [
  "upcoming",
  "in_progress",
  "completed",
] as const;
export type SchedulingStatus = (typeof schedulingStatuses)[number];

const schedulingMessageSchema = new mongoose.Schema(
  {
    messageId: { type: String, required: true },
    league: { type: ObjectId, ref: "League", required: true },
    stageId: { type: String, required: true },
    roundIndex: { type: Number, required: true },
    status: {
      type: String,
      enum: schedulingStatuses,
      required: true,
      default: "upcoming",
    },
    gameIds: { type: [String], default: [] },
    /**
     * Resolved participant IDs (Team IDs in team mode, User IDs in individual
     * mode) for this stage at the time the scheduling message was posted.
     * Required for stages whose participants come from `fromStages`
     * (advancement) rather than direct `seeds` — e.g. the finals stage in a
     * multi-stage bracket. Optional for backward-compatibility with existing
     * docs created before this field was added.
     */
    participantIds: { type: [ObjectId], default: [] },
    launchedAt: { type: Date, required: false },
    completedAt: { type: Date, required: false },
  },
  { timestamps: true }
);

schedulingMessageSchema.index({ league: 1, stageId: 1, roundIndex: 1 });

export const SchedulingMessageModel = mongoose.model(
  "SchedulingMessage",
  schedulingMessageSchema
);

export type SchedulingMessage = mongoose.InferSchemaType<
  typeof schedulingMessageSchema
> & { _id: mongoose.Types.ObjectId };
