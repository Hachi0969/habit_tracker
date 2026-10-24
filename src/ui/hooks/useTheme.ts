import { useCallback, useState } from "react";

export type Theme = "dark" | "light";
const KEY = "ld-theme";

/** Dark by default. The choice is a per-browser convenience, so localStorage is fine here. */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() =>
    document.documentElement.classList.contains("dark") ? "dark" : "light",
  );

  const toggle = useCallback(() => {
    setTheme((current) => {
      const next: Theme = current === "dark" ? "light" : "dark";
      document.documentElement.classList.toggle("dark", next === "dark");
      try {
        localStorage.setItem(KEY, next);
      } catch {
        /* storage blocked: the theme still applies for this visit */
      }
      return next;
    });
  }, []);

  return { theme, toggle };
}
