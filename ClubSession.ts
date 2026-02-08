import mongoose from "mongoose";

export const ClubSessionModelName = "ClubSession";

const participantSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    arrivalTime: { type: Date, required: false },
    extraGuests: { type: Number, required: true, default: 0 },
    isPlaying: { type: Boolean, required: true, default: true },
    registeredAt: { type: Date, required: true, default: Date.now },
  },
  { _id: false }
);

const clubSessionSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    startTime: { type: String, required: true }, // e.g. "19:00"
    endTime: { type: String, required: false }, // e.g. "22:30"
    location: {
      type: String,
      required: true,
      enum: ["entrance", "conference"],
      default: "entrance",
    },
    capacity: { type: Number, required: true },
    participants: { type: [participantSchema], required: true, default: [] },
  },
  {
    timestamps: true,
    virtuals: {
      totalAttendees: {
        get: function (this: any) {
          return this.participants.reduce(
            (sum: number, p: any) => sum + 1 + (p.extraGuests || 0),
            0
          );
        },
      },
      spotsRemaining: {
        get: function (this: any) {
          return this.capacity - this.totalAttendees;
        },
      },
    },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

clubSessionSchema.index({ date: 1 });

export const ClubSessionModel = mongoose.model(
  ClubSessionModelName,
  clubSessionSchema
);
export type ClubSession = mongoose.InferSchemaType<typeof clubSessionSchema>;
export type Participant = mongoose.InferSchemaType<typeof participantSchema>;
