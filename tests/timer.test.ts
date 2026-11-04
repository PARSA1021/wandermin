import { describe, expect, it } from "vitest";
import { complete, elapsedMs, expectedEndAt, formatClock, isDue, pause, pausedMs, remainingMs, resume, startSession } from "@/features/focus/timer";

const T = Date.UTC(2026, 10, 4, 13, 0);
const min = 60_000;
const s0 = () => startSession({ id: "a", activity: "studying", minutes: 25, kmPerMinute: 50, now: T });

describe("timer", () => {
  it("derives remaining time from timestamps", () => {
    const s = s0();
    expect(remainingMs(s, T)).toBe(25 * min);
    expect(remainingMs(s, T + 10 * min)).toBe(15 * min);
    expect(expectedEndAt(s, T + 10 * min)).toBe(T + 25 * min);
  });

  it("separates running time from paused time", () => {
    let s = pause(s0(), T + 5 * min);
    expect(elapsedMs(s, T + 30 * min)).toBe(5 * min); // frozen while paused
    expect(pausedMs(s, T + 8 * min)).toBe(3 * min);
    s = resume(s, T + 8 * min);
    expect(elapsedMs(s, T + 10 * min)).toBe(7 * min);
    expect(s.pausedTotalMs).toBe(3 * min);
    expect(pause(pause(s, T + 11 * min), T + 12 * min).pausedAt).toBe(T + 11 * min); // double pause is a no-op
  });

  it("survives a reload: the same stored object gives the same reading", () => {
    const stored = JSON.parse(JSON.stringify(pause(s0(), T + 4 * min)));
    expect(remainingMs(stored, T + 99 * min)).toBe(21 * min);
  });

  it("never goes negative or past the planned time, even if the clock moves", () => {
    const s = s0();
    expect(elapsedMs(s, T - 10 * min)).toBe(0); // clock set backwards
    expect(elapsedMs(s, T + 99 * min)).toBe(25 * min);
    expect(isDue(s, T + 25 * min)).toBe(true);
  });

  it("records a finished session at its natural end when it completed while the app was closed", () => {
    const r = complete(s0(), T + 3 * 60 * min);
    expect(r.whileAway).toBe(true);
    expect(r.record).toEqual({ id: "a", completedAt: T + 25 * min, focusedMs: 25 * min, kmPerMinute: 50, activity: "studying", startedAt: T });
  });

  it("records an early finish with only the focused minutes, and skips sub-minute sessions and breaks", () => {
    expect(complete(s0(), T + 10 * min).record?.focusedMs).toBe(10 * min);
    expect(complete(s0(), T + 30_000).record).toBeNull();
    expect(complete(startSession({ id: "b", kind: "break", activity: "studying", minutes: 5, kmPerMinute: 50, now: T }), T + 5 * min).record).toBeNull();
  });

  it("rejects invalid durations", () => {
    expect(() => startSession({ id: "x", activity: "studying", minutes: 0, kmPerMinute: 50, now: T })).toThrow();
    expect(() => startSession({ id: "x", activity: "studying", minutes: 181, kmPerMinute: 50, now: T })).toThrow();
  });

  it("formats the clock", () => {
    expect(formatClock(25 * min)).toBe("25:00");
    expect(formatClock(59_001)).toBe("1:00");
    expect(formatClock(0)).toBe("0:00");
    expect(formatClock(90 * min)).toBe("1:30:00");
  });
});
