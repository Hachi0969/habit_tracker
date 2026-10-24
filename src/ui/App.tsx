import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { createCloudServices, createLocalServices, type Services } from "../compositionRoot.ts";
import { SupabaseAuthService, type AuthUser } from "../infrastructure/AuthService.ts";
import { getSupabase, isSupabaseConfigured } from "../infrastructure/supabaseClient.ts";
import { AppShell } from "./components/AppShell.tsx";
import { Loading } from "./components/primitives.tsx";
import { CalendarPage } from "./pages/CalendarPage.tsx";
import { InsightsPage } from "./pages/InsightsPage.tsx";
import { LoginPage } from "./pages/LoginPage.tsx";
import { SettingsPage } from "./pages/SettingsPage.tsx";
import { TodayPage } from "./pages/TodayPage.tsx";
import { useRoute } from "./router.ts";
import { ServicesProvider } from "./ServicesContext.tsx";

// Charts (Recharts) are the heaviest dependency, so they load only when Trends is opened.
const TrendsPage = lazy(() =>
  import("./pages/TrendsPage.tsx").then((m) => ({ default: m.TrendsPage })),
);

function Pages({ user, onSignOut }: { user?: AuthUser; onSignOut?: () => void }) {
  const route = useRoute();
  const page = {
    today: <TodayPage params={route.params} />,
    calendar: <CalendarPage />,
    trends: <TrendsPage />,
    insights: <InsightsPage />,
    settings: <SettingsPage onSignOut={onSignOut} {...(user && { email: user.email })} />,
  }[route.page];
  return (
    <AppShell page={route.page}>
      <Suspense fallback={<Loading />}>{page}</Suspense>
    </AppShell>
  );
}

function Workspace({
  services,
  user,
  onSignOut,
}: {
  services: Services;
  user?: AuthUser;
  onSignOut?: () => void;
}) {
  // Created once per mount; CloudApp re-mounts this per user (key), so caches never mix users.
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1 } } }),
  );
  return (
    <QueryClientProvider client={queryClient}>
      <ServicesProvider services={services}>
        <Pages {...(user && { user })} {...(onSignOut && { onSignOut })} />
      </ServicesProvider>
    </QueryClientProvider>
  );
}

function CloudApp() {
  const auth = useMemo(() => new SupabaseAuthService(getSupabase()), []);
  const [user, setUser] = useState<AuthUser | null | undefined>(undefined);

  useEffect(() => {
    auth.currentUser().then(setUser, () => setUser(null));
    return auth.onChange(setUser);
  }, [auth]);

  const userId = user?.id;
  const services = useMemo(() => (userId ? createCloudServices(userId) : null), [userId]);

  if (user === undefined) {
    return (
      <div className="mx-auto max-w-sm px-4 pt-20">
        <Loading label="Checking sign-in…" />
      </div>
    );
  }
  if (!user || !services) return <LoginPage auth={auth} />;
  return (
    <Workspace
      key={user.id}
      services={services}
      user={user}
      onSignOut={() => void auth.signOut()}
    />
  );
}

function LocalApp() {
  const services = useMemo(() => createLocalServices(), []);
  return <Workspace services={services} />;
}

/** Cloud mode when Supabase keys are configured; otherwise local mode (see decision log D1). */
export function App() {
  return isSupabaseConfigured ? <CloudApp /> : <LocalApp />;
}
