/**
 * Central keyboard shortcut registry (TASK.md §7).
 *
 * Every binding in the app is declared here exactly once. The same data drives
 * the global key handler, the command palette, and the shortcut help screen,
 * so bindings can never drift apart.
 */

export type ShortcutGroup = "General" | "Documents" | "Editor" | "View";

export type ShortcutDef = {
  id: string;
  label: string;
  group: ShortcutGroup;
  keys: {
    mod?: boolean;
    shift?: boolean;
    alt?: boolean;
    /** Lowercase `KeyboardEvent.key` base name. */
    key: string;
  };
  /**
   * Allow firing while focus is inside inputs/text areas (e.g. the editor).
   * Defaults to false so typing never triggers surprises.
   */
  allowInInput?: boolean;
  /** Display-only entries describe editor bindings handled by Tiptap. */
  displayOnly?: boolean;
};

export const SHORTCUTS = [
  {
    id: "palette",
    label: "Open command palette",
    group: "General",
    keys: { mod: true, key: "k" },
    allowInInput: true,
  },
  {
    id: "quickOpen",
    label: "Quick open document",
    group: "General",
    keys: { mod: true, key: "p" },
    allowInInput: true,
  },
  {
    id: "shortcutsHelp",
    label: "Show keyboard shortcuts",
    group: "General",
    keys: { mod: true, key: "/" },
    allowInInput: true,
  },
  {
    id: "toggleSidebar",
    label: "Toggle sidebar",
    group: "View",
    keys: { mod: true, key: "\\" },
    allowInInput: true,
  },
  {
    id: "focusMode",
    label: "Toggle focus mode",
    group: "View",
    keys: { mod: true, key: "." },
    allowInInput: true,
  },
  {
    id: "save",
    label: "Save document",
    group: "Editor",
    keys: { mod: true, key: "s" },
    allowInInput: true,
  },
  {
    id: "newDocument",
    label: "New document",
    group: "Documents",
    keys: { mod: true, alt: true, key: "n" },
  },
  {
    id: "newCollection",
    label: "New collection",
    group: "Documents",
    keys: { mod: true, alt: true, key: "c" },
  },
  {
    id: "signOut",
    label: "Sign out",
    group: "General",
    keys: { mod: true, shift: true, key: "q" },
  },

  // Display-only: handled natively by Tiptap inside the editor.
  {
    id: "editorBold",
    label: "Bold",
    group: "Editor",
    keys: { mod: true, key: "b" },
    displayOnly: true,
  },
  {
    id: "editorItalic",
    label: "Italic",
    group: "Editor",
    keys: { mod: true, key: "i" },
    displayOnly: true,
  },
  {
    id: "editorStrike",
    label: "Strikethrough",
    group: "Editor",
    keys: { mod: true, shift: true, key: "s" },
    displayOnly: true,
  },
  {
    id: "editorCode",
    label: "Inline code",
    group: "Editor",
    keys: { mod: true, key: "e" },
    displayOnly: true,
  },
  {
    id: "editorLink",
    label: "Insert link",
    group: "Editor",
    keys: { mod: true, key: "l" },
    displayOnly: true,
  },
  {
    id: "editorBulletList",
    label: "Bullet list",
    group: "Editor",
    keys: { mod: true, shift: true, key: "8" },
    displayOnly: true,
  },
  {
    id: "editorOrderedList",
    label: "Numbered list",
    group: "Editor",
    keys: { mod: true, shift: true, key: "7" },
    displayOnly: true,
  },
  {
    id: "editorUndo",
    label: "Undo",
    group: "Editor",
    keys: { mod: true, key: "z" },
    displayOnly: true,
  },
  {
    id: "editorRedo",
    label: "Redo",
    group: "Editor",
    keys: { mod: true, shift: true, key: "z" },
    displayOnly: true,
  },
] satisfies readonly ShortcutDef[];

export type ShortcutId = Extract<(typeof SHORTCUTS)[number]["id"], string>;

export function getShortcut(id: ShortcutId): ShortcutDef {
  const def = SHORTCUTS.find((shortcut) => shortcut.id === id);
  if (!def) throw new Error(`Unknown shortcut: ${id}`);
  return def;
}

export function isMacPlatform(): boolean {
  if (typeof navigator === "undefined") return false;
  return /mac|iphone|ipad/i.test(navigator.userAgent);
}

/** Human-readable combo, e.g. "⌘K" (macOS) or "Ctrl+K" elsewhere. */
export function formatShortcut(id: ShortcutId, mac = isMacPlatform()): string {
  const { keys } = getShortcut(id);
  const parts: string[] = [];
  if (keys.mod) parts.push(mac ? "⌘" : "Ctrl");
  if (keys.shift) parts.push(mac ? "⇧" : "Shift");
  if (keys.alt) parts.push(mac ? "⌥" : "Alt");
  const keyLabels: Record<string, string> = {
    "\\": "\\",
    ".": ".",
    "/": "/",
    q: "Q",
    k: "K",
    p: "P",
    s: "S",
    n: "N",
    c: "C",
    b: "B",
    i: "I",
    e: "E",
    l: "L",
    z: "Z",
    7: "7",
    8: "8",
  };
  parts.push(keyLabels[keys.key] ?? keys.key.toUpperCase());
  return parts.join(mac ? "" : "+");
}

/** True when a KeyboardEvent matches a registry entry. */
export function matchesShortcut(
  event: {
    metaKey: boolean;
    ctrlKey: boolean;
    shiftKey: boolean;
    altKey: boolean;
    key: string;
  },
  def: ShortcutDef,
  mac = isMacPlatform(),
): boolean {
  const modHeld = mac ? event.metaKey : event.ctrlKey;
  if (!!def.keys.mod !== modHeld) return false;
  // The other modifier must not be held (avoids ⌘⇧K firing ⌘K).
  if (def.keys.mod && (mac ? event.ctrlKey : event.metaKey)) return false;
  if (!!def.keys.shift !== event.shiftKey) return false;
  if (!!def.keys.alt !== event.altKey) return false;
  return event.key.toLowerCase() === def.keys.key;
}
