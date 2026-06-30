export const glossaryTags = [
  "action",
  "shape",
  "wait",
  "yaku",
  "rule",
  "scoring",
  "other",
] as const;

export type GlossaryTag = (typeof glossaryTags)[number];
