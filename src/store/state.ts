/**
 * App state and its pure transitions. Persisted as one JSON document (guest mode, on-device).
 * The storage adapter is separate so account sync can be added later without touching screens.
 */
import { TRAVEL_CONFIG } from "@/config/travel";
import { complete, pause, resume, startSession, type ActiveSession, type ActivityId, type SessionKind } from "@/features/focus/timer";
import { addSession, computeJourney, rerouteTo, type CompletedSession, type TravelPlan } from "@/features/travel/journey";
import type { Locale } from "@/i18n/config";

export const STATE_VERSION = 1;

export interface Settings {
  locale: Locale | null; // null = follow the browser
  reduceMotion: boolean;
  defaultMinutes: number;
  activity: ActivityId;
  wakeLock: boolean;
  /** Opt-in in-flight cabin sound; also puts the flight on the lock screen via Media Session. */
  cabinSound: boolean;
  /** Opt-in lock-screen notification with the landing time. */
  lockNotice: boolean;
  installDismissed: boolean;
  /** "system" follows the device; light/dark override it. */
  theme: "system" | "light" | "dark";
  /** Lock-screen options panel open on the Focus screen. */
  showLockOptions: boolean;
}

export interface CancelledSession { id: string; cancelledAt: number; focusedMs: number }

export type Notice =
  | { kind: "completed-while-away"; minutes: number }
  | { kind: "break-over" };

export interface AppState {
  version: number;
  settings: Settings;
  plan: TravelPlan | null;
  ledger: CompletedSession[];
  cancelled: CancelledSession[];
  active: ActiveSession | null;
  /** Arrivals the user has not yet seen the celebration for (city ids). */
  pendingArrivals: string[];
  /** One-off message: a session finished while the app was closed, or a break ended. */
  notice: Notice | null;
  /** The session cancelled most recently, kept briefly so the user can undo. */
  undo: { session: ActiveSession; cancelledAt: number } | null;
}

export const initialState = (): AppState => ({
  version: STATE_VERSION,
  settings: { locale: null, reduceMotion: false, defaultMinutes: 25, activity: "studying", wakeLock: false, cabinSound: false, lockNotice: false, installDismissed: false, theme: "system", showLockOptions: false },
  plan: null,
  ledger: [],
  cancelled: [],
  active: null,
  pendingArrivals: [],
  notice: null,
  undo: null,
});

/** How long "Undo" stays available after cancelling a session. */
export const UNDO_MS = 8_000;

export type Action =
  | { type: "choose-departure"; departureId: string }
  | { type: "set-destination"; cityId: string }
  | { type: "start"; id: string; minutes: number; activity: ActivityId; kind?: SessionKind; customActivity?: string; now: number }
  | { type: "pause"; now: number }
  | { type: "resume"; now: number }
  | { type: "finish"; now: number }
  | { type: "cancel"; now: number }
  | { type: "undo-cancel"; now: number }
  | { type: "reconcile"; now: number }
  | { type: "ack-arrival"; cityId: string }
  | { type: "dismiss-notice" }
  | { type: "settings"; patch: Partial<Settings> }
  | { type: "reset" };

function finishActive(state: AppState, now: number, auto: boolean): AppState {
  if (!state.active) return state;
  const { record, whileAway } = complete(state.active, now);
  if (!record) {
    // breaks are never recorded, but when one ends on its own we say so
    const breakOver = auto && state.active.kind === "break" ? ({ kind: "break-over" } as const) : state.notice;
    return { ...state, active: null, notice: breakOver };
  }
  const before = state.plan ? computeJourney(state.plan, state.ledger).arrivals.length : 0;
  const ledger = addSession(state.ledger, record);
  const after = state.plan ? computeJourney(state.plan, ledger).arrivals : [];
  const fresh = after.slice(before).map((a) => a.cityId);
  return {
    ...state,
    active: null,
    ledger,
    pendingArrivals: [...state.pendingArrivals, ...fresh],
    notice: auto && whileAway ? { kind: "completed-while-away", minutes: Math.round(record.focusedMs / 60000) } : state.notice,
  };
}

export function reduce(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "choose-departure":
      // changing the starting point is only allowed before the first flight
      if (state.ledger.length > 0) return state;
      return { ...state, plan: { departureId: action.departureId, stops: [] } };
    case "set-destination": {
      if (!state.plan || state.active) return state; // don't re-plan mid-flight
      const journey = computeJourney(state.plan, state.ledger);
      return { ...state, plan: rerouteTo(state.plan, journey, action.cityId) };
    }
    case "start":
      if (state.active) return state;
      return {
        ...state,
        active: startSession({ id: action.id, kind: action.kind, activity: action.activity, customActivity: action.customActivity, minutes: action.minutes, kmPerMinute: TRAVEL_CONFIG.kmPerMinute, now: action.now }),
        notice: null,
        undo: null,
      };
    case "pause":
      return state.active ? { ...state, active: pause(state.active, action.now) } : state;
    case "resume":
      return state.active ? { ...state, active: resume(state.active, action.now) } : state;
    case "finish":
      return finishActive(state, action.now, false);
    case "cancel": {
      if (!state.active) return state;
      const { focusedMs } = complete(state.active, action.now);
      return {
        ...state,
        active: null,
        cancelled: [...state.cancelled, { id: state.active.id, cancelledAt: action.now, focusedMs }].slice(-200),
        undo: { session: state.active, cancelledAt: action.now },
      };
    }
    case "undo-cancel": {
      const u = state.undo;
      if (!u || state.active || action.now - u.cancelledAt > UNDO_MS) return { ...state, undo: null };
      // the seconds spent "cancelled" count as a pause, so no focus time is invented
      const wasRunning = u.session.pausedAt === null;
      const paused = wasRunning ? { ...u.session, pausedAt: u.cancelledAt } : u.session;
      return {
        ...state,
        active: wasRunning ? resume(paused, action.now) : paused,
        cancelled: state.cancelled.filter((c) => c.id !== u.session.id),
        undo: null,
      };
    }
    case "reconcile": {
      const a = state.active;
      if (!a || a.pausedAt !== null) return state;
      return a.startedAt + a.pausedTotalMs + a.plannedMs <= action.now ? finishActive(state, action.now, true) : state;
    }
    case "ack-arrival":
    {
      const i = state.pendingArrivals.indexOf(action.cityId);
      return i < 0 ? state : { ...state, pendingArrivals: [...state.pendingArrivals.slice(0, i), ...state.pendingArrivals.slice(i + 1)] };
    }
    case "dismiss-notice":
      return { ...state, notice: null };
    case "settings":
      return { ...state, settings: { ...state.settings, ...action.patch } };
    case "reset":
      return { ...initialState(), settings: state.settings };
    default:
      return state;
  }
}

/** Validate a stored document; anything unreadable falls back to a fresh state rather than crashing. */
export function parseState(raw: string | null): AppState {
  if (!raw) return initialState();
  try {
    const data = JSON.parse(raw) as Partial<AppState>;
    if (data.version !== STATE_VERSION || !Array.isArray(data.ledger)) return initialState();
    const base = initialState();
    return { ...base, ...data, undo: data.undo ?? null, notice: data.notice ?? null, settings: { ...base.settings, ...data.settings } } as AppState;
  } catch {
    return initialState();
  }
}
