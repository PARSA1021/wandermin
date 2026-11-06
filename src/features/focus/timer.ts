/**
 * Focus timer as a pure state machine over timestamps. Nothing here counts down a variable:
 * every reading is derived from when the session started, when it was paused and for how long,
 * so it survives refreshes, screen locks, app switches and suspended tabs.
 */
import type { CompletedSession } from "@/features/travel/journey";

export type SessionKind = "focus" | "break";
export type ActivityId = "studying" | "working" | "reading" | "programming" | "writing" | "personal" | "custom";

export interface ActiveSession {
  id: string;
  kind: SessionKind;
  activity: ActivityId;
  customActivity?: string;
  plannedMs: number;
  startedAt: number; // epoch ms (UTC)
  pausedAt: number | null;
  pausedTotalMs: number;
  /** Rate locked in when the session started; recorded with the completed session. */
  kmPerMinute: number;
  /** What the user wants to get done on this flight (optional, their own words). */
  note?: string;
}

export const PRESET_MINUTES = [15, 25, 30, 45, 50, 60, 90] as const;
export const BREAK_MINUTES = [5, 10] as const;
export const CUSTOM_RANGE = { min: 5, max: 180 } as const;
/** Sessions shorter than this are not recorded as travel. */
export const MIN_RECORD_MS = 60_000;

export function startSession(opts: {
  id: string; kind?: SessionKind; activity: ActivityId; customActivity?: string; minutes: number; kmPerMinute: number; now: number;
  /** Upper bound for the planned time — the flight time left to the final stop, so the timer lands with the plane. */
  maxMs?: number;
  note?: string;
}): ActiveSession {
  const minutes = Math.round(opts.minutes);
  if (!Number.isFinite(minutes) || minutes < 1 || minutes > CUSTOM_RANGE.max) throw new Error("Invalid duration");
  const cap = opts.maxMs !== undefined && Number.isFinite(opts.maxMs) && opts.maxMs > 0 ? Math.max(1000, Math.ceil(opts.maxMs / 1000) * 1000) : Infinity;
  return {
    id: opts.id, kind: opts.kind ?? "focus", activity: opts.activity, customActivity: opts.customActivity,
    plannedMs: Math.min(minutes * 60_000, cap), startedAt: opts.now, pausedAt: null, pausedTotalMs: 0, kmPerMinute: opts.kmPerMinute,
    ...(opts.note?.trim() ? { note: opts.note.trim().slice(0, 80) } : {}),
  };
}

/** Focused (running) time so far, clamped to [0, planned]. A clock moved backwards yields 0, never negative. */
export function elapsedMs(s: ActiveSession, now: number): number {
  const until = s.pausedAt ?? now;
  return Math.min(s.plannedMs, Math.max(0, until - s.startedAt - s.pausedTotalMs));
}

export const remainingMs = (s: ActiveSession, now: number) => s.plannedMs - elapsedMs(s, now);
export const isPaused = (s: ActiveSession) => s.pausedAt !== null;
export const isDue = (s: ActiveSession, now: number) => remainingMs(s, now) <= 0;

/** Time spent paused so far (including an ongoing pause). */
export function pausedMs(s: ActiveSession, now: number): number {
  return s.pausedTotalMs + (s.pausedAt !== null ? Math.max(0, now - s.pausedAt) : 0);
}

/** When the session will end if it keeps running. */
export const expectedEndAt = (s: ActiveSession, now: number) => now + remainingMs(s, now);

export function pause(s: ActiveSession, now: number): ActiveSession {
  return s.pausedAt !== null ? s : { ...s, pausedAt: now };
}

export function resume(s: ActiveSession, now: number): ActiveSession {
  if (s.pausedAt === null) return s;
  return { ...s, pausedAt: null, pausedTotalMs: s.pausedTotalMs + Math.max(0, now - s.pausedAt) };
}

/**
 * Turn an active session into a ledger record. Returns null when nothing should be recorded
 * (a break, or less than a minute of focus). `completedAt` is the moment the timer actually
 * reached its planned time if that is in the past — e.g. it finished while the app was closed.
 */
export function complete(s: ActiveSession, now: number): { record: CompletedSession | null; whileAway: boolean; focusedMs: number } {
  const focused = elapsedMs(s, now);
  const naturalEnd = s.pausedAt === null ? s.startedAt + s.pausedTotalMs + s.plannedMs : null;
  const whileAway = naturalEnd !== null && now - naturalEnd > 5_000;
  const completedAt = naturalEnd !== null && focused >= s.plannedMs ? Math.min(now, naturalEnd) : now;
  if (s.kind === "break" || focused < MIN_RECORD_MS) return { record: null, whileAway, focusedMs: focused };
  return { record: { id: s.id, completedAt, focusedMs: focused, kmPerMinute: s.kmPerMinute, activity: s.customActivity || s.activity, startedAt: s.startedAt, ...(s.note ? { note: s.note } : {}), ...(s.pausedTotalMs === 0 && s.pausedAt === null && focused >= s.plannedMs ? { nonstop: true } : {}) }, whileAway, focusedMs: focused };
}

/** Whole minutes for labels ("7 min"), rounded up so a 6:31 flight reads as 7 — the same figure the boarding pass shows. */
export const ceilMinutes = (ms: number) => Math.max(1, Math.ceil(ms / 60000 - 1e-9));

/** "25:00", or "1:05:00" for an hour or more. Rounds up so 0:00 only shows at the very end. */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), sec = total % 60;
  const mm = String(m).padStart(h ? 2 : 1, "0"), ss = String(sec).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
