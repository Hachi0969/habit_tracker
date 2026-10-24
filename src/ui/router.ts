import { useCallback, useEffect, useState } from "react";

/** A tiny hash router: #/today?date=2026-10-24. Enough for six pages, no extra dependency. */
export const PAGES = ["today", "calendar", "trends", "insights", "settings"] as const;
export type Page = (typeof PAGES)[number];

export interface Route {
  page: Page;
  params: URLSearchParams;
}

function parse(hash: string): Route {
  const [path = "", query = ""] = hash.replace(/^#\/?/, "").split("?");
  const page = (PAGES as readonly string[]).includes(path) ? (path as Page) : "today";
  return { page, params: new URLSearchParams(query) };
}

export function navigate(page: Page, params?: Record<string, string>): void {
  const query = params ? `?${new URLSearchParams(params).toString()}` : "";
  window.location.hash = `#/${page}${query}`;
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parse(window.location.hash));
  const onChange = useCallback(() => setRoute(parse(window.location.hash)), []);
  useEffect(() => {
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, [onChange]);
  return route;
}
