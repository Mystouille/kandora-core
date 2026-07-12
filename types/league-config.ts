// ---------------------------------------------------------------------------
// Rational number for lossless fractions (e.g. 2/3)
// ---------------------------------------------------------------------------

export interface Rational {
  num: number;
  den: number;
}

/** Evaluate a Rational to a float. */
export function rationalToNumber(r: Rational): number {
  return r.num / r.den;
}

// ---------------------------------------------------------------------------
// Scoring configs  (discriminated union on `type`)
// ---------------------------------------------------------------------------

export interface TeamDeltaCapScoring {
  type: "team-delta-cap";
  /** Fraction of team games a single player may contribute (e.g. 0.35). */
  capPercent: number;
  /** Cap only kicks in when a player has played more than this many games. */
  minGamesForCap: number;
}

export interface BestConsecutiveWindowScoring {
  type: "best-consecutive-window";
  /** Window size for the best-consecutive-N computation. */
  windowSize: number;
  /** Optional qualification mode — currently only "faction-top-n". */
  qualificationMode?: "faction-top-n";
  /** How many players per faction advance (used with qualificationMode). */
  qualificationCount?: number;
}

export interface CumulativeScoring {
  type: "cumulative";
}

export type RegularScoringConfig =
  | TeamDeltaCapScoring
  | BestConsecutiveWindowScoring
  | CumulativeScoring;

export interface BracketDeltaScoring {
  type: "bracket-delta";
}

export type FinalScoringConfig = BracketDeltaScoring;

// ---------------------------------------------------------------------------
// Phase / stage definitions
// ---------------------------------------------------------------------------

export interface PhaseProgression {
  /** Number of top teams/players advancing to the next phase. */
  advancingCount: number;
  /** Fraction of score retained when advancing (e.g. {num:2,den:3} for 2/3). */
  scoreRetention: Rational;
}

export interface RegularPhaseDefinition {
  id: string;
  scoring: RegularScoringConfig;
  /** When set, defines how participants advance from this phase to the next. */
  progression?: PhaseProgression;
  /** Minimum games a player/team must play in this phase to be eligible to
   *  qualify out of it (advance to the next phase or seed into the finals).
   *  Entities below the threshold remain visible in the standings but are
   *  excluded from the qualified/advancing/seeded selection. Undefined or 0
   *  means no gate. Counted against total games actually played in the phase. */
  minGames?: number;
}

export interface StageAdvancementEdge {
  stageId: string;
  /** Top N finishers from that stage advance into this one. */
  topN: number;
  /** Explicit list of 1-based places that advance from that stage (overrides
   *  the implicit `[1..topN]` expansion when present). Useful for brackets
   *  like LFCR where DF1 takes only QF1's 2nd place (not 1st). When set,
   *  `topN` should equal `places.length` so consumers that read the count
   *  remain consistent. */
  places?: number[];
}

export interface FinalStageDefinition {
  id: string;
  /** Total number of games in this stage. */
  gameCount: number;
  /** Directly seeded positions (1-based). */
  seeds: number[];
  /** Advancement edges from earlier stages. */
  fromStages: StageAdvancementEdge[];
  /** Inter-stage carry-over fraction (if absent, 0 = full reset). */
  scoreCarryOver?: Rational;
  /** Tranche/slice index grouping stages that can run concurrently — i.e. all
   *  of a slice's seeds are resolvable together (e.g. round-of-32 = 0,
   *  quarter-finals = 1). When omitted it defaults to the stage's topological
   *  bracket depth derived from `fromStages`. Used to split the Discord ranking
   *  message so concurrent stages share a message and later rounds get their
   *  own. */
  slice?: number;
}

export interface FinalPhaseDefinition {
  id: string;
  scoring: FinalScoringConfig;
  /** Fraction of the regular-phase score to carry into the first bracket stage.
   *  {num:0,den:1} = full reset. When present, games are filtered by finalsCutoffTime. */
  scoreCarryOver: Rational;
  stages: FinalStageDefinition[];
}

// ---------------------------------------------------------------------------
// Top-level league type config (stored on the League document)
// ---------------------------------------------------------------------------

export interface LeagueTypeConfig {
  displayName: string;
  isTeamMode: boolean;
  /** Single regular phase (mutually exclusive with `regularPhases`). */
  regularPhase?: RegularPhaseDefinition;
  /** Ordered list of regular phases for multi-phase leagues.
   *  Phases are separated by `phaseCutoffTimes` on the league document. */
  regularPhases?: RegularPhaseDefinition[];
  /** Bracket finals phase. */
  finalPhase?: FinalPhaseDefinition;
}
