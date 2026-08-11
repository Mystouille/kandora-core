import mongoose from "mongoose";

const ObjectId = mongoose.Schema.Types.ObjectId;

export const schedulingStatuses = [
  "upcoming",
  "in_progress",
  "completed",
] as const;
export type SchedulingStatus = (typeof schedulingStatuses)[number];

export const substituteTypes = ["team", "official"] as const;
export type PersistedSubstituteType = (typeof substituteTypes)[number];

/**
 * One seat of a persisted table. `userId` is the resolved occupant (declared
 * substitutions already applied). `teamId` scopes the team-substitute pool and
 * is null in individual mode.
 */
const schedulingSeatSchema = new mongoose.Schema(
  {
    seatIndex: { type: Number, required: true },
    teamId: { type: ObjectId, ref: "Team", required: false, default: null },
    userId: { type: ObjectId, ref: "User", required: true },
    isSub: { type: Boolean, default: false },
    subType: {
      type: String,
      enum: [...substituteTypes, null],
      required: false,
      default: null,
    },
  },
  { _id: false }
);

/**
 * One scheduled table (game slot) within a round. `gameId` links the table to
 * the finished game that was played at it, populated by the scheduling linker.
 * `wasInGame` records whether any seat at this table has been observed in-game,
 * so the worker can distinguish a table that has finished playing but whose
 * game log hasn't been linked yet ("waiting for game log") from one that simply
 * hasn't started.
 */
const schedulingTableSchema = new mongoose.Schema(
  {
    tableIndex: { type: Number, required: true },
    seats: { type: [schedulingSeatSchema], default: [] },
    gameId: { type: String, required: false, default: null },
    wasInGame: { type: Boolean, default: false },
  },
  { _id: false }
);

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
    /**
     * Persisted resolved seating for this round (one entry per table). Set at
     * scheduling-commit (`/league startnext`) and kept in sync by the worker.
     * Absent on documents created before this field was added — readers fall
     * back to regenerating the seating on the fly in that case.
     */
    tables: { type: [schedulingTableSchema], default: undefined },
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
