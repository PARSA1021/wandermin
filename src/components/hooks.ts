"use client";
import { useEffect, useState } from "react";

/** Re-render on an interval and return Date.now(). Readings are always derived from timestamps. */
export function useNow(intervalMs = 250, enabled = true): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!enabled) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs, enabled]);
  return now;
}

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
