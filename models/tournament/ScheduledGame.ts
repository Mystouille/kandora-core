import mongoose from "mongoose";
import { LeagueModelName } from "./League";

export const ScheduledGameModelName = "ScheduledGame";

const scheduledGameSlotSchema = new mongoose.Schema(
  {
    seatIndex: { type: Number, required: true, min: 0, max: 3 },
    participantId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
      default: null,
    },
  },
  { _id: false }
);

const scheduledGameSchema = new mongoose.Schema(
  {
    league: {
      type: mongoose.Schema.Types.ObjectId,
      ref: LeagueModelName,
      required: true,
    },
    phaseId: { type: String, required: false, default: null },
    scheduledAt: { type: Date, required: true },
    slots: {
      type: [scheduledGameSlotSchema],
      required: true,
      validate: {
        validator: (slots: Array<{ seatIndex: number }>) =>
          slots.length === 4 &&
          new Set(slots.map((slot) => slot.seatIndex)).size === 4,
        message: "A scheduled game must contain four unique seats",
      },
    },
  },
  { timestamps: true }
);

scheduledGameSchema.index({ league: 1, phaseId: 1, scheduledAt: 1, _id: 1 });

export const ScheduledGameModel = mongoose.model(
  ScheduledGameModelName,
  scheduledGameSchema
);

export type ScheduledGame = mongoose.InferSchemaType<
  typeof scheduledGameSchema
> & { _id: mongoose.Types.ObjectId };