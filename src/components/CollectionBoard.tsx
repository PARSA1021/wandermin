"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CITIES, getCity, getCountry, type Region } from "@/data";
import { TRAVEL_CONFIG } from "@/config/travel";
import { legDistanceKm, shortestPath } from "@/features/travel/graph";
import type { PostcardJob } from "@/features/art/jobs";
import type { Arrival } from "@/features/travel/journey";
import { useApp } from "@/store/AppProvider";
import { useI18n } from "@/i18n/react";
import type { MessageKey } from "@/i18n";
import { ArtImage } from "./ArtImage";
import { BottomSheet } from "./BottomSheet";
import { postcardJob } from "./PostcardViewer";
import { afterLayersClosed } from "./backStack";
import { buzz } from "./session";

/** Faded cards are drawn with a neutral date (hidden under the text strip anyway). */
const GHOST_DATE = Date.UTC(2026, 0, 1);
const REGIONS: Region[] = ["asia", "europe", "americas", "africa", "oceania"];

interface Route { path: string[]; km: number; minutes: number }

/**
 * Every city on one board: collected postcards in colour, the rest as faded ghosts with how much
 * focus it takes to get there — so there is always a next postcard to aim for.
 */
export function CollectionBoard({ onOpen }: { onOpen: (a: Arrival) => void }) {
  const { state, journey, timeZone } = useApp();
  const { t, name } = useI18n();
  const [region, setRegion] = useState<Region | "all">("all");
  const [locked, setLocked] = useState<string | null>(null);

  const from = journey?.currentLeg && journey.currentLeg.travelledKm > 0 ? journey.currentLeg.toId : journey?.lastCityId ?? state.plan?.departureId ?? "";
  const collected = useMemo(() => {
    const m = new Map<string, Arrival>();
    for (const a of journey?.arrivals ?? []) if (!m.has(a.cityId)) m.set(a.cityId, a);
    return m;
  }, [journey]);
  const routes = useMemo(() => {
    const r = new Map<string, Route>();
    for (const c of CITIES) {
      const path = from ? shortestPath(from, c.id) : null;
      if (!path) continue;
      const km = path.slice(1).reduce((sum, id, i) => sum + legDistanceKm(path[i]!, id), 0);
      r.set(c.id, { path, km, minutes: Math.ceil(km / TRAVEL_CONFIG.kmPerMinute) });
    }
    return r;
  }, [from]);

  const inRegion = (id: string) => region === "all" || getCity(id).region === region;
  const got = [...collected.values()].reverse().filter((a) => inRegion(a.cityId));
  const rest = CITIES.filter((c) => !collected.has(c.id) && inRegion(c.id))
    .sort((a, b) => (routes.get(a.id)?.km ?? 1e9) - (routes.get(b.id)?.km ?? 1e9));
  const count = (r: Region | "all") => {
    const all = CITIES.filter((c) => r === "all" || c.region === r);
    return `${all.filter((c) => collected.has(c.id)).length}/${all.length}`;
  };
  const ghostJob = (cityId: string): PostcardJob => {
    const path = routes.get(cityId)?.path;
    return { kind: "postcard", cityId, fromId: path && path.length > 1 ? path.at(-2)! : cityId, arrivedAt: GHOST_DATE, focusMinutesAtArrival: 0, timeZone };
  };

  return (
    <section aria-labelledby="collection-title">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <h2 id="collection-title" className="text-lg font-bold">{t("collection.title")} <span className="font-normal text-ink-soft tabular">{collected.size}/{CITIES.length}</span></h2>
      </div>
      <div className="mb-4 h-2 overflow-hidden rounded-full bg-paper-deep" role="progressbar" aria-valuemin={0} aria-valuemax={CITIES.length} aria-valuenow={collected.size} aria-label={t("collection.title")}>
        <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${Math.max(1.5, (collected.size / CITIES.length) * 100)}%` }} />
      </div>
      <div className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="tablist" aria-label={t("collection.title")}>
        {(["all", ...REGIONS] as const).map((r) => (
          <button key={r} role="tab" aria-selected={region === r} onClick={() => { buzz(6); setRegion(r); }}
            className={`tap min-h-10 shrink-0 whitespace-nowrap rounded-full border px-4 text-sm font-semibold ${region === r ? "border-ink bg-ink text-paper" : "border-line bg-card text-ink-soft"}`}>
            {t(r === "all" ? "collection.all" : (`region.${r}` as MessageKey))} <span className="tabular opacity-70">{count(r)}</span>
          </button>
        ))}
      </div>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {got.map((a) => (
          <li key={a.cityId}>
            <button onClick={() => onOpen(a)} className="tap block w-full text-left" aria-haspopup="dialog" data-collected="">
              <ArtImage className="rounded-md shadow transition-transform hover:-translate-y-0.5" job={postcardJob(a, timeZone)} alt={name(getCity(a.cityId).name)} />
            </button>
          </li>
        ))}
        {rest.map((c) => {
          const r = routes.get(c.id);
          const here = c.id === from;
          return (
            <li key={c.id}>
              <button onClick={() => { buzz(6); setLocked(c.id); }} aria-haspopup="dialog"
                className="tap ghost-card relative block w-full overflow-hidden rounded-md text-left"
                aria-label={`${name(c.name)} · ${t("collection.locked")}`}>
                <ArtImage job={ghostJob(c.id)} alt="" />
                <span className="absolute inset-0 z-[2] flex flex-col items-center justify-center gap-1 p-2 text-center">
                  <span className="grid h-8 w-8 place-items-center rounded-full border-2 border-dashed border-ink-soft/60 text-sm font-black text-ink-soft" aria-hidden="true">?</span>
                  <span className="text-sm font-bold leading-tight text-ink">{name(c.name)}</span>
                  <span className="text-[11px] text-ink-soft tabular">{here ? t("collection.here") : r ? t("collection.away", { minutes: r.minutes }) : ""}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {got.length + rest.length === 0 && <p className="rounded-2xl border border-dashed border-line p-5 text-ink-soft">{t("journal.empty")}</p>}
      <LockedCitySheet cityId={locked} route={locked ? routes.get(locked) ?? null : null} here={locked === from} job={locked ? ghostJob(locked) : null} onClose={() => setLocked(null)} />
    </section>
  );
}

/** What it takes to collect a city's postcard, with a one-tap "fly here". */
function LockedCitySheet({ cityId, route, here, job, onClose }: { cityId: string | null; route: Route | null; here: boolean; job: PostcardJob | null; onClose: () => void }) {
  const { state, journey, dispatch } = useApp();
  const { t, name, fmt } = useI18n();
  const router = useRouter();
  if (!cityId || !job) return <BottomSheet open={false} onClose={onClose} labelledBy="locked-title">{null}</BottomSheet>;
  const city = getCity(cityId);
  const heading = state.plan?.stops.at(-1) === cityId && !!journey?.currentLeg;
  const busy = !!state.active;
  const stops = route ? route.path.slice(1, -1).map((id) => name(getCity(id).name)) : [];
  const go = () => {
    buzz(15);
    if (!heading) dispatch({ type: "set-destination", cityId });
    onClose();
    setTimeout(() => afterLayersClosed(() => router.push("/focus")), 0);
  };
  return (
    <BottomSheet open onClose={onClose} labelledBy="locked-title" wide>
      <div className="px-5 pb-6 pt-2 sm:p-6 wideland:grid wideland:grid-cols-2 wideland:items-center wideland:gap-6">
        <div className="ghost-card overflow-hidden rounded-lg"><ArtImage eager job={job} alt="" /></div>
        <div>
          <p className="mt-4 text-xs font-black tracking-[0.2em] text-ink-soft wideland:mt-0">{t("collection.locked").toUpperCase()}</p>
          <h2 id="locked-title" className="mt-1 text-xl font-bold">{name(city.name)} <span className="text-base font-normal text-ink-soft">· {name(getCountry(city.countryCode).name)}</span></h2>
          <p className="mt-1 text-sm text-ink-soft">{t("arrival.landmark")} · <b className="text-ink">{name(city.landmark.name)}</b></p>
          <div className="mt-4 rounded-2xl border border-line bg-paper p-4 text-sm">
            {here ? <p className="font-semibold">{t("collection.hereBody")}</p> : route && (
              <>
                <p className="font-semibold">{t("collection.routeTime", { minutes: route.minutes, km: fmt(Math.round(route.km)) })}</p>
                {stops.length > 0 && <p className="mt-1 text-ink-soft">{t("destination.via", { stops: stops.join(", ") })}</p>}
              </>
            )}
          </div>
          {!here && (
            <div className="mt-4 flex flex-col gap-2">
              <button onClick={go} disabled={busy && !heading} className="tap min-h-12 rounded-xl bg-accent px-5 font-semibold text-paper disabled:opacity-40">
                {heading ? t("collection.flyingCta") : t("collection.go")}
              </button>
              {busy && !heading && <p className="text-center text-xs text-ink-soft">{t("collection.busy")}</p>}
              {heading && <p className="text-center text-xs text-ink-soft">{t("collection.flying")}</p>}
            </div>
          )}
          <button onClick={onClose} className="tap mt-2 min-h-11 w-full rounded-xl font-semibold text-ink-soft">{t("common.close")}</button>
        </div>
      </div>
    </BottomSheet>
  );
}
