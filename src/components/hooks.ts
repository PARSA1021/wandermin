"use client";
import { useEffect, useState } from "react";

/** Re-render on an interval and return Date.now(). Readings are always derived from timestamps. */
export function useNow(intervalMs = 250, enabled = true, phase?: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!enabled) return;
    // With a phase, ticks land just after each `phase + k·interval` — e.g. exactly when a countdown's
    // shown second changes — so a 1-second tick is enough and nothing re-renders in between.
    let id = 0;
    const tick = () => {
      const n = Date.now();
      setNow(n);
      const wait = phase === undefined ? intervalMs : intervalMs - ((((n - phase) % intervalMs) + intervalMs) % intervalMs) + 4;
      id = window.setTimeout(tick, wait);
    };
    tick();
    return () => window.clearTimeout(id);
  }, [intervalMs, enabled, phase]);
  return now;
}

/** The moment a countdown's displayed second flips: start plus pauses (planned times are whole seconds). */
export const secondPhase = (a: { startedAt: number; pausedTotalMs: number } | null | undefined) => (a ? (a.startedAt + a.pausedTotalMs) % 1000 : undefined);

/** Keep the screen awake while `active`, where the Screen Wake Lock API exists. */
export function useWakeLock(active: boolean): boolean {
  const supported = typeof navigator !== "undefined" && "wakeLock" in navigator;
  useEffect(() => {
    if (!active || !supported) return;
    let sentinel: { release(): Promise<void> } | null = null;
    let cancelled = false;
    const request = async () => {
      try {
        const s = await (navigator as Navigator & { wakeLock: { request(t: "screen"): Promise<{ release(): Promise<void> }> } }).wakeLock.request("screen");
        if (cancelled) s.release(); else sentinel = s;
      } catch { /* denied or not visible: harmless */ }
    };
    request();
    const onVisible = () => { if (document.visibilityState === "visible") request(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { cancelled = true; document.removeEventListener("visibilitychange", onVisible); sentinel?.release().catch(() => {}); };
  }, [active, supported]);
  return supported;
}
