import { describe, expect, it } from "vitest";
import { initialState, parseState, reduce, type AppState } from "@/store/state";
import { legPasses, livePass } from "@/features/tickets/passes";
import { legDistanceKm } from "@/features/travel/graph";

const T = Date.UTC(2026, 10, 4, 13, 0);
const min = 60_000;

function trip(): AppState {
  let s = reduce(initialState(), { type: "choose-departure", departureId: "seoul" });
  s = reduce(s, { type: "set-destination", cityId: "tokyo" });
  return s;
}

describe("app state", () => {
  it("plans a first flight and records an arrival after a 25-minute session", () => {
    let s = trip();
    expect(s.plan).toEqual({ departureId: "seoul", stops: ["tokyo"] });
    s = reduce(s, { type: "start", id: "s1", minutes: 25, activity: "studying", now: T });
    expect(s.active?.id).toBe("s1");
    s = reduce(s, { type: "reconcile", now: T + 10 * min });
    expect(s.active).not.toBeNull(); // not due yet
    s = reduce(s, { type: "reconcile", now: T + 25 * min + 1000 });
    expect(s.active).toBeNull();
    expect(s.ledger).toHaveLength(1);
    expect(s.pendingArrivals).toEqual(["tokyo"]);
    expect(s.notice).toBeNull(); // the user was there when it ended
    s = reduce(s, { type: "ack-arrival", cityId: "tokyo" });
    expect(s.pendingArrivals).toEqual([]);
  });

  it("says so honestly when a session finished while the app was closed", () => {
    let s = reduce(trip(), { type: "start", id: "s1", minutes: 25, activity: "studying", now: T });
    s = reduce(s, { type: "reconcile", now: T + 2 * 60 * min });
    expect(s.notice).toEqual({ kind: "completed-while-away", minutes: 25 });
    expect(s.ledger[0]!.completedAt).toBe(T + 25 * min);
  });

  it("does not record a cancelled session as travel", () => {
    let s = reduce(trip(), { type: "start", id: "s1", minutes: 25, activity: "reading", now: T });
    s = reduce(s, { type: "cancel", now: T + 10 * min });
    expect(s.ledger).toHaveLength(0);
    expect(s.cancelled[0]).toMatchObject({ id: "s1", focusedMs: 10 * min });
  });

  it("cannot double-record when two tabs finish the same session", () => {
    let s = reduce(trip(), { type: "start", id: "s1", minutes: 25, activity: "studying", now: T });
    const a = reduce(s, { type: "finish", now: T + 25 * min });
    const replay = { ...a, active: s.active }; // the other tab still holds the active session
    s = reduce(replay, { type: "finish", now: T + 25 * min });
    expect(s.ledger).toHaveLength(1);
  });

  it("locks the departure once travelling and ignores re-planning mid-session", () => {
    let s = reduce(trip(), { type: "start", id: "s1", minutes: 25, activity: "studying", now: T });
    expect(reduce(s, { type: "set-destination", cityId: "osaka" }).plan).toEqual(s.plan);
    s = reduce(s, { type: "finish", now: T + 25 * min });
    expect(reduce(s, { type: "choose-departure", departureId: "paris" }).plan?.departureId).toBe("seoul");
  });

  it("falls back to a fresh state on corrupt or foreign storage", () => {
    expect(parseState("{nope")).toEqual(initialState());
    expect(parseState(JSON.stringify({ version: 99 }))).toEqual(initialState());
    const s = reduce(trip(), { type: "settings", patch: { locale: "ja" } });
    expect(parseState(JSON.stringify(s))).toEqual(s);
  });
});

describe("boarding passes from the ledger", () => {
  const plan = { departureId: "seoul", stops: ["tokyo", "osaka"] };
  const km1 = legDistanceKm("seoul", "tokyo");

  it("issues one pass per leg and marks arrival inside the session that crossed the line", () => {
    const ledger = [{ id: "a", completedAt: T + 25 * min, focusedMs: 25 * min, kmPerMinute: 50 }];
    const [p1, p2] = legPasses(plan, ledger, "Asia/Seoul");
    expect(p1).toMatchObject({ fromId: "seoul", toId: "tokyo", boardedAt: T, sessions: 1 });
    expect(p1!.arrivedAt).toBeCloseTo(T + (km1 / 50) * min, -2);
    expect(p2).toMatchObject({ fromId: "tokyo", toId: "osaka", sessions: 1 });
    expect(p2!.arrivedAt).toBeUndefined();
    expect(p2!.boardedAt).toBeCloseTo(p1!.arrivedAt!, -2);
  });

  it("boards at the real start time of the first session, pauses included", () => {
    const ledger = [{ id: "p", completedAt: T + 30 * min, focusedMs: 25 * min, kmPerMinute: 50, startedAt: T }];
    expect(legPasses(plan, ledger, "Asia/Seoul")[0]!.boardedAt).toBe(T);
  });

  it("spreads a long leg over several sessions", () => {
    const longPlan = { departureId: "london", stops: ["new-york"] };
    const ledger = [0, 1, 2].map((i) => ({ id: `s${i}`, completedAt: T + (i + 1) * 3600_000, focusedMs: 25 * min, kmPerMinute: 50 }));
    const [p] = legPasses(longPlan, ledger, "Europe/London");
    expect(p).toMatchObject({ sessions: 3, minutesFlown: 75 });
    expect(p!.arrivedAt).toBeUndefined();
  });

  it("shows a live pass for the running session, boarding a new leg if needed", () => {
    const live = livePass(plan, [], "Asia/Seoul", { startedAt: T, elapsedMinutes: 10, kmPerMinute: 50 });
    expect(live).toMatchObject({ fromId: "seoul", toId: "tokyo", minutesFlown: 10, sessions: 0, boardedAt: T });
    expect(livePass({ departureId: "seoul", stops: [] }, [], "Asia/Seoul", { startedAt: T, elapsedMinutes: 1, kmPerMinute: 50 })).toBeNull();
  });
});

describe("undo and break notices", () => {
  it("restores a cancelled session, counting the gap as a pause", () => {
    let s = reduce(trip(), { type: "start", id: "s1", minutes: 25, activity: "studying", now: T });
    s = reduce(s, { type: "cancel", now: T + 10 * min });
    expect(s.active).toBeNull();
    s = reduce(s, { type: "undo-cancel", now: T + 10 * min + 5000 });
    expect(s.active?.id).toBe("s1");
    expect(s.active?.pausedAt).toBeNull();
    expect(s.active?.pausedTotalMs).toBe(5000);
    expect(s.cancelled).toHaveLength(0);
    expect(s.undo).toBeNull();
  });

  it("keeps a paused session paused when undone", () => {
    let s = reduce(trip(), { type: "start", id: "s1", minutes: 25, activity: "studying", now: T });
    s = reduce(s, { type: "pause", now: T + 3 * min });
    s = reduce(s, { type: "cancel", now: T + 4 * min });
    s = reduce(s, { type: "undo-cancel", now: T + 4 * min + 1000 });
    expect(s.active?.pausedAt).toBe(T + 3 * min);
  });

  it("expires undo after the window, and a new session clears it", () => {
    let s = reduce(trip(), { type: "start", id: "s1", minutes: 25, activity: "studying", now: T });
    s = reduce(s, { type: "cancel", now: T + min });
    expect(reduce(s, { type: "undo-cancel", now: T + min + 60_000 }).active).toBeNull();
    s = reduce(s, { type: "start", id: "s2", minutes: 25, activity: "studying", now: T + 2 * min });
    expect(s.undo).toBeNull();
  });

  it("announces the end of a break that ran out on its own, but not one ended by hand", () => {
    let s = reduce(trip(), { type: "start", id: "b1", kind: "break", minutes: 5, activity: "studying", now: T });
    expect(reduce(s, { type: "reconcile", now: T + 6 * min }).notice).toEqual({ kind: "break-over" });
    expect(reduce(s, { type: "finish", now: T + 2 * min }).notice).toBeNull();
    s = reduce(s, { type: "reconcile", now: T + 6 * min });
    expect(s.ledger).toHaveLength(0);
  });

  it("reads older saved state without the new fields", () => {
    const old = JSON.stringify({ ...trip(), settings: { locale: "ko", reduceMotion: false, defaultMinutes: 25, activity: "studying", wakeLock: false }, undo: undefined });
    const s = parseState(old);
    expect(s.settings.theme).toBe("system");
    expect(s.undo).toBeNull();
  });
});
