"use client";

import { useEffect, useMemo } from "react";

import {
  isMacPlatform,
  matchesShortcut,
  SHORTCUTS,
  type ShortcutId,
} from "./registry";

export function useIsMac(): boolean {
  return useMemo(() => isMacPlatform(), []);
}

type Handlers = Partial<Record<ShortcutId, (event: KeyboardEvent) => void>>;

/**
 * Registers one global keydown listener that dispatches to the handlers for
 * matching registry entries. Entries without `allowInInput` are skipped while
 * focus is inside form fields or contenteditable regions.
 */
export function useGlobalShortcuts(handlers: Handlers) {
  useEffect(() => {
    const entries = Object.entries(handlers) as [
      ShortcutId,
      (event: KeyboardEvent) => void,
    ][];
    if (entries.length === 0) return;

    function onKeyDown(event: KeyboardEvent) {
      const target = event.target;
      const editable =
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

      for (const [id, handler] of entries) {
        const def = SHORTCUTS.find((shortcut) => shortcut.id === id);
        if (!def || def.displayOnly) continue;
        if (editable && !def.allowInInput) continue;
        if (!matchesShortcut(event, def)) continue;
        event.preventDefault();
        handler(event);
        return;
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handlers]);
}
