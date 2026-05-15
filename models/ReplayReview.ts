import mongoose, { Schema } from "mongoose";

/**
 * `replayreviews` collection — one document per user-authored review
 * of a replay (Tenhou / Mahjong Soul / Riichi City / ingame).
 *
 * A review is a sparse, per-event-index annotation layer: at most one
 * `ReplayReviewEdit` per `eventIndex`, containing either a text note,
 * a freehand drawing, or both. Editing is owner-only (matched on
 * `createdBy`); the review can be shared read-only via its `shortId`.
 *
 * The drawing is stored as a packed binary blob (see
 * `app/game/replay/reviewDrawing.ts` for the codec). The format is
 * normalized to a 256×256 grid so the same drawing renders correctly
 * regardless of the actual canvas size.
 *
 * `shortId` is the publicly shareable handle. It is intentionally
 * decoupled from `_id` so we can rotate it later (e.g. revoke a leaked
 * link) without losing the document.
 */

const ReplayReviewEditSchema = new Schema(
  {
    eventIndex: { type: Number, required: true, min: 0 },
    text: { type: String, required: false, default: "" },
    // Packed polyline drawing (see `reviewDrawing.ts`). Stored as a
    // Mongo `BinData` blob — typical reviews are a few hundred bytes.
    drawing: { type: Buffer, required: false },
    updatedAt: { type: Date, required: true, default: () => new Date() },
  },
  { _id: false }
);

const ReplayReviewSchema = new Schema(
  {
    shortId: { type: String, required: true, unique: true, index: true },
    source: {
      type: String,
      required: true,
      enum: ["ingame", "majsoul", "tenhou", "riichicity"],
    },
    sourceGameId: { type: String, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    // The seat (0–3) this review is "about". A review is bound to a
    // single perspective: once the author has saved their first edit
    // we lock the seat so that every annotation in the review is
    // discussed from the same point of view. `null` means no edit
    // exists yet and the author can still freely change the focused
    // seat. Set lazily by the PUT handler the first time an edit is
    // persisted.
    seat: { type: Number, required: false, default: null, min: 0, max: 3 },
    edits: { type: [ReplayReviewEditSchema], required: true, default: [] },
  },
  { timestamps: true }
);

// Helpful lookup index for "my reviews of game X".
ReplayReviewSchema.index({ createdBy: 1, source: 1, sourceGameId: 1 });

export const ReplayReviewModelName = "ReplayReview";

export const ReplayReviewModel =
  mongoose.models.ReplayReview ??
  mongoose.model(ReplayReviewModelName, ReplayReviewSchema, "replayreviews");

export type DbReplayReviewEdit = mongoose.InferSchemaType<
  typeof ReplayReviewEditSchema
>;
export type DbReplayReview = mongoose.InferSchemaType<
  typeof ReplayReviewSchema
>;
