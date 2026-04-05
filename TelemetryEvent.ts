import mongoose from "mongoose";

const telemetryEventSchema = new mongoose.Schema({
  // "request" | "error" | "client" | "worker" | "custom"
  type: { type: String, required: true, index: true },
  // "dev" | "prod"
  env: { type: String, index: true },
  // HTTP method or custom action name
  method: { type: String },
  // URL path (no query string)
  path: { type: String, index: true },
  // HTTP status code
  statusCode: { type: Number },
  // Duration in ms (server-side request handling)
  durationMs: { type: Number },
  // Authenticated user ID (if any)
  userId: { type: String, index: true },
  // Client session ID (unique per page load, links client ↔ server events)
  sessionId: { type: String, index: true },
  // Error message (if type is "error")
  error: { type: String },
  // Error stack trace
  stack: { type: String },
  // Arbitrary metadata
  meta: { type: mongoose.Schema.Types.Mixed },
  // Auto-set on creation; TTL index auto-deletes after 10 days
  createdAt: { type: Date, default: Date.now, index: true },
});

// Auto-expire after 10 days (864_000 seconds)
telemetryEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 864_000 });
// Compound index for common queries
telemetryEventSchema.index({ type: 1, createdAt: -1 });

export const TelemetryEventModel =
  mongoose.models.TelemetryEvent ||
  mongoose.model("TelemetryEvent", telemetryEventSchema, "telemetryEvents");
