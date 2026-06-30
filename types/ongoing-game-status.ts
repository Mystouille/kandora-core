/** Live status of a game returned by an `ILeagueTournamentConnector`'s `getOngoingGames`. */
export enum OngoingGameStatus {
  /** Game is actively in progress. */
  Playing = "playing",
  /** Game is paused on the platform. */
  Paused = "paused",
  /** Platform does not expose live status (e.g. Tenhou). */
  Unknown = "unknown",
}
