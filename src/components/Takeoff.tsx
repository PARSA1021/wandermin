"use client";
import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/react";
import { buzz } from "./session";

/** The boarding-pass airliner as a pixel bitmap (same shape as the app icon), drawn in SVG. */
export const PLANE_BITS = ["...#.....", "...##....", "#..###...", "#########", "#..###...", "...##....", "...#....."];
export function PixelPlane({ size = 54, color = "#283152" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={(size * 7) / 9} viewBox="0 0 9 7" shapeRendering="crispEdges" aria-hidden="true">
      {PLANE_BITS.flatMap((row, y) => [...row].map((b, x) => (b === "#" ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={color} /> : null)))}
    </svg>
  );
}

/**
 * A short takeoff moment when a focus session starts: the plane rolls down the runway and climbs out
 * through the clouds. Shown only for a fresh start (not after a reload); a tap skips it.
 */
export function TakeoffOverlay({ sessionId, startedAt, city, time }: { sessionId: string; startedAt: number; city: string; time: string }) {
  const { t } = useI18n();
  const [show, setShow] = useState(false);
  useEffect(() => {
    const reduce = document.documentElement.dataset.motion === "reduce" || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let seen = false;
    try { seen = sessionStorage.getItem("wm-takeoff") === sessionId; sessionStorage.setItem("wm-takeoff", sessionId); } catch { /* private mode */ }
    if (reduce || seen || Date.now() - startedAt > 4000) return;
    setShow(true);
    buzz([12, 60, 18]);
    const id = setTimeout(() => setShow(false), 2300);
    return () => clearTimeout(id);
  }, [sessionId, startedAt]);
  if (!show) return null;
  return (
    <div className="takeoff fixed inset-0 z-[70] cursor-pointer overflow-hidden" role="status" aria-live="polite" onClick={() => setShow(false)}>
      <div className="takeoff-sky absolute inset-0" />
      {[18, 34, 52, 68].map((top, i) => <span key={top} className="takeoff-cloud absolute h-3 rounded-full bg-white/80" style={{ top: `${top}%`, width: `${70 + i * 30}px`, animationDelay: `${i * 0.12}s` }} />)}
      <div className="takeoff-runway absolute inset-x-0 bottom-[16%] h-2" />
      <div className="takeoff-plane absolute bottom-[17%] left-[-20%]"><PixelPlane size={72} /></div>
      <div className="absolute inset-x-0 top-[22%] text-center">
        <p className="takeoff-title text-4xl font-black tracking-tight text-ink sm:text-5xl">{t("takeoff.title")}</p>
        <p className="takeoff-sub mt-2 text-lg font-semibold text-ink-soft tabular">{t("takeoff.body", { city, time })}</p>
      </div>
    </div>
  );
}
