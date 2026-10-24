import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { buildServices } from "../../src/compositionRoot.ts";
import { InMemoryEntryRepository } from "../../src/infrastructure/InMemoryEntryRepository.ts";
import { LocalSettingsRepository } from "../../src/infrastructure/localMode.ts";
import { MetricChart } from "../../src/ui/charts/MetricChart.tsx";
import { EntryForm } from "../../src/ui/pages/EntryForm.tsx";
import { ServicesProvider } from "../../src/ui/ServicesContext.tsx";
import { input } from "../fixtures.ts";

function setup(children: ReactNode) {
  const repo = new InMemoryEntryRepository();
  const services = buildServices("local", repo, new LocalSettingsRepository(localStorage), null);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <ServicesProvider services={services}>{children}</ServicesProvider>
    </QueryClientProvider>,
  );
  return { repo, user: userEvent.setup() };
}

describe("EntryForm", () => {
  it("rejects a missing mood and saves nothing", async () => {
    const { repo, user } = setup(
      <EntryForm date="2026-10-24" defaults={input({ mood: Number.NaN })} isExisting={false} />,
    );
    await user.click(screen.getByRole("button", { name: "Save day" }));
    expect(await screen.findByText("Pick a mood")).toBeInTheDocument();
    expect(await repo.findAll()).toEqual([]);
  });

  it("shows the live sleep duration and rejects equal times", async () => {
    const { user } = setup(<EntryForm date="2026-10-24" defaults={input()} isExisting={false} />);
    expect(screen.getByText("8 h of sleep")).toBeInTheDocument();
    const wake = screen.getByLabelText("Wake time (this morning)");
    await user.clear(wake);
    await user.type(wake, "23:00");
    expect(await screen.findByText("Bedtime and wake time cannot be the same")).toBeInTheDocument();
  });

  it("saves a valid day through the use case", async () => {
    const { repo, user } = setup(
      <EntryForm date="2026-10-24" defaults={input()} isExisting={false} />,
    );
    await user.click(screen.getByRole("radio", { name: "5 Great" }));
    await user.click(screen.getByRole("button", { name: "Increase by 0.5" }));
    await user.click(screen.getByRole("button", { name: "Save day" }));
    expect(await screen.findByText("Saved ✓")).toBeInTheDocument();
    const saved = await repo.findByDate("2026-10-24");
    expect(saved?.mood.value).toBe(5);
    expect(saved?.studyHours).toBe(2.5);
  });
});

describe("MetricChart", () => {
  it("shows an empty state when nothing is logged", () => {
    render(
      <MetricChart
        title="Sleep duration"
        subtitle="Hours per night"
        data={[{ date: "Mon", label: "Mon", value: null }]}
        kind="bar"
        colorVar="--sleep"
        yLabel="hours"
        formatValue={String}
      />,
    );
    expect(screen.getByText("No entries in this period yet")).toBeInTheDocument();
  });
});
