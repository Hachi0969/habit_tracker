import type { ReactNode } from "react";
import { navigate, type Page } from "../router.ts";
import { useTheme } from "../hooks/useTheme.ts";

const NAV: { page: Page; label: string; icon: string }[] = [
  { page: "today", label: "Today", icon: "M12 5v14M5 12h14" },
  { page: "calendar", label: "Calendar", icon: "M4 7h16M4 7v12h16V7M8 3v4m8-4v4" },
  { page: "trends", label: "Trends", icon: "M4 19V5m0 14h16M8 15l3-4 3 2 5-6" },
  {
    page: "insights",
    label: "Insights",
    icon: "M9 18h6m-5 3h4M12 3a6 6 0 0 0-4 10.5V16h8v-2.5A6 6 0 0 0 12 3Z",
  },
  { page: "settings", label: "Settings", icon: "M4 6h16M4 12h16M4 18h16" },
];

function Icon({ d }: { d: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

export function AppShell({
  page,
  banner,
  children,
}: {
  page: Page;
  banner?: ReactNode;
  children: ReactNode;
}) {
  const { theme, toggle } = useTheme();
  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col md:flex-row md:gap-6 md:px-4">
      {/* Side nav on wide screens, bottom tab bar on phones (thumb-reachable). */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:sticky md:top-0 md:h-dvh md:w-44 md:shrink-0 md:border-t-0 md:border-r md:bg-transparent md:pt-6 md:pb-0"
      >
        <p className="hidden px-3 pb-4 text-sm font-bold tracking-tight md:block">Life Dashboard</p>
        <ul className="grid grid-cols-5 md:flex md:flex-col md:gap-1">
          {NAV.map((item) => {
            const active = item.page === page;
            return (
              <li key={item.page}>
                <button
                  type="button"
                  onClick={() => navigate(item.page)}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-14 w-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium md:min-h-10 md:flex-row md:justify-start md:gap-3 md:rounded-xl md:px-3 md:text-sm ${
                    active ? "text-accent md:bg-surface-2 md:text-ink" : "text-muted hover:text-ink"
                  }`}
                >
                  <Icon d={item.icon} />
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="flex-1 px-4 pt-4 pb-28 md:px-0 md:pt-6 md:pb-10">
        <header className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight capitalize">{page}</h1>
          <button
            type="button"
            onClick={toggle}
            className="flex size-10 items-center justify-center rounded-xl text-muted hover:bg-surface-2 hover:text-ink"
            aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          >
            <span aria-hidden="true">{theme === "dark" ? "☀" : "☾"}</span>
          </button>
        </header>
        {banner}
        <main>{children}</main>
      </div>
    </div>
  );
}
