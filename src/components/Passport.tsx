"use client";
import { useId } from "react";
import { COUNTRIES, getCity, getCountry } from "@/data";
import { useApp } from "@/store/AppProvider";
import { useI18n } from "@/i18n/react";
import { PLANE_BITS } from "./Takeoff";

const INKS = ["#c8322a", "#2f5fa8", "#2f7a52", "#7a4ab0", "#b8642a", "#283152", "#b03a66"];
const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

export interface StampInfo { code: string; label: string; date: string; kind: "departure" | "arrival" }

/**
 * An ink passport stamp drawn in SVG: shape, ink colour and tilt come from the country code, so a
 * country always gets the same stamp; a turbulence filter gives the slightly uneven, inked edge.
 */
export function Stamp({ info, size = 112 }: { info: StampInfo; size?: number }) {
  const h = hash(info.code);
  const ink = INKS[h % INKS.length]!;
  const shape = h % 3;
  const tilt = ((h >> 3) % 17) - 8;
  const fid = `ink-${useId().replace(/:/g, "")}`;
  const plane = PLANE_BITS.flatMap((row, y) => [...row].map((b, x) => (b === "#" ? <rect key={`${x}-${y}`} x={44 + x * 1.6} y={78 + y * 1.6} width="1.6" height="1.6" /> : null)));
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" role="img" aria-label={`${info.label} ${info.kind} ${info.date}`} style={{ transform: `rotate(${tilt}deg)` }}>
      <defs>
        <filter id={fid}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={h % 50} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="2.2" xChannelSelector="R" yChannelSelector="G" result="d" />
          <feComposite in="d" in2="n" operator="arithmetic" k1="0" k2="1" k3="-0.18" k4="0.08" />
        </filter>
      </defs>
      <g filter={`url(#${fid})`} fill="none" stroke={ink} opacity="0.9">
        {shape === 0 && <><circle cx="60" cy="60" r="55" strokeWidth="4" /><circle cx="60" cy="60" r="47" strokeWidth="1.6" /></>}
        {shape === 1 && <><rect x="6" y="14" width="108" height="92" rx="10" strokeWidth="4" /><rect x="13" y="21" width="94" height="78" rx="6" strokeWidth="1.6" /></>}
        {shape === 2 && <><polygon points="60,5 113,32 113,88 60,115 7,88 7,32" strokeWidth="4" strokeLinejoin="round" /><polygon points="60,13 106,36 106,84 60,107 14,84 14,36" strokeWidth="1.6" strokeLinejoin="round" /></>}
        <g fill={ink} stroke="none" fontFamily="ui-monospace, Menlo, monospace" textAnchor="middle">
          <text x="60" y="38" fontSize={info.label.length > 10 ? 8 : 10} fontWeight="700" letterSpacing="1">{info.label}</text>
          <text x="60" y="67" fontSize="30" fontWeight="900" letterSpacing="2">{info.code}</text>
          <text x="60" y="76" fontSize="7" fontWeight="700" letterSpacing="1.5">{info.kind === "departure" ? "DEPARTURE" : "ARRIVAL"}</text>
          <g>{plane}</g>
          <text x="60" y="102" fontSize="9" fontWeight="700">{info.date}</text>
        </g>
      </g>
    </svg>
  );
}

export const fmtDate = (t: number) => { const d = new Date(t); return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`; };

/** Stamps in the order they were earned: the departure country first, then each new country reached. */
export function useStamps(): StampInfo[] {
  const { state, journey } = useApp();
  if (!state.plan || !journey) return [];
  const out: StampInfo[] = [];
  const seen = new Set<string>();
  const home = getCountry(getCity(state.plan.departureId).countryCode);
  const firstFlight = state.ledger.length ? Math.min(...state.ledger.map((s) => s.startedAt ?? s.completedAt)) : null;
  if (firstFlight !== null) { out.push({ code: home.code, label: home.postcardLabel, date: fmtDate(firstFlight), kind: "departure" }); seen.add(home.code); }
  for (const a of journey.arrivals) {
    const c = getCountry(getCity(a.cityId).countryCode);
    if (seen.has(c.code)) continue;
    seen.add(c.code);
    out.push({ code: c.code, label: c.postcardLabel, date: fmtDate(a.arrivedAt), kind: "arrival" });
  }
  return out;
}

/** The passport: a navy cover band and a page that fills up with stamps. */
export function Passport() {
  const { t } = useI18n();
  const stamps = useStamps();
  return (
    <section aria-labelledby="passport-title" className="overflow-hidden rounded-3xl border border-line bg-card">
      <div className="flex items-center justify-between gap-3 bg-[#283152] px-5 py-3 text-[#f2d9a0]">
        <h2 id="passport-title" className="text-sm font-black tracking-[0.3em]">PASSPORT · {t("passport.title")}</h2>
        <span className="text-sm font-bold tabular">{stamps.length}/{COUNTRIES.length}</span>
      </div>
      <div className="passport-page p-4">
        {stamps.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-soft">{t("passport.empty")}</p>
        ) : (
          <ul className="grid grid-cols-3 place-items-center gap-1 sm:grid-cols-4 lg:grid-cols-6">
            {stamps.map((s, i) => <li key={s.code} className="stamp-in" style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }}><Stamp info={s} size={104} /></li>)}
          </ul>
        )}
        <p className="mt-3 text-center text-xs text-ink-soft">{t("passport.left", { n: COUNTRIES.length - stamps.length })}</p>
      </div>
    </section>
  );
}
