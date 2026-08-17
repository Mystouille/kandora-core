import { useEffect, useMemo, type CSSProperties } from "react";
import { theme } from "antd";

import honbaStickUrl from "./assets/sticks/honbaStick.png?url";
import riichiStickUrl from "./assets/sticks/riichiStick.png?url";
import uzakuFlatDarkUrl from "./assets/tiles/uzaku/uzakuFlatDark.png?url";
import uzakuFlatDarkLightBorderUrl from "./assets/tiles/uzaku/uzakuFlatDarkLightBorder.png?url";
import {
  MeldSource,
  MeldType,
  TILE_SETS,
  TileSetName,
  getTilePosition,
  parseHand,
  resolveTileSetImageUrls,
  type MeldToDisplay,
  type ParsedHand,
} from "./handLayout";
import {
  MAHJONG_TABLE_POSITIONS,
  deriveMahjongTableWind,
  expandDoraIndicatorSlots,
  type MahjongTableDiscard,
  type MahjongTablePlayerState,
  type MahjongTablePosition,
  type MahjongTableStateV1,
  type MahjongTableWind,
} from "./mahjongTableState";
import {
  getMahjongTableWarnings,
  type MahjongTableWarning,
} from "./mahjongTableWarnings";
import "./MahjongTableDisplay.css";

interface MahjongTableDisplayProps {
  state: MahjongTableStateV1;
  className?: string;
  ariaLabel?: string;
  onWarningsChange?: (warnings: MahjongTableWarning[]) => void;
}

interface TableTileProps {
  tile: string;
  kind: "hand" | "discard" | "dora";
  sideways?: boolean;
  called?: boolean;
  tsumogiri?: boolean;
  style?: CSSProperties;
}

const UZAKU_CONFIG = TILE_SETS[TileSetName.Uzaku];
const FOCUSED_HAND_WIDTH_CQI = 97.4;
const FOCUSED_HAND_SIDE_GAP_UNITS = 0.5;
const MAX_FOCUSED_TILE_WIDTH_CQI = 7.5;
const DRAWN_TILE_GAP_CQI = 0.8;
const HAND_TILE_ASPECT_RATIO = UZAKU_CONFIG.tileH / UZAKU_CONFIG.tileW;
const CORE_LAYOUT_UNITS = 53.91;
const OPPONENT_HAND_DEPTH_RATIO = (5.235 + 3.75 / 2) / CORE_LAYOUT_UNITS;
const WIND_KANJI: Record<MahjongTableWind, string> = {
  E: "東",
  S: "南",
  W: "西",
  N: "北",
};

type TableGeometryStyle = CSSProperties & {
  "--k-table-hand-tile-w"?: string;
  "--k-table-hand-tile-h"?: string;
  "--k-table-hand-sideways-offset"?: string;
  "--k-table-core-horizontal-limit"?: string;
  "--k-table-core-vertical-limit"?: string;
  "--k-table-core-top-inset"?: string;
  "--k-table-core-right-inset"?: string;
  "--k-table-core-bottom-inset"?: string;
  "--k-table-core-left-inset"?: string;
  "--k-table-left-hand-right"?: string;
};

function TableTile({
  tile,
  kind,
  sideways = false,
  called = false,
  tsumogiri = false,
  style,
}: TableTileProps) {
  const { token } = theme.useToken();
  const isDark =
    (token.colorBgBase ?? "").startsWith("#0") ||
    (token.colorBgBase ?? "").startsWith("#1");
  const imageUrls = resolveTileSetImageUrls(UZAKU_CONFIG, isDark);
  const tilesImageUrl =
    kind === "dora" ? UZAKU_CONFIG.tilesImageUrl : imageUrls.tilesImageUrl;
  const tsumogiriImageUrl = isDark
    ? uzakuFlatDarkLightBorderUrl
    : uzakuFlatDarkUrl;
  const position = getTilePosition(tile, UZAKU_CONFIG);
  const column = position.x / UZAKU_CONFIG.tileW;
  const row = position.y / UZAKU_CONFIG.tileH;
  const classes = [
    "k-mahjong-table__tile-cell",
    `k-mahjong-table__tile-cell--${kind}`,
    sideways ? "k-mahjong-table__tile-cell--sideways" : "",
    called ? "k-mahjong-table__tile-cell--called" : "",
    tsumogiri ? "k-mahjong-table__tile-cell--tsumogiri" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={classes} style={style} aria-hidden="true">
      <span className="k-mahjong-table__tile-face">
        <img
          className="k-mahjong-table__tile-sheet"
          src={tsumogiri ? tsumogiriImageUrl : tilesImageUrl}
          alt=""
          draggable={false}
          style={{
            left: `${column * -100}%`,
            top: `${row * -100}%`,
          }}
        />
      </span>
    </span>
  );
}

function meldTileIsSideways(meld: MeldToDisplay, tileIndex: number): boolean {
  if (meld.type === MeldType.Ankan) {
    return false;
  }
  return (
    (tileIndex === 0 && meld.source === MeldSource.Kamicha) ||
    (tileIndex === 1 && meld.source === MeldSource.Toimen) ||
    (tileIndex === meld.tiles.length - 1 && meld.source === MeldSource.Shimocha)
  );
}

function handIsVisible(
  player: MahjongTablePlayerState,
  parsed: ParsedHand
): boolean {
  return (
    player.showConcealed &&
    (parsed.closedTiles.length > 0 || parsed.melds.length > 0)
  );
}

function focusedHandStyle(
  player: MahjongTablePlayerState,
  parsed: ParsedHand
): TableGeometryStyle | undefined {
  if (!handIsVisible(player, parsed)) {
    return undefined;
  }

  const showClosed = parsed.closedTiles.length > 0;
  let widthUnits = showClosed ? parsed.closedTiles.length : 0;
  let fixedGap = 0;

  if (showClosed) {
    for (
      let tileIndex = 0;
      tileIndex < parsed.closedTiles.length;
      tileIndex++
    ) {
      const explicitGap = parsed.closedGapsBefore[tileIndex] ?? 0;
      const separateDrawnTile =
        explicitGap === 0 &&
        parsed.lastTileSeparated &&
        tileIndex === parsed.closedTiles.length - 1;
      fixedGap +=
        (explicitGap || (separateDrawnTile ? 1 : 0)) * DRAWN_TILE_GAP_CQI;
    }
  }

  if (showClosed && parsed.melds.length > 0) {
    widthUnits += 1;
  }
  for (const meld of parsed.melds) {
    for (let tileIndex = 0; tileIndex < meld.tiles.length; tileIndex++) {
      widthUnits += meldTileIsSideways(meld, tileIndex)
        ? HAND_TILE_ASPECT_RATIO
        : 1;
    }
  }

  if (widthUnits === 0) {
    return undefined;
  }

  const tileWidth = Math.min(
    MAX_FOCUSED_TILE_WIDTH_CQI,
    Math.max(
      1,
      (FOCUSED_HAND_WIDTH_CQI - fixedGap) /
        (widthUnits + FOCUSED_HAND_SIDE_GAP_UNITS)
    )
  );
  const tileHeight = tileWidth * HAND_TILE_ASPECT_RATIO;

  return {
    "--k-table-hand-tile-w": `${tileWidth}cqi`,
    "--k-table-hand-tile-h": `${tileHeight}cqi`,
    "--k-table-hand-sideways-offset": `${(tileHeight - tileWidth) / 2}cqi`,
  };
}

function tableGeometryStyle(state: MahjongTableStateV1): TableGeometryStyle {
  const parsedHands = {} as Record<MahjongTablePosition, ParsedHand>;
  const visibleHands = {} as Record<MahjongTablePosition, boolean>;

  for (const position of MAHJONG_TABLE_POSITIONS) {
    const parsed = parseHand(state.players[position].hand);
    parsedHands[position] = parsed;
    visibleHands[position] = handIsVisible(state.players[position], parsed);
  }

  const horizontalOpponentCount =
    Number(visibleHands.left) + Number(visibleHands.right);
  const topOpponentCount = Number(visibleHands.top);
  const horizontalMultiplier =
    1 / (1 + horizontalOpponentCount * OPPONENT_HAND_DEPTH_RATIO);
  const verticalMultiplier =
    1 / (1 + topOpponentCount * OPPONENT_HAND_DEPTH_RATIO);
  const emptySideInset = "calc(var(--k-table-player-cartridge-h) + 1.2cqi)";
  const visibleOpponentInset =
    "calc(var(--k-table-player-cartridge-h) + 1.95cqi + var(--k-table-opponent-hand-depth))";
  const focusedInset = visibleHands.bottom
    ? "calc(var(--k-table-player-cartridge-h) + 1.95cqi + var(--k-table-hand-tile-h) + 0.5 * var(--k-table-hand-tile-w))"
    : emptySideInset;
  const focusedDepth = visibleHands.bottom
    ? "var(--k-table-hand-tile-h) + 0.75cqi + 0.5 * var(--k-table-hand-tile-w)"
    : "0cqi";
  const coreTop = visibleHands.bottom
    ? "calc(100cqi - var(--k-table-core-bottom-inset) - var(--k-table-core-size))"
    : visibleHands.top
      ? "var(--k-table-core-top-inset)"
      : undefined;

  return {
    ...focusedHandStyle(state.players.bottom, parsedHands.bottom),
    "--k-table-core-horizontal-limit": `calc(${horizontalMultiplier.toFixed(9)} * (100cqi - 2 * (var(--k-table-player-cartridge-h) + 1.2cqi) - ${horizontalOpponentCount * 0.75}cqi))`,
    "--k-table-core-vertical-limit": `calc(${verticalMultiplier.toFixed(9)} * (100cqi - 2 * (var(--k-table-player-cartridge-h) + 1.2cqi) - ${topOpponentCount * 0.75}cqi - (${focusedDepth})))`,
    "--k-table-core-top-inset": visibleHands.top
      ? visibleOpponentInset
      : emptySideInset,
    "--k-table-core-right-inset": visibleHands.right
      ? visibleOpponentInset
      : emptySideInset,
    "--k-table-core-bottom-inset": focusedInset,
    "--k-table-core-left-inset": visibleHands.left
      ? visibleOpponentInset
      : emptySideInset,
    ...(coreTop ? { "--k-table-core-top": coreTop } : {}),
    "--k-table-left-hand-right": visibleHands.bottom
      ? "calc(var(--k-table-player-cartridge-h) + 1.2cqi + var(--k-table-hand-tile-h) + var(--k-table-discard-tile-w))"
      : "var(--k-table-discard-tile-w)",
  };
}

function PlayerHand({ parsed }: { parsed: ParsedHand }) {
  return (
    <div className="k-mahjong-table__hand">
      {parsed.closedTiles.length > 0 && (
        <div className="k-mahjong-table__hand-group">
          {parsed.closedTiles.map((tile, tileIndex) => {
            const explicitGap = parsed.closedGapsBefore[tileIndex] ?? 0;
            const separateDrawnTile =
              explicitGap === 0 &&
              parsed.lastTileSeparated &&
              tileIndex === parsed.closedTiles.length - 1;
            const gapUnits = explicitGap || (separateDrawnTile ? 1 : 0);
            return (
              <TableTile
                key={`${tile}-${tileIndex}`}
                tile={tile}
                kind="hand"
                style={
                  gapUnits > 0
                    ? { marginInlineStart: `${gapUnits * 0.8}cqi` }
                    : undefined
                }
              />
            );
          })}
        </div>
      )}

      {parsed.melds.map((meld, meldIndex) => (
        <div className="k-mahjong-table__meld" key={meldIndex}>
          {meld.tiles.map((tile, tileIndex) => (
            <TableTile
              key={`${tile}-${tileIndex}`}
              tile={tile}
              kind="hand"
              sideways={meldTileIsSideways(meld, tileIndex)}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function DiscardPond({
  discards,
}: {
  discards: readonly MahjongTableDiscard[];
}) {
  const rows = [
    discards.slice(0, 6),
    discards.slice(6, 12),
    discards.slice(12, 21),
  ];

  return (
    <div className="k-mahjong-table__pond">
      {rows.map((row, rowIndex) => (
        <div
          className={`k-mahjong-table__pond-row k-mahjong-table__pond-row--${rowIndex + 1}`}
          key={rowIndex}
        >
          {row.map((discard, discardIndex) => (
            <TableTile
              key={`${discard.tile}-${rowIndex}-${discardIndex}`}
              tile={discard.tile}
              kind="discard"
              sideways={discard.riichi}
              called={discard.called}
              tsumogiri={discard.tsumogiri}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function formatPoints(points: number): string {
  return String(points);
}

function PlayerSeat({
  position,
  state,
}: {
  position: MahjongTablePosition;
  state: MahjongTableStateV1;
}) {
  const player = state.players[position];
  const wind = deriveMahjongTableWind(state.bottomWind, position);
  const parsedHand = parseHand(player.hand);
  const showHand = handIsVisible(player, parsedHand);

  return (
    <div className={`k-mahjong-table__seat k-mahjong-table__seat--${position}`}>
      {showHand && <PlayerHand parsed={parsedHand} />}
      <div className="k-mahjong-table__player-info">
        <span className="k-mahjong-table__player-info-content">
          <strong>{WIND_KANJI[wind]}</strong>
          {player.points !== null && (
            <span>{formatPoints(player.points)}点</span>
          )}
        </span>
      </div>
    </div>
  );
}

function CounterStick({ type }: { type: "honba" | "riichi" }) {
  return (
    <img
      className={`k-mahjong-table__stick k-mahjong-table__stick--${type}`}
      src={type === "honba" ? honbaStickUrl : riichiStickUrl}
      alt=""
      draggable={false}
      aria-hidden="true"
    />
  );
}

function TableCenter({ state }: { state: MahjongTableStateV1 }) {
  return (
    <div className="k-mahjong-table__center">
      <strong className="k-mahjong-table__round">
        {WIND_KANJI[state.roundWind]} - {state.roundNumber}
      </strong>
      <div className="k-mahjong-table__dora">
        {expandDoraIndicatorSlots(state.doraIndicators).map(
          (tile, tileIndex) => (
            <TableTile key={`${tile}-${tileIndex}`} tile={tile} kind="dora" />
          )
        )}
      </div>
      {(state.honba > 0 || state.riichiSticks > 0) && (
        <div className="k-mahjong-table__counters">
          {state.honba > 0 && (
            <span>
              <CounterStick type="honba" />
              {state.honba}
            </span>
          )}
          {state.riichiSticks > 0 && (
            <span>
              <CounterStick type="riichi" />
              {state.riichiSticks}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function TableCore({ state }: { state: MahjongTableStateV1 }) {
  return (
    <div className="k-mahjong-table__core">
      {MAHJONG_TABLE_POSITIONS.map((position) => (
        <div
          className={`k-mahjong-table__core-seat k-mahjong-table__core-seat--${position}`}
          key={position}
        >
          <DiscardPond discards={state.players[position].discards} />
        </div>
      ))}
      <TableCenter state={state} />
    </div>
  );
}

export function MahjongTableDisplay({
  state,
  className,
  ariaLabel = "Mahjong table",
  onWarningsChange,
}: MahjongTableDisplayProps) {
  const geometryStyle = tableGeometryStyle(state);
  const warnings = useMemo(() => getMahjongTableWarnings(state), [state]);

  useEffect(() => {
    onWarningsChange?.(warnings);
  }, [onWarningsChange, warnings]);

  return (
    <div
      className={["k-mahjong-table", className].filter(Boolean).join(" ")}
      style={geometryStyle}
      role="img"
      aria-label={ariaLabel}
      data-mahjong-table-version={state.version}
    >
      <div className="k-mahjong-table__inner-line" aria-hidden="true" />
      {MAHJONG_TABLE_POSITIONS.map((position) => (
        <PlayerSeat key={position} position={position} state={state} />
      ))}
      <TableCore state={state} />
    </div>
  );
}
