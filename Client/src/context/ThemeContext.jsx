import React, { createContext, useContext, useEffect, useMemo } from "react";

const ThemeContext = createContext({
  theme: "dark",
  isDark: true,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }) {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("dark");
  }, []);

  const value = useMemo(() => ({
    theme: "dark",
    isDark: true,
    toggleTheme: () => {},
  }), []);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
