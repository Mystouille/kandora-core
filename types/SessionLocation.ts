/**
 * Well-known session location keys.
 * Custom (free-text) locations are stored as plain strings in the DB,
 * so the `location` field type is `string`, not restricted to this enum.
 */
export enum SessionLocation {
  Entrance = "entrance",
  Conference = "conference",
  /** Sentinel used in the UI select; never persisted — replaced by the custom text. */
  Other = "other",
}
