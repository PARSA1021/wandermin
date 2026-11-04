"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { CITIES, getCity } from "@/data";
import { LAND_PATH } from "@/features/map/land";
import { MAP_H, MAP_W, fitBox, projX, projY, type Box } from "@/features/map/projection";
import { elapsedMs } from "@/features/focus/timer";
import { greatCircleLine, interpolateGreatCircle } from "@/lib/geo";
import { useApp } from "@/store/AppProvider";
import { useI18n } from "@/i18n/react";
import { useNow } from "./hooks";

type Pt = [number, number];
const toXY = ([lng, lat]: Pt): Pt => [projX(lng), projY(lat)];
const pathOf = (pts: Pt[]) => pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join("");

/** Great-circle leg as SVG path(s); a leg crossing the antimeridian is also drawn shifted by one world. */
function legPaths(from: { lat: number; lng: number }, to: { lat: number; lng: number }, t0 = 0, t1 = 1): string[] {
  const n = 48;
  const pts: Pt[] = [];
  const all = greatCircleLine(from, to, n);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    if (t < t0 - 1e-9 || t > t1 + 1e-9) continue;
    pts.push(all[i]!);
  }
  if (t0 > 0 && t0 < 1) { const p = interpolateGreatCircle(from, to, t0); pts.unshift(unwrapNear([p.lng, p.lat], pts[0])); }
  if (t1 < 1 && t1 > 0) { const p = interpolateGreatCircle(from, to, t1); pts.push(unwrapNear([p.lng, p.lat], pts.at(-1))); }
  if (pts.length < 2) return [];
  const xy = pts.map(toXY);
  const out = [pathOf(xy)];
  const minX = Math.min(...xy.map((p) => p[0])), maxX = Math.max(...xy.map((p) => p[0]));
  if (maxX > MAP_W) out.push(pathOf(xy.map(([x, y]) => [x - MAP_W, y])));
  if (minX < 0) out.push(pathOf(xy.map(([x, y]) => [x + MAP_W, y])));
  return out;
}
function unwrapNear(p: Pt, ref?: Pt): Pt {
  if (!ref) return p;
  let lng = p[0];
  while (lng - ref[0] > 180) lng -= 360;
  while (lng - ref[0] < -180) lng += 360;
  return [lng, p[1]];
}

function bearing(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const [ax, ay] = [projX(a.lng), projY(a.lat)];
  let bx = projX(b.lng);
  if (bx - ax > MAP_W / 2) bx -= MAP_W;
  if (ax - bx > MAP_W / 2) bx += MAP_W;
  return (Math.atan2(projY(b.lat) - ay, bx - ax) * 180) / Math.PI;
}

/** Interpolate the viewBox for a short, calm zoom (skipped with reduced motion). */
function useAnimatedBox(target: Box, reduce: boolean): Box {
  const [box, setBox] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    if (reduce || window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setBox(target); from.current = target; return; }
    const start = performance.now(), a = from.current;
    let raf = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / 450), e = 1 - Math.pow(1 - t, 3);
      const b = { x: a.x + (target.x - a.x) * e, y: a.y + (target.y - a.y) * e, w: a.w + (target.w - a.w) * e, h: a.h + (target.h - a.h) * e };
      setBox(b); from.current = b;
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target.x, target.y, target.w, target.h, reduce]); // eslint-disable-line react-hooks/exhaustive-deps
  return box;
}

interface Label { key: string; id: string; x: number; y: number; anchor: "start" | "end"; size: number }

/** Greedy label placement: right-above, right-below, left-above, left-below — first spot that is clear. */
function placeLabels(ids: string[], s: (n: number) => number): Label[] {
  const size = s(6.5), pad = s(4);
  const taken: { x0: number; x1: number; y0: number; y1: number }[] = ids.map((id) => {
    const c = getCity(id), x = projX(c.lng), y = projY(c.lat), r = s(3.5);
    return { x0: x - r, x1: x + r, y0: y - r, y1: y + r };
  });
  const overlaps = (b: (typeof taken)[number]) => taken.some((t) => b.x0 < t.x1 && b.x1 > t.x0 && b.y0 < t.y1 && b.y1 > t.y0);
  const seen = new Set<string>();
  const out: Label[] = [];
  ids.forEach((id, i) => {
    if (seen.has(id)) return; // a city visited twice is labelled once
    seen.add(id);
    const c = getCity(id), x = projX(c.lng), y = projY(c.lat);
    const w = [...c.name.en].length * size * 0.62 + size * 0.5; // a little room for wider scripts
    const options = [
      { anchor: "start" as const, tx: x + pad, ty: y - pad * 0.6 },
      { anchor: "start" as const, tx: x + pad, ty: y + pad + size * 0.6 },
      { anchor: "end" as const, tx: x - pad, ty: y - pad * 0.6 },
      { anchor: "end" as const, tx: x - pad, ty: y + pad + size * 0.6 },
    ];
    const box = (o: (typeof options)[number]) => ({ x0: o.anchor === "start" ? o.tx : o.tx - w, x1: o.anchor === "start" ? o.tx + w : o.tx, y0: o.ty - size, y1: o.ty + size * 0.25 });
    const pick = options.find((o) => !overlaps(box(o))) ?? options[0]!;
    taken.push(box(pick));
    out.push({ key: `${id}-${i}`, id, x: pick.tx, y: pick.ty, anchor: pick.anchor, size });
  });
  return out;
}

export function WorldMap() {
  const { state, journey } = useApp();
  const { t, name } = useI18n();
  const [mode, setMode] = useState<"route" | "world">("route");
  const active = state.active?.kind === "focus" ? state.active : null;
  const now = useNow(5_000, !!active);
  const plan = state.plan;

  const model = useMemo(() => {
    if (!plan || !journey) return null;
    const ids = [plan.departureId, ...plan.stops];
    const leg = journey.currentLeg;
    const liveKm = leg ? Math.min(leg.legKm, leg.travelledKm + (active ? (elapsedMs(active, now) / 60000) * active.kmPerMinute : 0)) : 0;
    const progress = leg ? liveKm / leg.legKm : 0;
    const here = leg && progress > 0 ? interpolateGreatCircle(getCity(leg.fromId), getCity(leg.toId), progress) : getCity(journey.lastCityId);
    const heading = leg ? bearing(here, getCity(leg.toId)) : 0;
    const visited = new Set([plan.departureId, ...journey.arrivals.map((a) => a.cityId)]);
    return { ids, leg, progress, here, heading, visited, done: journey.arrivals.length };
  }, [plan, journey, active, now]);

  const target = useMemo<Box>(() => {
    if (!model || mode === "world") return { x: 0, y: 0, w: MAP_W, h: MAP_H };
    const pts: [number, number][] = model.ids.map((id) => { const c = getCity(id); return [projX(c.lng), projY(c.lat)]; });
    pts.push([projX(model.here.lng), projY(model.here.lat)]);
    // a route that crosses the Pacific reads better as the whole world
    const spread = Math.max(...pts.map((p) => p[0])) - Math.min(...pts.map((p) => p[0]));
    return spread > MAP_W * 0.55 ? { x: 0, y: 0, w: MAP_W, h: MAP_H } : fitBox(pts, 36, 140);
  }, [model, mode]);
  const box = useAnimatedBox(target, state.settings.reduceMotion);
  if (!model || !plan) return null;

  const u = box.w / MAP_W; // 1 at world view; smaller when zoomed in, so marks keep their screen size
  const s = (n: number) => n * Math.max(u, 0.18) * 2.2;
  const routeLegs = model.ids.slice(1).map((to, i) => ({ from: getCity(model.ids[i]!), to: getCity(to), i }));

  return (
    <figure className="overflow-hidden rounded-3xl border border-line bg-card">
      <div className="relative">
        <svg viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`} className="block aspect-[720/284] w-full" role="img" aria-label={t("map.label")}>
          <defs>
            <pattern id="wm-dots" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="4" fill="var(--color-map-land)" /><circle cx="2" cy="2" r="0.55" fill="var(--color-map-land-dot)" /></pattern>
          </defs>
          <rect x={-MAP_W} y={-MAP_H} width={MAP_W * 3} height={MAP_H * 3} fill="var(--color-map-sea)" />
          {[-60, -30, 0, 30, 60].map((lat) => <line key={lat} x1={0} x2={MAP_W} y1={projY(lat)} y2={projY(lat)} stroke="var(--color-map-grid)" strokeWidth={s(0.5)} />)}
          {[-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150].map((lng) => <line key={lng} y1={0} y2={MAP_H} x1={projX(lng)} x2={projX(lng)} stroke="var(--color-map-grid)" strokeWidth={s(0.5)} />)}
          <path d={LAND_PATH} fill="url(#wm-dots)" stroke="var(--color-map-coast)" strokeWidth={s(0.6)} strokeLinejoin="round" />

          {/* every city we can fly to */}
          {CITIES.map((c) => <circle key={c.id} cx={projX(c.lng)} cy={projY(c.lat)} r={s(1.6)} fill="var(--color-map-city)" />)}

          {/* the route: flown legs solid, the rest dashed */}
          {routeLegs.map(({ from, to, i }) => {
            const flownT = i < model.done ? 1 : model.leg && model.leg.index === i ? model.progress : 0;
            return (
              <g key={i}>
                {flownT < 1 && legPaths(from, to, flownT, 1).map((d, k) => <path key={`r${k}`} d={d} fill="none" stroke="var(--color-accent)" strokeOpacity={0.55} strokeWidth={s(1.4)} strokeDasharray={`${s(3)} ${s(3)}`} strokeLinecap="round" />)}
                {flownT > 0 && legPaths(from, to, 0, flownT).map((d, k) => <path key={`f${k}`} d={d} fill="none" stroke="var(--color-accent)" strokeWidth={s(2)} strokeLinecap="round" />)}
              </g>
            );
          })}

          {/* stops, labelled; each label takes the first free side of its dot */}
          {model.ids.map((id, i) => {
            const c = getCity(id), x = projX(c.lng), y = projY(c.lat), seen = model.visited.has(id);
            return <circle key={`${id}-${i}`} cx={x} cy={y} r={s(3)} fill={seen ? "var(--color-accent)" : "var(--color-card)"} stroke="var(--color-accent)" strokeWidth={s(1.3)} />;
          })}
          {placeLabels(model.ids, s).map((l) => (
            <text key={l.key} x={l.x} y={l.y} textAnchor={l.anchor} fontSize={l.size} fontWeight={700} fill="var(--color-ink)" stroke="var(--color-card)" strokeWidth={l.size * 0.3} paintOrder="stroke">{name(getCity(l.id).name)}</text>
          ))}

          {/* the plane */}
          <g transform={`translate(${projX(model.here.lng)} ${projY(model.here.lat)}) rotate(${model.heading}) scale(${s(1)})`} aria-label={t("map.you")}>
            <circle r="7" fill="var(--color-ink)" opacity="0.15" />
            <path d="M6 0 L-2 -1.2 L-4 -5 L-5.5 -5 L-4.2 -1 L-6 -0.8 L-7 -2.5 L-8 -2.5 L-7.2 0 L-8 2.5 L-7 2.5 L-6 0.8 L-4.2 1 L-5.5 5 L-4 5 L-2 1.2 Z" fill="var(--color-ink)" />
          </g>
        </svg>
        <div className="absolute right-3 top-3 flex overflow-hidden rounded-full border border-line bg-card/90 text-xs font-semibold shadow-sm backdrop-blur">
          {(["route", "world"] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)} aria-pressed={mode === m} className={`min-h-9 px-3 ${mode === m ? "bg-ink text-paper" : "text-ink-soft"}`}>{t(m === "route" ? "map.route" : "map.world")}</button>
          ))}
        </div>
      </div>
      <figcaption className="px-4 py-2 text-[11px] text-ink-soft">{t("map.credit")}</figcaption>
    </figure>
  );
}
