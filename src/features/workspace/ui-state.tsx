"use client";

import { createContext, useCallback, useContext, useState } from "react";

type FocusModeValue = {
  focused: boolean;
  toggle: () => void;
  setFocused: (value: boolean) => void;
};

const FocusModeContext = createContext<FocusModeValue | null>(null);

export function FocusModeProvider({ children }: { children: React.ReactNode }) {
  const [focused, setFocused] = useState(false);
  const toggle = useCallback(() => setFocused((value) => !value), []);

  return (
    <FocusModeContext.Provider value={{ focused, toggle, setFocused }}>
      {children}
    </FocusModeContext.Provider>
  );
}

export function useFocusMode(): FocusModeValue {
  const value = useContext(FocusModeContext);
  if (!value)
    throw new Error("useFocusMode must be used within FocusModeProvider");
  return value;
}
