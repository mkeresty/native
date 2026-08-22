/**
 * Sidebar iconography.
 *
 * The workspace navigation deliberately uses sparse geometric marks instead of
 * folder/file icons — the abstraction is part of the visual identity. Each
 * collection is assigned a mark deterministically from its id so the glyph is
 * stable across renames and reorders.
 */
import { CircleDashedIcon, CommandIcon } from "lucide-react";

type GlyphProps = { className?: string };

/** Diagonal-hatched square. */
function HatchedSquareGlyph({ className }: GlyphProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      aria-hidden="true"
      className={className}
    >
      <rect x="3.5" y="3.5" width="17" height="17" rx="2.5" />
      <path d="M4 13.5 13.5 4M8 19.5 19.5 8M14.5 20 20 14.5" strokeWidth={1.1} />
    </svg>
  );
}

/** Outlined diamond. */
function DiamondGlyph({ className }: GlyphProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M12 3.2 20.8 12 12 20.8 3.2 12z" />
    </svg>
  );
}

/** Thin page mark for documents that live at the workspace root. */
export function PageGlyph({ className }: GlyphProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M6 3.5h7.5L18 8v12.5H6z" />
      <path d="M13.5 3.5V8H18" strokeWidth={1.1} />
    </svg>
  );
}

/** Tree connector (└→) used for documents nested inside a collection. */
export function BranchGlyph({ className }: GlyphProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M6 3.5v12h11.5" />
      <path d="M14.5 12.5 17.5 15.5 14.5 18.5" />
    </svg>
  );
}

const COLLECTION_GLYPHS = [
  CommandIcon,
  HatchedSquareGlyph,
  CircleDashedIcon,
  DiamondGlyph,
] as const;

/**
 * Marks are assigned by the collection's position in the sidebar rather than by
 * a hash of its id: adjacent collections must read as visibly different, and a
 * hash collides often across a set this small.
 */
export function CollectionGlyph({
  index,
  className,
}: GlyphProps & { index: number }) {
  const Glyph = COLLECTION_GLYPHS[index % COLLECTION_GLYPHS.length];
  return <Glyph className={className} />;
}
