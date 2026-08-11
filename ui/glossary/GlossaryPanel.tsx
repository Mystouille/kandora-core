import {
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { Drawer, Tag, Typography } from "antd";
import type { GlossaryTag } from "../../types/glossary";
import { GlossaryTermDetails } from "./GlossaryTermDetails";

const { Text } = Typography;

const portraitQuery = "(max-width: 576px) and (orientation: portrait)";

function subscribeMediaQuery(callback: () => void) {
  const mediaQuery = window.matchMedia(portraitQuery);
  mediaQuery.addEventListener("change", callback);
  return () => mediaQuery.removeEventListener("change", callback);
}

function getIsPortraitMobile() {
  return window.matchMedia(portraitQuery).matches;
}

function useIsPortraitMobile() {
  return useSyncExternalStore(
    subscribeMediaQuery,
    getIsPortraitMobile,
    () => false
  );
}

function subscribeViewportHeight(callback: () => void) {
  window.addEventListener("resize", callback);
  window.addEventListener("orientationchange", callback);
  return () => {
    window.removeEventListener("resize", callback);
    window.removeEventListener("orientationchange", callback);
  };
}

function getViewportHeight() {
  return window.innerHeight;
}

function useViewportHeight() {
  return useSyncExternalStore(
    subscribeViewportHeight,
    getViewportHeight,
    () => 0
  );
}

const tagColors: Record<GlossaryTag, string> = {
  action: "blue",
  shape: "green",
  wait: "orange",
  yaku: "red",
  rule: "purple",
  scoring: "gold",
  other: "default",
};

export interface GlossaryPanelTerm {
  name: string;
  japanese?: string;
  synonyms: readonly string[];
  relatedNames: readonly string[];
  tag: GlossaryTag;
  definition: string;
  definitionEn?: string;
}

export interface GlossaryPanelLabels {
  synonyms: ReactNode;
  relatedNames: ReactNode;
  tags: Record<GlossaryTag, ReactNode>;
}

export interface GlossaryDefinitionRenderArgs {
  html: string;
  skipTerms?: Set<string>;
}

export interface GlossaryPanelProps {
  activeTerm: GlossaryPanelTerm | null;
  locale: string;
  labels: GlossaryPanelLabels;
  onClose: () => void;
  onOpenTerm: (name: string) => void;
  renderDefinition: (args: GlossaryDefinitionRenderArgs) => ReactNode;
  container?: HTMLElement | null;
  zIndex?: number;
}

export function GlossaryPanel({
  activeTerm,
  locale,
  labels,
  onClose,
  onOpenTerm,
  renderDefinition,
  container,
  zIndex = 10002,
}: GlossaryPanelProps) {
  const isPortrait = useIsPortraitMobile();
  const viewportHeight = useViewportHeight();
  const lastTermRef = useRef<GlossaryPanelTerm | null>(activeTerm);
  if (activeTerm) {
    lastTermRef.current = activeTerm;
  }
  const term = activeTerm ?? lastTermRef.current;

  useEffect(() => {
    if (!activeTerm) {
      return;
    }

    function handleClick(event: MouseEvent) {
      const drawer = document.querySelector(
        ".glossary-panel-drawer .ant-drawer-content-wrapper"
      );
      if (drawer && !drawer.contains(event.target as Node)) {
        onClose();
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [activeTerm, onClose]);

  const definition =
    term && locale === "en" && term.definitionEn
      ? term.definitionEn
      : (term?.definition ?? "");

  const skipTerms = useMemo(() => {
    if (!term) {
      return undefined;
    }

    const names = new Set<string>();
    names.add(term.name.toLowerCase());
    for (const synonym of term.synonyms ?? []) {
      names.add(synonym.toLowerCase());
    }
    return names;
  }, [term]);

  return (
    <Drawer
      rootClassName="glossary-panel-drawer"
      title={
        term ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span>{term.name}</span>
            <Tag color={tagColors[term.tag]}>{labels.tags[term.tag]}</Tag>
          </div>
        ) : null
      }
      placement={isPortrait ? "bottom" : "right"}
      onClose={onClose}
      open={activeTerm !== null}
      size={isPortrait ? Math.round(viewportHeight * 0.6) : 400}
      mask={false}
      push={false}
      zIndex={zIndex}
      {...(container ? { getContainer: () => container } : {})}
      styles={{ body: { paddingTop: 8 } }}
    >
      {term?.japanese && (
        <div style={{ marginBottom: 4 }}>
          <Text style={{ fontSize: 15 }}>{term.japanese}</Text>
        </div>
      )}

      {renderDefinition({ html: definition, skipTerms })}

      <GlossaryTermDetails
        synonyms={term?.synonyms}
        relatedNames={term?.relatedNames}
        synonymsLabel={labels.synonyms}
        relatedNamesLabel={labels.relatedNames}
        onOpenTerm={onOpenTerm}
      />
    </Drawer>
  );
}
