"use client";
import type { ActivityId, SessionKind } from "@/features/focus/timer";
import type { Action, Settings } from "@/store/state";
import { cabin } from "./cabin";

export const newId = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

/**
 * Start a session from a tap. Must be called synchronously inside the click handler:
 * iOS only lets audio start inside a user gesture.
 */
export function startSession(dispatch: (a: Action) => void, settings: Settings, opts: { minutes: number; activity: ActivityId; customActivity?: string; kind?: SessionKind; remember?: boolean }) {
  if (settings.cabinSound) cabin.start();
  if (opts.remember) dispatch({ type: "settings", patch: { activity: opts.activity, defaultMinutes: opts.minutes } });
  dispatch({ type: "start", id: newId(), minutes: opts.minutes, activity: opts.activity, customActivity: opts.customActivity, kind: opts.kind, now: Date.now() });
}

/** Light haptic tap where supported (Android); silently ignored elsewhere. */
export function buzz(pattern: number | number[] = 20) {
  try { navigator.vibrate?.(pattern); } catch { /* unsupported */ }
}
