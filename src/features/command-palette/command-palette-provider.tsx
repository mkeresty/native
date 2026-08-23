"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

export type PaletteMode = "all" | "documents";

type CommandPaletteValue = {
  isOpen: boolean;
  mode: PaletteMode;
  open: (mode?: PaletteMode) => void;
  close: () => void;
  setOpen: (open: boolean, mode?: PaletteMode) => void;
};

const CommandPaletteContext = createContext<CommandPaletteValue | null>(null);

export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<PaletteMode>("all");

  const setOpen = useCallback((next: boolean, nextMode?: PaletteMode) => {
    setIsOpen(next);
    if (nextMode) setMode(nextMode);
    else if (!next) setMode("all");
  }, []);

  const open = useCallback((nextMode: PaletteMode = "all") => {
    setIsOpen(true);
    setMode(nextMode);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setMode("all");
  }, []);

  const value = useMemo(
    () => ({ isOpen, mode, open, close, setOpen }),
    [isOpen, mode, open, close, setOpen],
  );

  return (
    <CommandPaletteContext.Provider value={value}>
      {children}
    </CommandPaletteContext.Provider>
  );
}

export function useCommandPalette(): CommandPaletteValue {
  const value = useContext(CommandPaletteContext);
  if (!value) {
    throw new Error(
      "useCommandPalette must be used within CommandPaletteProvider",
    );
  }
  return value;
}
