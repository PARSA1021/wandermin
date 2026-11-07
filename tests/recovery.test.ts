import { describe, expect, it } from "vitest";
import { initialState, parseBackup, readState, reduce, type AppState } from "@/store/state";

const T = Date.UTC(2026, 10, 7, 3, 0);
function trip(): AppState {
  let s = reduce(initialState(), { type: "choose-departure", departureId: "seoul" });
  s = reduce(s, { type: "set-destination", cityId: "busan", now: T });
  return s;
}

describe("saved data that can't be used as is", () => {
  it("never loses data silently: unreadable or newer data is reported as lost", () => {
    expect(readState("{nope").lost).toBe(true);
    expect(readState(JSON.stringify({ version: 999, ledger: [] })).lost).toBe(true);
    expect(readState(null).lost).toBe(false);
    expect(readState(JSON.stringify(trip())).lost).toBe(false);
  });
  it("an unknown departure city starts over (keeping settings) instead of crashing", () => {
    const s = { ...trip(), plan: { departureId: "atlantis", stops: ["busan"] } };
    s.settings = { ...s.settings, defaultMinutes: 50 };
    const r = readState(JSON.stringify(s));
    expect(r.lost).toBe(true);
    expect(r.state.plan).toBeNull();
    expect(r.state.settings.defaultMinutes).toBe(50);
  });
  it("a route is cut before the first unknown city", () => {
    const s = { ...trip(), plan: { departureId: "seoul", stops: ["busan", "atlantis", "tokyo"], addedAt: [T, T, T] } };
    const r = readState(JSON.stringify(s));
    expect(r.lost).toBe(true);
    expect(r.state.plan).toEqual({ departureId: "seoul", stops: ["busan"], addedAt: [T] });
  });
  it("malformed records and arrivals are dropped, good ones kept", () => {
    const good = { id: "a", completedAt: T, focusedMs: 60_000, kmPerMinute: 50 };
    const s = { ...trip(), ledger: [good, { id: "b" }], pendingArrivals: ["busan", "atlantis"] } as unknown as AppState;
    const r = readState(JSON.stringify(s));
    expect(r.lost).toBe(true);
    expect(r.state.ledger).toEqual([good]);
    expect(r.state.pendingArrivals).toEqual(["busan"]);
  });
  it("a backup naming a city this version doesn't know is refused", () => {
    expect(parseBackup(JSON.stringify(trip()))).not.toBeNull();
    expect(parseBackup(JSON.stringify({ ...trip(), plan: { departureId: "seoul", stops: ["atlantis"] } }))).toBeNull();
    expect(parseBackup(JSON.stringify({ ...trip(), plan: { departureId: "atlantis", stops: [] } }))).toBeNull();
  });
});
