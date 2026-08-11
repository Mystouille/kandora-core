import type { ReactNode } from "react";
import { Typography } from "antd";
import { GlossaryTermLink } from "./GlossaryTermLink";

const { Text } = Typography;

export interface GlossaryTermDetailsProps {
  synonyms?: readonly string[];
  relatedNames?: readonly string[];
  synonymsLabel: ReactNode;
  relatedNamesLabel: ReactNode;
  onOpenTerm: (name: string) => void;
}

export function GlossaryTermDetails({
  synonyms = [],
  relatedNames = [],
  synonymsLabel,
  relatedNamesLabel,
  onOpenTerm,
}: GlossaryTermDetailsProps) {
  if (synonyms.length === 0 && relatedNames.length === 0) {
    return null;
  }

  return (
    <div style={{ marginTop: 16, display: "grid", gap: 6 }}>
      {synonyms.length > 0 && (
        <div>
          <Text strong>{synonymsLabel}: </Text>
          <Text type="secondary">{synonyms.join(", ")}</Text>
        </div>
      )}
      {relatedNames.length > 0 && (
        <div>
          <Text strong>{relatedNamesLabel}: </Text>
          <Text type="secondary">
            {relatedNames.map((name, index) => (
              <span key={name}>
                {index > 0 && ", "}
                <GlossaryTermLink
                  text={name}
                  onClick={() => onOpenTerm(name)}
                />
              </span>
            ))}
          </Text>
        </div>
      )}
    </div>
  );
}
