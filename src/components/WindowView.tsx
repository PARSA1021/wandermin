"use client";
import { useMemo } from "react";
import type { PostcardJob } from "@/features/art/jobs";
import { ArtImage } from "./ArtImage";

/**
 * The view from a window seat, inside the progress ring: a round plane window with the wing. The sky
 * follows the traveller's local time (dawn, day, dusk, night with stars and the moon); flat pixel clouds
 * drift slowly in three layers (pure CSS, so it costs nothing while the screen is off) and stop when
 * paused, when the blind also comes down. In the last fifth of the leg the destination's skyline fades
 * in below. Reduced motion keeps everything still.
 */
type Phase = "night" | "dawn" | "day" | "dusk";
const phaseOf = (h: number): Phase => (h < 5 || h >= 20 ? "night" : h < 7.5 ? "dawn" : h < 17 ? "day" : "dusk");
const SKY: Record<Phase, string> = {
  night: "linear-gradient(to bottom, #0b1230, #1a2a58 60%, #2a3f6e)",
  dawn: "linear-gradient(to bottom, #3c4e8e, #7a6aa6 40%, #d98d94 70%, #f4b585)",
  day: "linear-gradient(to bottom, #2f6fb8, #5a96d4 45%, #9cc6e8 75%, #cfe4ee)",
  dusk: "linear-gradient(to bottom, #2c3570, #6a4f8a 40%, #c46f88 70%, #f2a070)",
};
const CLOUD: Record<Phase, [string, string]> = { // body, shade
  night: ["#55658f", "#3d4a72"],
  dawn: ["#f8dccb", "#d8a8a8"],
  day: ["#fbfbf6", "#d6e0ea"],
  dusk: ["#f6c9a8", "#c98a90"],
};
const hash = (x: number, y = 0) => { let h = (x * 374761393 + y * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

/** One seamless strip of flat pixel clouds (drawn twice side by side so the drift can loop). */
function CloudStrip({ seed, body, shade, size }: { seed: number; body: string; shade: string; size: number }) {
  const clouds = useMemo(() => Array.from({ length: 5 }, (_, i) => {
    const w = 10 + Math.floor(hash(i, seed) * 14) * size, x = Math.floor(i * 20 + hash(i, seed + 1) * 8);
    return { x, w, y: Math.floor(hash(i, seed + 2) * 6) };
  }), [seed, size]);
  const one = (dx: number) => clouds.map((c, i) => (
    <g key={`${dx}-${i}`}>
      <rect x={dx + c.x} y={c.y + 3} width={c.w} height={3} fill={body} />
      <rect x={dx + c.x + 2} y={c.y + 1} width={Math.max(4, c.w - 6)} height={2} fill={body} />
      <rect x={dx + c.x + 4} y={c.y} width={Math.max(2, c.w - 11)} height={1} fill={body} />
      <rect x={dx + c.x + 1} y={c.y + 6} width={c.w - 2} height={1} fill={shade} />
    </g>
  ));
  return (
    <svg viewBox="0 0 200 12" preserveAspectRatio="none" shapeRendering="crispEdges" className="h-full w-full" aria-hidden="true">
      {one(0)}{one(100)}
    </svg>
  );
}

/**
 * Crop for the approach: the postcard is 240×164 with the scene at (8, 8)–(232, 116). Show only its
 * lower part (scene rows 64–116, the skyline), well below the stamp and postmark, flush with the
 * window's bottom. Sizes are fractions of the window's width (it is square).
 */
const SKYLINE = (() => {
  const imgH = (240 / 224) * (164 / 240); // postcard height when its scene spans the window width
  const at = (y: number) => (y / 164) * imgH;
  const h = at(116) - at(64);
  return { h, top: (h - at(116)) / h };
})();

export function WindowView({ progress, paused, now, destination }: { progress: number; paused: boolean; now: number; destination: PostcardJob | null }) {
  const d = new Date(now);
  const phase = phaseOf(d.getHours() + d.getMinutes() / 60);
  const [body, shade] = CLOUD[phase];
  const approach = destination ? Math.max(0, Math.min(1, (progress - 0.8) / 0.2)) : 0;
  const stars = useMemo(() => Array.from({ length: 22 }, (_, i) => ({ x: hash(i, 1) * 100, y: hash(i, 2) * 55, s: hash(i, 3) < 0.2 ? 2 : 1 })), []);
  return (
    <div className={`window-view absolute inset-[9%] overflow-hidden rounded-full ${paused ? "is-paused" : ""}`} style={{ background: SKY[phase] }} aria-hidden="true">
      {phase === "night" ? (
        <>
          {stars.map((s, i) => <span key={i} className="absolute bg-[#dfe6ff]" style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.s, height: s.s, opacity: 0.85 }} />)}
          <span className="absolute right-[22%] top-[14%] h-[11%] w-[11%] rounded-full bg-[#f4ecd0] shadow-[0_0_12px_#f4ecd055]" />
        </>
      ) : (
        <span className="absolute h-[13%] w-[13%] rounded-full shadow-[0_0_18px_8px_#fff3c455]"
          style={{ background: phase === "day" ? "#fff3c4" : "#ffd8a0", right: phase === "dawn" ? "62%" : "20%", top: phase === "day" ? "14%" : "46%" }} />
      )}
      {/* three cloud layers, slow far ones and faster near ones */}
      {[{ top: "20%", h: "9%", dur: 90, size: 1, o: 0.55, seed: 11 }, { top: "38%", h: "12%", dur: 55, size: 1, o: 0.8, seed: 23 }, { top: "60%", h: "18%", dur: 30, size: 2, o: 1, seed: 37 }].map((l) => (
        <div key={l.seed} className="window-drift absolute left-0 w-[200%]" style={{ top: l.top, height: l.h, opacity: l.o, animationDuration: `${l.dur}s` }}>
          <CloudStrip seed={l.seed} body={body} shade={shade} size={l.size} />
        </div>
      ))}
      {/* the approach: the destination's skyline rises into view for the last fifth of the leg */}
      {destination && approach > 0 && (
        <div className="absolute inset-x-0 bottom-0 overflow-hidden transition-opacity duration-1000" style={{ opacity: approach, height: `${SKYLINE.h * 100}%` }}>
          <div className="absolute" style={{ width: `${(240 / 224) * 100}%`, left: `${-(8 / 224) * 100}%`, top: `${SKYLINE.top * 100}%` }}>
            <ArtImage job={destination} alt="" />
          </div>
        </div>
      )}
      {/* the wing, from the lower left, with its navigation light */}
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" shapeRendering="crispEdges" aria-hidden="true">
        <polygon points="0,100 0,70 62,52 66,53 26,100" fill={phase === "night" ? "#3a4058" : "#b9c0cc"} />
        <polygon points="0,70 62,52 62,55 0,74" fill={phase === "night" ? "#4c5270" : "#e2e6ee"} />
        <rect x="60" y="46" width="3" height="7" fill={phase === "night" ? "#2a2f44" : "#8e96a6"} />
        <rect x="60.5" y="44.5" width="2.5" height="2.5" className="wing-light" fill="#ff4a4a" />
      </svg>
      <div className="window-blind" />
    </div>
  );
}
