import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  DEFAULT_SETTINGS,
  StreakCalculator,
  todayIn,
  type DailyEntry,
  type IsoDate,
  type Settings,
} from "../../domain/index.ts";
import type { ImportPreview } from "../../application/ImportBackupUseCase.ts";
import { useServices } from "../ServicesContext.tsx";

/**
 * Application hooks: the UI's only door into the use cases.
 * TanStack Query caches results and gives every screen loading / error states for free.
 */
const keys = {
  entries: ["entries"] as const,
  settings: ["settings"] as const,
  devices: ["devices"] as const,
};

export function useEntries() {
  const { entries } = useServices();
  return useQuery({ queryKey: keys.entries, queryFn: () => entries.findAll() });
}

export function useEntryMap(entries: readonly DailyEntry[] | undefined) {
  return useMemo(() => new Map((entries ?? []).map((e) => [e.date, e])), [entries]);
}

export function useSettings() {
  const { settings } = useServices();
  const query = useQuery({ queryKey: keys.settings, queryFn: () => settings.get() });
  return { ...query, settings: query.data ?? DEFAULT_SETTINGS };
}

/** Today's date in the browser's zone. */
export function useToday(): IsoDate {
  return todayIn();
}

export function useStreak(entries: readonly DailyEntry[] | undefined, today: IsoDate) {
  return useMemo(() => {
    const calc = new StreakCalculator();
    const dates = (entries ?? []).map((e) => e.date);
    return { current: calc.current(dates, today), longest: calc.longest(dates) };
  }, [entries, today]);
}

export function useLogEntry() {
  const { logEntry } = useServices();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (raw: unknown) => logEntry.execute(raw),
    onSuccess: () => client.invalidateQueries({ queryKey: keys.entries }),
  });
}

export function useDeleteEntry() {
  const { deleteEntry } = useServices();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (date: IsoDate) => deleteEntry.execute(date),
    onSuccess: () => client.invalidateQueries({ queryKey: keys.entries }),
  });
}

export function useSaveSettings() {
  const { saveSettings } = useServices();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: Settings) => saveSettings.execute(input),
    onSuccess: () => client.invalidateQueries({ queryKey: keys.settings }),
  });
}

export function useImport() {
  const { importBackup } = useServices();
  const client = useQueryClient();
  const preview = useMutation({ mutationFn: (text: string) => importBackup.preview(text) });
  const commit = useMutation({
    mutationFn: (p: ImportPreview) => importBackup.commit(p),
    onSuccess: () => client.invalidateQueries({ queryKey: keys.entries }),
  });
  return { preview, commit };
}

export function useDevices() {
  const { devices } = useServices();
  return useQuery({
    queryKey: keys.devices,
    queryFn: () => devices!.list(),
    enabled: devices !== null,
  });
}

export function useRegisterDevice() {
  const { registerDevice } = useServices();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => registerDevice!.execute(name),
    onSuccess: () => client.invalidateQueries({ queryKey: keys.devices }),
  });
}

export function useRevokeDevice() {
  const { revokeDevice } = useServices();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => revokeDevice!.execute(id),
    onSuccess: () => client.invalidateQueries({ queryKey: keys.devices }),
  });
}
