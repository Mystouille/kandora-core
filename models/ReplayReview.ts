import mongoose, { Schema } from "mongoose";

/**
 * `replayreviews` collection — one document per shared review of a
 * replay (Tenhou / Mahjong Soul / Riichi City / ingame).
 *
 * A review is a sparse, per-event-index annotation layer authored
 * collaboratively by one or more logged-in reviewers. Each edit is
 * keyed by `(eventIndex, author)`, so multiple reviewers can annotate
 * the same event; a reviewer may hold at most one edit per event,
 * carrying either a text note, a freehand drawing, or both. A user can
 * only create / edit / delete their own edits.
 *
 * `reviewers` is an ordered list appended the first time each user
 * contributes; a reviewer's index in it drives their color assignment
 * across the whole review (1st = orange, 2nd = blue, … — see
 * `reviewerColor` in `app/game/replay/reviewDrawing.ts`). `createdBy`
 * is the user who opened the review and owns the shareable `shortId`.
 *
 * The drawing is stored as a packed binary blob (see
 * `app/game/replay/reviewDrawing.ts` for the codec). Coordinates are
 * normalized to [0..1] so the same drawing renders correctly
 * regardless of the actual canvas size. The codec is versioned: new
 * drawings are written at 16-bit-per-axis precision (v2) while the
 * legacy 8-bit (v1) grid is still decoded for older reviews.
 *
 * `shortId` is the publicly shareable handle. It is intentionally
 * decoupled from `_id` so we can rotate it later (e.g. revoke a leaked
 * link) without losing the document.
 */

const ReplayReviewEditSchema = new Schema(
  {
    eventIndex: { type: Number, required: true, min: 0 },
    // The reviewer who authored this edit. Optional only for
    // backward-compat with single-owner reviews written before the
    // collaborative model landed; those legacy edits are treated as
    // authored by the review's `createdBy`.
    author: { type: Schema.Types.ObjectId, ref: "User", required: false },
    text: { type: String, required: false, default: "" },
    // Packed polyline drawing (see `reviewDrawing.ts`). Stored as a
    // Mongo `BinData` blob — typical reviews are a few hundred bytes.
    drawing: { type: Buffer, required: false },
    updatedAt: { type: Date, required: true, default: () => new Date() },
  },
  { _id: false }
);

/**
 * A reviewer who has contributed at least one edit, in
 * first-contribution order. Index in the array = color slot.
 * `name` is captured at contribution time (JWT username) so the UI
 * can label bubbles without a join.
 */
const ReplayReviewerSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, default: "" },
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
    // single perspective: once the first edit is saved we lock the
    // seat so that every annotation in the review — from every
    // reviewer — is discussed from the same point of view. `null`
    // means no edit exists yet and the seat can still be changed.
    // Set lazily by the PUT handler the first time an edit is
    // persisted.
    seat: { type: Number, required: false, default: null, min: 0, max: 3 },
    // Reviewers in first-contribution order; drives per-reviewer
    // color assignment across the whole review.
    reviewers: { type: [ReplayReviewerSchema], required: true, default: [] },
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
