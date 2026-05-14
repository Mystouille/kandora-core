import mongoose, { Schema } from "mongoose";

/**
 * `replaylogs` collection — one document per platform game whose
 * replay is available in-app. Phase 4.5 (cross-platform replay).
 *
 * Key model: `(source, sourceGameId)` is unique. The portal-side
 * hydration pipeline (`GameHydrationService.server.ts`) eagerly
 * produces one row per league/tournament game alongside the
 * `GameRecord`; the in-app game's `archiveMatch` writes one row
 * with `source: "ingame"` and `sourceGameId === matchId`.
 *
 * The model lives in `app/db/models/` (the shared schema layer) so
 * the game-server can import it across the boundary rule. The
 * embedded `events` are `Schema.Types.Mixed` so the Mongoose layer
 * stays out of the `GameEvent` Zod schema's way.
 *
 * Extraction: at extraction time the collection is renamed (e.g.
 * `mahjong_replaylogs`) per the extraction playbook.
 */

const ReplaySeatSchema = new Schema(
  {
    seat: { type: Number, required: true, min: 0, max: 3 },
    displayName: { type: String, required: true },
    finalScore: { type: Number, required: true },
    place: { type: Number, required: true, min: 1, max: 4 },
  },
  { _id: false }
);

const ReplayLogSchema = new Schema(
  {
    source: {
      type: String,
      required: true,
      enum: ["ingame", "majsoul", "tenhou", "riichicity"],
    },
    sourceGameId: { type: String, required: true },
    ruleSet: { type: String, required: true },
    ruleSetDetails: { type: Schema.Types.Mixed, required: false },
    startedAt: { type: Number, required: true },
    endedAt: { type: Number, required: true },
    seats: { type: [ReplaySeatSchema], required: true },
    events: { type: [Schema.Types.Mixed], required: true, default: [] },
    schemaVersion: { type: Number, required: true },
    parsedAt: { type: Date, required: true, default: () => new Date() },
  },
  { timestamps: true }
);

ReplayLogSchema.index({ source: 1, sourceGameId: 1 }, { unique: true });

export const ReplayLogModelName = "ReplayLog";

export const ReplayLogModel =
  mongoose.models.ReplayLog ??
  mongoose.model(ReplayLogModelName, ReplayLogSchema, "replaylogs");

export type DbReplayLog = mongoose.InferSchemaType<typeof ReplayLogSchema>;
