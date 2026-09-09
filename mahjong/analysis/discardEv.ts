import {
  assertValidOpenMeld,
  createClosedHandScoreCache,
  doraToIndicator,
  type ClosedHandScoreCacheStats,
  type ClosedHandScoreResult,
  type ClosedHandScorer,
  type OpenMeld,
  type ScoredYaku,
} from "./closedHandScore";
import {
  buildUnseenTilePool,
  normalizeTile,
  physicalTileKey,
  returnToPool,
  takeFromPool,
  tilePoolEntries,
  tilePoolKey,
  tileMultisetKey,
  type RedFiveConfiguration,
  type TilePool,
} from "./tilePool";
import { valueFixedTenpai } from "./tenpaiValue";
import { Han } from "../../types/Han";
import { acceptanceTiles, shanten } from "../rules/shanten";
import { compareTiles, type Tile, type Wind } from "../rules/types";

export interface DiscardEvInput {
  hand: readonly Tile[];
  melds?: readonly OpenMeld[];
  visibleTiles?: readonly Tile[];
  doraTiles?: readonly Tile[];
  redFives?: Partial<RedFiveConfiguration>;
  roundWind?: Wind;
  seatWind?: Wind;
  drawsRemaining?: number;
  maxDepth?: number;
  timeBudgetMs?: number;
  riichiStickValue?: number;
  uraDoraEnabled?: boolean;
  noAka?: boolean;
}

export interface DiscardEvRuntime {
  now?: () => number;
  shouldAbort?: () => boolean;
  onDepthComplete?: (result: DiscardEvResult) => void;
}

export interface DiscardEvaluation {
  tile: Tile;
  shanten: number;
  expectedValue: number;
  grossExpectedValue: number;
  winProbability: number;
  conditionalWinValue: number;
  tenpaiReachProbability: number;
  frontierProbability: number;
  riichiDeclarationProbability: number;
  paths: ExplanationPath[];
  otherProbability: number;
  otherExpectedValueContribution: number;
}

export interface ExplanationStep {
  kind: "discard" | "draw" | "tenpai" | "frontier";
  tile?: Tile;
}

export interface ExplanationPath {
  steps: ExplanationStep[];
  outcome: "win" | "no-win" | "frontier";
  probability: number;
  expectedValueContribution: number;
  policy?: "riichi" | "open";
  winTile?: Tile;
  terminalHand?: Tile[];
  score?: ClosedHandScoreResult;
  yakuSet?: ScoredYaku[];
}

export interface ImmediateWinEvaluation {
  winTile: Tile;
  score: ClosedHandScoreResult;
}

export interface DiscardEvMetrics {
  elapsedMs: number;
  statesVisited: number;
  cacheHits: number;
  terminalCacheHits: number;
  shantenPrunes: number;
  drawNodes: number;
  drawBranches: number;
  discardBranches: number;
  tsumogiriBranches: number;
  nonImprovingDrawPrunes: number;
  terminalEvaluations: number;
  scoreCacheHits: number;
  scoreCacheMisses: number;
  scoreCacheEvictions: number;
}

export interface DiscardEvResult {
  discards: DiscardEvaluation[];
  bestDiscard: DiscardEvaluation | null;
  immediateWin: ImmediateWinEvaluation | null;
  completedDepth: number;
  truncated: boolean;
  metrics: DiscardEvMetrics;
}

interface NodeValue {
  expectedValue: number;
  grossExpectedValue: number;
  winProbability: number;
  tenpaiReachProbability: number;
  frontierProbability: number;
  riichiDeclarationProbability: number;
  paths: ExplanationPath[];
  otherProbability: number;
  otherExpectedValueContribution: number;
}

interface SearchContext {
  input: Required<
    Pick<
      DiscardEvInput,
      | "drawsRemaining"
      | "maxDepth"
      | "timeBudgetMs"
      | "riichiStickValue"
      | "uraDoraEnabled"
      | "noAka"
    >
  > &
    DiscardEvInput;
  doraIndicators: readonly Tile[];
  meldCount: number;
  now: () => number;
  shouldAbort: () => boolean;
  deadline: number;
  memo: Map<bigint, Map<bigint, NodeValue>>;
  terminalMemo: Map<bigint, Map<bigint, NodeValue>>;
  drawStateCount: bigint;
  depthStateCount: bigint;
  scoreHand: ClosedHandScorer;
  scoreCacheStats: ClosedHandScoreCacheStats;
  statesVisited: number;
  cacheHits: number;
  terminalCacheHits: number;
  shantenPrunes: number;
  drawNodes: number;
  drawBranches: number;
  discardBranches: number;
  tsumogiriBranches: number;
  nonImprovingDrawPrunes: number;
  terminalEvaluations: number;
}

class SearchAborted extends Error {}

function resolveInput(input: DiscardEvInput): SearchContext["input"] {
  const drawsRemaining = input.drawsRemaining ?? 8;
  const maxDepth = input.maxDepth ?? drawsRemaining;
  const timeBudgetMs = input.timeBudgetMs ?? 30_000;
  const riichiStickValue = input.riichiStickValue ?? 1000;
  const meldCount = input.melds?.length ?? 0;
  if (meldCount > 4) {
    throw new Error("Discard EV supports at most four declared melds");
  }
  for (const meld of input.melds ?? []) {
    assertValidOpenMeld(meld);
  }
  const expectedHandLength = 14 - 3 * meldCount;
  if (input.hand.length !== expectedHandLength) {
    throw new Error(
      `Discard EV requires ${expectedHandLength} concealed tiles with ${meldCount} open meld(s) (got ${input.hand.length})`
    );
  }
  if (!Number.isInteger(drawsRemaining) || drawsRemaining < 0) {
    throw new Error("drawsRemaining must be a nonnegative integer");
  }
  if (!Number.isInteger(maxDepth) || maxDepth < 0) {
    throw new Error("maxDepth must be a nonnegative integer");
  }
  if (!Number.isFinite(timeBudgetMs) || timeBudgetMs <= 0) {
    throw new Error("timeBudgetMs must be positive");
  }
  if (!Number.isFinite(riichiStickValue) || riichiStickValue < 0) {
    throw new Error("riichiStickValue must be nonnegative");
  }
  return {
    ...input,
    drawsRemaining,
    maxDepth: Math.min(maxDepth, drawsRemaining),
    timeBudgetMs,
    riichiStickValue,
    uraDoraEnabled: input.uraDoraEnabled ?? true,
    noAka: input.noAka ?? false,
  };
}

function sortedHand(hand: readonly Tile[]): Tile[] {
  return [...hand].sort(compareTiles);
}

function insertSortedTile(hand: readonly Tile[], tile: Tile): Tile[] {
  let index = 0;
  while (index < hand.length && compareTiles(hand[index], tile) <= 0) {
    index++;
  }
  return [...hand.slice(0, index), tile, ...hand.slice(index)];
}

function checkAbort(context: SearchContext): void {
  if (context.shouldAbort() || context.now() >= context.deadline) {
    throw new SearchAborted();
  }
}

const FRONTIER_VALUE: NodeValue = {
  expectedValue: 0,
  grossExpectedValue: 0,
  winProbability: 0,
  tenpaiReachProbability: 0,
  frontierProbability: 1,
  riichiDeclarationProbability: 0,
  paths: [
    {
      steps: [{ kind: "frontier" }],
      outcome: "frontier",
      probability: 1,
      expectedValueContribution: 0,
    },
  ],
  otherProbability: 0,
  otherExpectedValueContribution: 0,
};

function frontierValue(): NodeValue {
  return FRONTIER_VALUE;
}

function yakuIdentity(yaku: ScoredYaku): string {
  if (yaku.id === Han.Dora) {
    return `id:${yaku.id}:count:${yaku.value}`;
  }
  return yaku.id === null ? `name:${yaku.name}` : `id:${yaku.id}`;
}

function visibleYakuSet(score: ClosedHandScoreResult): ScoredYaku[] {
  const seen = new Set<string>();
  const result: ScoredYaku[] = [];
  for (const yaku of score.yaku) {
    if (
      yaku.id === Han.Fully_Concealed_Hand ||
      yaku.id === Han.Ura_Dora ||
      yaku.id === Han.Dora ||
      yaku.id === Han.Red_Five
    ) {
      continue;
    }
    const identity = yakuIdentity(yaku);
    if (!seen.has(identity)) {
      seen.add(identity);
      result.push(yaku);
    }
  }
  const doraCount = score.doraCount + score.akaDoraCount;
  if (doraCount > 0) {
    result.push({
      id: Han.Dora,
      name: "ドラ",
      value: `${doraCount}飜`,
    });
  }
  return result;
}

function yakuSetKey(yakuSet: readonly ScoredYaku[]): string {
  return yakuSet.map(yakuIdentity).sort().join("|");
}

function mergeWinningPathsByYakuSet(
  paths: readonly ExplanationPath[]
): ExplanationPath[] {
  const passthrough: ExplanationPath[] = [];
  const groups = new Map<
    string,
    { path: ExplanationPath; representativeContribution: number }
  >();

  for (const originalPath of paths) {
    if (originalPath.outcome !== "win" || !originalPath.score) {
      passthrough.push(originalPath);
      continue;
    }
    const path = {
      ...originalPath,
      yakuSet: originalPath.yakuSet ?? visibleYakuSet(originalPath.score),
    };
    const key = yakuSetKey(path.yakuSet);
    const existing = groups.get(key);
    if (!existing) {
      groups.set(key, {
        path,
        representativeContribution: Math.abs(path.expectedValueContribution),
      });
      continue;
    }

    const probability = existing.path.probability + path.probability;
    const expectedValueContribution =
      existing.path.expectedValueContribution + path.expectedValueContribution;
    const representativeContribution = Math.abs(path.expectedValueContribution);
    if (representativeContribution > existing.representativeContribution) {
      groups.set(key, {
        path: { ...path, probability, expectedValueContribution },
        representativeContribution,
      });
    } else {
      existing.path = {
        ...existing.path,
        probability,
        expectedValueContribution,
      };
    }
  }

  return [...passthrough, ...[...groups.values()].map((group) => group.path)];
}

function pruneExplanationPaths(
  paths: ExplanationPath[],
  otherProbability = 0,
  otherExpectedValueContribution = 0
): Pick<
  NodeValue,
  "paths" | "otherProbability" | "otherExpectedValueContribution"
> {
  const mergedPaths = mergeWinningPathsByYakuSet(paths);
  const keep = new Set<ExplanationPath>();
  const byProbability = [...mergedPaths].sort(
    (left, right) => right.probability - left.probability
  );
  const byContribution = [...mergedPaths].sort(
    (left, right) =>
      Math.abs(right.expectedValueContribution) -
      Math.abs(left.expectedValueContribution)
  );
  for (const path of mergedPaths) {
    if (path.outcome === "win") {
      keep.add(path);
    }
  }
  for (const path of byProbability.slice(0, 12)) {
    keep.add(path);
  }
  for (const path of byContribution.slice(0, 12)) {
    keep.add(path);
  }

  const retained: ExplanationPath[] = [];
  for (const path of mergedPaths) {
    if (keep.has(path)) {
      retained.push(path);
    } else {
      otherProbability += path.probability;
      otherExpectedValueContribution += path.expectedValueContribution;
    }
  }
  return {
    paths: retained.sort(
      (left, right) =>
        Math.abs(right.expectedValueContribution) -
          Math.abs(left.expectedValueContribution) ||
        right.probability - left.probability
    ),
    otherProbability,
    otherExpectedValueContribution,
  };
}

function prependExplanationStep(
  value: NodeValue,
  step: ExplanationStep
): NodeValue {
  return {
    ...value,
    paths: value.paths.map((path) => ({
      ...path,
      steps: [step, ...path.steps],
    })),
  };
}

function terminalValue(
  hand: readonly Tile[],
  handStateKey: bigint,
  pool: TilePool,
  drawsRemaining: number,
  context: SearchContext
): NodeValue {
  const key =
    tilePoolKey(pool) * context.drawStateCount + BigInt(drawsRemaining);
  let handMemo = context.terminalMemo.get(handStateKey);
  const cached = handMemo?.get(key);
  if (cached) {
    context.terminalCacheHits++;
    return cached;
  }
  context.terminalEvaluations++;
  const result = valueFixedTenpai({
    hand,
    unseenPool: pool,
    drawsRemaining,
    doraIndicators: context.doraIndicators,
    melds: context.input.melds,
    roundWind: context.input.roundWind,
    seatWind: context.input.seatWind,
    riichiStickValue: context.input.riichiStickValue,
    uraDoraEnabled: context.input.uraDoraEnabled,
    noAka: context.input.noAka,
    scoreHand: context.scoreHand,
  });
  const terminalHand = [...hand];
  const paths: ExplanationPath[] = [];
  for (const wait of result.evaluation.waits) {
    for (const outcome of wait.outcomes) {
      paths.push({
        steps: [{ kind: "tenpai" }],
        outcome: "win",
        probability: outcome.hitProbability,
        expectedValueContribution: outcome.expectedValueContribution,
        policy: result.evaluation.policy,
        winTile: wait.tile,
        terminalHand,
        score: outcome.score,
        yakuSet: visibleYakuSet(outcome.score),
      });
    }
  }
  paths.push({
    steps: [{ kind: "tenpai" }],
    outcome: "no-win",
    probability: 1 - result.evaluation.winProbability,
    expectedValueContribution:
      result.evaluation.expectedValue - result.evaluation.grossExpectedValue,
    policy: result.evaluation.policy,
    terminalHand,
  });
  const explanation = pruneExplanationPaths(paths);
  const value: NodeValue = {
    expectedValue: result.evaluation.expectedValue,
    grossExpectedValue: result.evaluation.grossExpectedValue,
    winProbability: result.evaluation.winProbability,
    tenpaiReachProbability: 1,
    frontierProbability: 0,
    riichiDeclarationProbability: result.evaluation.policy === "riichi" ? 1 : 0,
    ...explanation,
  };
  if (!handMemo) {
    handMemo = new Map();
    context.terminalMemo.set(handStateKey, handMemo);
  }
  handMemo.set(key, value);
  return value;
}

function compareNodeValues(left: NodeValue, right: NodeValue): number {
  const fields: Array<
    "expectedValue" | "winProbability" | "grossExpectedValue"
  > = ["expectedValue", "winProbability", "grossExpectedValue"];
  for (const field of fields) {
    const difference = left[field] - right[field];
    if (Math.abs(difference) > 1e-9) {
      return difference;
    }
  }
  return 0;
}

function evaluateThirteenTileState(
  hand: readonly Tile[],
  handStateKey: bigint,
  pool: TilePool,
  drawsRemaining: number,
  depthRemaining: number,
  context: SearchContext
): NodeValue {
  checkAbort(context);
  context.statesVisited++;
  const key =
    (tilePoolKey(pool) * context.drawStateCount + BigInt(drawsRemaining)) *
      context.depthStateCount +
    BigInt(depthRemaining);
  let handMemo = context.memo.get(handStateKey);
  const cached = handMemo?.get(key);
  if (cached) {
    context.cacheHits++;
    return cached;
  }

  const currentShanten = shanten(hand, context.meldCount);
  let value: NodeValue;
  if (currentShanten === 0) {
    value = terminalValue(hand, handStateKey, pool, drawsRemaining, context);
  } else if (
    drawsRemaining === 0 ||
    currentShanten > depthRemaining ||
    pool.total === 0
  ) {
    if (currentShanten > depthRemaining) {
      context.shantenPrunes++;
    }
    value = frontierValue();
  } else {
    value = evaluateDrawNode(
      hand,
      handStateKey,
      pool,
      drawsRemaining,
      depthRemaining,
      currentShanten,
      context
    );
  }
  if (!handMemo) {
    handMemo = new Map();
    context.memo.set(handStateKey, handMemo);
  }
  handMemo.set(key, value);
  return value;
}

function evaluateDrawNode(
  hand: readonly Tile[],
  handStateKey: bigint,
  pool: TilePool,
  drawsRemaining: number,
  depthRemaining: number,
  currentShanten: number,
  context: SearchContext
): NodeValue {
  context.drawNodes++;
  const aggregate: NodeValue = {
    expectedValue: 0,
    grossExpectedValue: 0,
    winProbability: 0,
    tenpaiReachProbability: 0,
    frontierProbability: 0,
    riichiDeclarationProbability: 0,
    paths: [],
    otherProbability: 0,
    otherExpectedValueContribution: 0,
  };
  const total = pool.total;
  const requiredImprovingDraws =
    currentShanten === depthRemaining
      ? new Set(
          acceptanceTiles(hand, context.meldCount).map((tile) =>
            normalizeTile(tile)
          )
        )
      : null;
  for (const { tile, count } of tilePoolEntries(pool)) {
    checkAbort(context);
    context.drawBranches++;
    const probability = count / total;
    if (
      requiredImprovingDraws &&
      !requiredImprovingDraws.has(normalizeTile(tile))
    ) {
      context.nonImprovingDrawPrunes++;
      const discardTile = compareTiles(hand[0], tile) <= 0 ? hand[0] : tile;
      const child = prependExplanationStep(frontierValue(), {
        kind: "discard",
        tile: discardTile,
      });
      aggregate.frontierProbability += probability;
      aggregate.paths.push(
        ...child.paths.map((path) => ({
          ...path,
          steps: [{ kind: "draw" as const, tile }, ...path.steps],
          probability: probability * path.probability,
        }))
      );
      continue;
    }
    takeFromPool(pool, tile);
    let child: NodeValue;
    try {
      child = evaluateDiscardNode(
        insertSortedTile(hand, tile),
        handStateKey + physicalTileKey(tile),
        tile,
        hand,
        handStateKey,
        pool,
        drawsRemaining - 1,
        depthRemaining - 1,
        context
      );
    } finally {
      returnToPool(pool, tile);
    }

    aggregate.expectedValue += probability * child.expectedValue;
    aggregate.grossExpectedValue += probability * child.grossExpectedValue;
    aggregate.winProbability += probability * child.winProbability;
    aggregate.tenpaiReachProbability +=
      probability * child.tenpaiReachProbability;
    aggregate.frontierProbability += probability * child.frontierProbability;
    aggregate.riichiDeclarationProbability +=
      probability * child.riichiDeclarationProbability;
    aggregate.paths.push(
      ...child.paths.map((path) => ({
        ...path,
        steps: [{ kind: "draw" as const, tile }, ...path.steps],
        probability: probability * path.probability,
        expectedValueContribution: probability * path.expectedValueContribution,
      }))
    );
    aggregate.otherProbability += probability * child.otherProbability;
    aggregate.otherExpectedValueContribution +=
      probability * child.otherExpectedValueContribution;
  }
  return {
    ...aggregate,
    ...pruneExplanationPaths(
      aggregate.paths,
      aggregate.otherProbability,
      aggregate.otherExpectedValueContribution
    ),
  };
}

function evaluateDiscardNode(
  hand: readonly Tile[],
  handStateKey: bigint,
  drawnTile: Tile,
  preDrawHand: readonly Tile[],
  preDrawHandStateKey: bigint,
  pool: TilePool,
  drawsRemaining: number,
  depthRemaining: number,
  context: SearchContext
): NodeValue {
  let best: NodeValue | null = null;
  let bestTile: Tile | null = null;
  let previousTile: Tile | null = null;
  for (let index = 0; index < hand.length; index++) {
    const tile = hand[index];
    if (tile === previousTile) {
      continue;
    }
    previousTile = tile;
    checkAbort(context);
    context.discardBranches++;
    const isTsumogiri = tile === drawnTile;
    if (isTsumogiri) {
      context.tsumogiriBranches++;
    }
    let nextHand: readonly Tile[] = preDrawHand;
    if (!isTsumogiri) {
      const discardedHand = [...hand];
      discardedHand.splice(index, 1);
      nextHand = discardedHand;
    }
    const value = evaluateThirteenTileState(
      nextHand,
      isTsumogiri ? preDrawHandStateKey : handStateKey - physicalTileKey(tile),
      pool,
      drawsRemaining,
      depthRemaining,
      context
    );
    if (best === null || compareNodeValues(value, best) > 0) {
      best = value;
      bestTile = tile;
    }
  }
  return best && bestTile
    ? prependExplanationStep(best, { kind: "discard", tile: bestTile })
    : frontierValue();
}

function conditionalWinValue(value: NodeValue): number {
  return value.winProbability > 0
    ? value.grossExpectedValue / value.winProbability
    : 0;
}

function compareDiscards(
  left: DiscardEvaluation,
  right: DiscardEvaluation
): number {
  const valueComparison = compareNodeValues(left, right);
  if (valueComparison !== 0) {
    return -valueComparison;
  }
  return compareTiles(left.tile, right.tile);
}

function evaluateRoot(
  hand: readonly Tile[],
  handStateKey: bigint,
  pool: TilePool,
  depth: number,
  context: SearchContext
): DiscardEvaluation[] {
  const evaluations: DiscardEvaluation[] = [];
  for (const tile of [...new Set(hand)]) {
    checkAbort(context);
    const nextHand = [...hand];
    nextHand.splice(nextHand.indexOf(tile), 1);
    const value = evaluateThirteenTileState(
      nextHand,
      handStateKey - physicalTileKey(tile),
      pool,
      context.input.drawsRemaining,
      depth,
      context
    );
    const rootValue = prependExplanationStep(value, {
      kind: "discard",
      tile,
    });
    evaluations.push({
      tile,
      shanten: shanten(nextHand, context.meldCount),
      ...rootValue,
      conditionalWinValue: conditionalWinValue(rootValue),
    });
  }
  return evaluations.sort(compareDiscards);
}

function snapshotResult(
  discards: DiscardEvaluation[],
  completedDepth: number,
  maxDepth: number,
  start: number,
  context: SearchContext
): DiscardEvResult {
  return {
    discards,
    bestDiscard: discards[0] ?? null,
    immediateWin: null,
    completedDepth,
    truncated: completedDepth < maxDepth,
    metrics: {
      elapsedMs: Math.max(0, context.now() - start),
      statesVisited: context.statesVisited,
      cacheHits: context.cacheHits,
      terminalCacheHits: context.terminalCacheHits,
      shantenPrunes: context.shantenPrunes,
      drawNodes: context.drawNodes,
      drawBranches: context.drawBranches,
      discardBranches: context.discardBranches,
      tsumogiriBranches: context.tsumogiriBranches,
      nonImprovingDrawPrunes: context.nonImprovingDrawPrunes,
      terminalEvaluations: context.terminalEvaluations,
      scoreCacheHits: context.scoreCacheStats.hits,
      scoreCacheMisses: context.scoreCacheStats.misses,
      scoreCacheEvictions: context.scoreCacheStats.evictions,
    },
  };
}

export function analyzeDiscardEv(
  rawInput: DiscardEvInput,
  runtime: DiscardEvRuntime = {}
): DiscardEvResult {
  const input = resolveInput(rawInput);
  const now = runtime.now ?? Date.now;
  const start = now();
  const scoreCacheStats: ClosedHandScoreCacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0,
  };
  const context: SearchContext = {
    input,
    doraIndicators: (input.doraTiles ?? []).map(doraToIndicator),
    meldCount: input.melds?.length ?? 0,
    now,
    shouldAbort: runtime.shouldAbort ?? (() => false),
    deadline: start + input.timeBudgetMs,
    memo: new Map(),
    terminalMemo: new Map(),
    drawStateCount: BigInt(input.drawsRemaining + 1),
    depthStateCount: BigInt(input.maxDepth + 1),
    scoreHand: createClosedHandScoreCache(4096, scoreCacheStats),
    scoreCacheStats,
    statesVisited: 0,
    cacheHits: 0,
    terminalCacheHits: 0,
    shantenPrunes: 0,
    drawNodes: 0,
    drawBranches: 0,
    discardBranches: 0,
    tsumogiriBranches: 0,
    nonImprovingDrawPrunes: 0,
    terminalEvaluations: 0,
  };
  const unseenPool = buildUnseenTilePool({
    hand: [
      ...input.hand,
      ...(input.melds?.flatMap((meld) => meld.tiles) ?? []),
    ],
    visibleTiles: input.visibleTiles,
    doraIndicators: context.doraIndicators,
    redFives: input.redFives,
  });

  if (shanten(input.hand, context.meldCount) === -1) {
    const winTile = input.hand[input.hand.length - 1];
    const score = context.scoreHand({
      hand: input.hand.slice(0, -1),
      winTile,
      tsumo: true,
      doraIndicators: context.doraIndicators,
      roundWind: input.roundWind,
      seatWind: input.seatWind,
      noAka: input.noAka,
      melds: input.melds,
    });
    return {
      discards: [],
      bestDiscard: null,
      immediateWin: { winTile, score },
      completedDepth: 0,
      truncated: false,
      metrics: {
        elapsedMs: Math.max(0, now() - start),
        statesVisited: 0,
        cacheHits: 0,
        terminalCacheHits: 0,
        shantenPrunes: 0,
        drawNodes: 0,
        drawBranches: 0,
        discardBranches: 0,
        tsumogiriBranches: 0,
        nonImprovingDrawPrunes: 0,
        terminalEvaluations: 0,
        scoreCacheHits: 0,
        scoreCacheMisses: 0,
        scoreCacheEvictions: 0,
      },
    };
  }

  const searchHand = sortedHand(input.hand);
  const searchHandStateKey = tileMultisetKey(searchHand);
  let lastComplete: DiscardEvResult | null = null;
  for (let depth = 0; depth <= input.maxDepth; depth++) {
    try {
      const discards = evaluateRoot(
        searchHand,
        searchHandStateKey,
        unseenPool,
        depth,
        context
      );
      lastComplete = snapshotResult(
        discards,
        depth,
        input.maxDepth,
        start,
        context
      );
      runtime.onDepthComplete?.(lastComplete);
    } catch (error) {
      if (error instanceof SearchAborted) {
        break;
      }
      throw error;
    }
  }

  if (!lastComplete) {
    throw new Error("Search budget expired before depth zero completed");
  }
  return {
    ...lastComplete,
    truncated: lastComplete.completedDepth < input.maxDepth,
    metrics: {
      ...lastComplete.metrics,
      elapsedMs: Math.max(0, now() - start),
    },
  };
}
