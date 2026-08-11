export interface GlossaryTermLinkProps {
  text: string;
  onClick: () => void;
}

export function GlossaryTermLink({ text, onClick }: GlossaryTermLinkProps) {
  return (
    <span
      role="button"
      tabIndex={0}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
      className="glossary-term-link"
      style={{
        cursor: "help",
        color: "inherit",
        textDecoration: "underline dotted",
        textUnderlineOffset: 2,
        textDecorationThickness: 1,
      }}
    >
      {text}
    </span>
  );
}
