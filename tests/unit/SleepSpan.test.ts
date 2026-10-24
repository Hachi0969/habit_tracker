import { describe, expect, it } from "vitest";
import {
  DomainError,
  SleepSpan,
  formatClock,
  formatDuration,
  parseClock,
} from "../../src/domain/index.ts";

describe("SleepSpan", () => {
  it.each([
    ["23:00", "07:00", 480, true],
    ["00:30", "08:00", 450, false],
    ["22:15", "05:45", 450, true],
    ["13:00", "15:30", 150, false],
    ["23:59", "00:00", 1, true],
  ])("%s -> %s is %i min (crosses midnight: %s)", (bed, wake, minutes, crosses) => {
    const span = SleepSpan.create(bed, wake);
    expect(span.durationMinutes).toBe(minutes);
    expect(span.crossesMidnight).toBe(crosses);
    expect(span.durationHours).toBeCloseTo(minutes / 60);
  });

  it("rejects bedtime equal to wake time on the wakeTime field", () => {
    expect(() => SleepSpan.create("22:00", "22:00")).toThrow(
      expect.objectContaining({ name: "DomainError", field: "wakeTime" }),
    );
  });

  it("rejects malformed times and names the field", () => {
    expect(() => SleepSpan.create("25:00", "07:00")).toThrow(DomainError);
    expect(() => SleepSpan.create("25:00", "07:00")).toThrow(/Bedtime/);
    expect(() => SleepSpan.create("23:00", "7am")).toThrow(/Wake time/);
  });

  it("normalises database times with seconds", () => {
    const span = SleepSpan.create("23:00:00", "07:15:00");
    expect(span.bedtime).toBe("23:00");
    expect(span.wakeTime).toBe("07:15");
  });

  it("is immutable", () => {
    expect(Object.isFrozen(SleepSpan.create("23:00", "07:00"))).toBe(true);
  });
});

describe("clock helpers", () => {
  it("parses and formats", () => {
    expect(parseClock("07:05")).toBe(425);
    expect(formatClock(425)).toBe("07:05");
    expect(formatClock(1440 + 30)).toBe("00:30");
    expect(formatClock(-30)).toBe("23:30");
  });

  it("formats durations", () => {
    expect(formatDuration(480)).toBe("8 h");
    expect(formatDuration(450)).toBe("7 h 30 min");
  });
});
