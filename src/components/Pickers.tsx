"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getCity, getCountry } from "@/data";
import { TRAVEL_CONFIG } from "@/config/travel";
import { shortestPath, legDistanceKm } from "@/features/travel/graph";
import { searchCities } from "@/features/travel/search";
import { fitSessionMinutes, nextOptions, type NextOption } from "@/features/travel/next";
import { useApp } from "@/store/AppProvider";
import { useI18n } from "@/i18n/react";
import { buzz, startSession } from "./session";
import { ArtImage } from "./ArtImage";
import type { PostcardJob } from "@/features/art/jobs";

/**
 * Where the traveller can go from here, and a one-tap "fly there": sets the destination and takes off
 * with the usual settings, the session fitted to the flight (a flight a little longer than usual is
 * flown in one go).
 */
export function useNextTrip() {
  const { state, journey, dispatch } = useApp();
  const router = useRouter();
  const from = journey?.currentLeg && journey.currentLeg.travelledKm > 0 ? journey.currentLeg.toId : journey?.lastCityId ?? state.plan?.departureId ?? "";
  const { options, stamped } = useMemo(() => {
    const stamped = new Set<string>();
    if (!from || !state.plan) return { options: { nearby: [], countries: [] }, stamped };
    const visited = new Set([state.plan.departureId, ...(journey?.arrivals.map((a) => a.cityId) ?? [])]);
    for (const code of [getCity(state.plan.departureId).countryCode, ...(journey?.arrivals.map((a) => getCity(a.cityId).countryCode) ?? [])]) stamped.add(code);
    return { options: nextOptions(from, visited, stamped, TRAVEL_CONFIG.guidedSuggestions, 2), stamped };
  }, [from, state.plan, journey]);
  const routeTo = (to: string) => {
    const path = from ? shortestPath(from, to) : null;
    if (!path) return null;
    return { km: path.slice(1).reduce((sum, id, i) => sum + legDistanceKm(path[i]!, id), 0), via: path.slice(1, -1) };
  };
  /** Must run synchronously inside the tap, so the cabin sound may start on iOS. */
  const launchTo = (cityId: string, km: number, takeOff: boolean, navigate: (go: () => void) => void = (go) => go()) => {
    dispatch({ type: "set-destination", cityId, now: Date.now() });
    if (!takeOff || state.active) return;
    buzz(20);
    const minutes = fitSessionMinutes(state.settings.defaultMinutes, (km / TRAVEL_CONFIG.kmPerMinute) * 60_000);
    startSession(dispatch, state.settings, { minutes, activity: state.settings.activity, note: state.draftNote || undefined });
    navigate(() => router.push("/focus"));
  };
  return { from, options, stamped, routeTo, launchTo };
}

/**
 * One destination as a tappable row: a small preview of the city's postcard (faded until collected),
 * the city and country, time and distance, and a "new stamp" tag.
 */
export function CityOption({ option, onPick, launch, compact = false }: { option: NextOption; onPick: () => void; launch: boolean; compact?: boolean }) {
  const { t, name, fmt } = useI18n();
  const { timeZone } = useApp();
  const city = getCity(option.cityId);
  const preview: PostcardJob = { kind: "postcard", cityId: city.id, fromId: option.via.at(-1) ?? city.id, arrivedAt: Date.UTC(2026, 0, 1), focusMinutesAtArrival: 0, timeZone, ghost: true };
  return (
    <button onClick={onPick} className={`tap group flex w-full items-center gap-3 rounded-2xl border border-line bg-paper text-left transition-colors hover:border-ink ${compact ? "p-2.5" : "p-3"}`}>
      <span className="ghost-card w-20 shrink-0 overflow-hidden rounded-md sm:w-24" aria-hidden="true"><ArtImage job={preview} alt="" /></span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate font-semibold">{name(city.name)}</span>
          {option.newCountry && <span className="shrink-0 rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 text-[11px] font-bold text-accent" data-new-country="">{t("destination.newStamp")}</span>}
        </span>
        <span className="block truncate text-xs text-ink-soft">{name(getCountry(city.countryCode).name)}{option.via.length > 0 && <> · {t("destination.via", { stops: option.via.map((id) => name(getCity(id).name)).join(", ") })}</>}</span>
        <span className="mt-1 block text-sm tabular">{t("destination.minutes", { km: fmt(Math.round(option.km)), minutes: Math.ceil(option.km / TRAVEL_CONFIG.kmPerMinute) })}</span>
      </span>
      {launch && <span className="shrink-0 self-center text-sm font-bold text-accent" aria-hidden="true">{t("home.oneTapShort")}</span>}
      {launch && <span className="sr-only">{t("home.oneTap")}</span>}
    </button>
  );
}

/**
 * Choose where to fly next: the nearest unvisited cities, the nearest new countries, or any city by
 * search. By default a pick takes off straight away; `startOnPick={false}` only changes the route.
 */
export function DestinationPicker({ onDone, startOnPick = true }: { onDone?: () => void; startOnPick?: boolean }) {
  const { state } = useApp();
  const { t } = useI18n();
  const { from, options, stamped, routeTo, launchTo } = useNextTrip();
  const launch = startOnPick && !state.active;
  const [query, setQuery] = useState("");
  const results = useMemo(() => from ? searchCities(query, { exclude: from }) : [], [query, from]);
  const go = (cityId: string, km: number) => { launchTo(cityId, km, launch); onDone?.(); };
  if (!from) return null;

  return (
    <section className="rise rounded-3xl border border-line bg-card p-5 sm:p-6">
      <h2 className="text-xl font-bold">{t("destination.title")}</h2>
      <p className="mt-3 text-xs font-bold uppercase tracking-wider text-ink-soft">{t("destination.suggested")}</p>
      <ul className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {options.nearby.map((o) => <li key={o.cityId}><CityOption option={o} launch={launch} onPick={() => go(o.cityId, o.km)} /></li>)}
      </ul>
      {options.countries.length > 0 && (
        <>
          <p className="mt-5 text-xs font-bold uppercase tracking-wider text-ink-soft">{t("destination.newCountries")}</p>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2" aria-label={t("destination.newCountries")}>
            {options.countries.map((o) => <li key={o.cityId}><CityOption option={o} launch={launch} onPick={() => go(o.cityId, o.km)} /></li>)}
          </ul>
        </>
      )}
      <label htmlFor="dest-search" className="mt-5 block text-xs font-bold uppercase tracking-wider text-ink-soft">{t("destination.anywhere")}</label>
      <input id="dest-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("destination.searchPlaceholder")}
        autoComplete="off" enterKeyHint="search" aria-controls="dest-results"
        className="mt-2 min-h-12 w-full rounded-xl border border-line bg-paper px-4" />
      {query.trim() && (
        <ul id="dest-results" className="mt-2 grid gap-2 sm:grid-cols-2" aria-label={t("destination.results")}>
          {results.length === 0 && <li className="rounded-xl border border-dashed border-line p-4 text-sm text-ink-soft">{t("destination.noResults")}</li>}
          {results.map((c) => {
            const route = routeTo(c.id);
            if (!route) return null;
            return (
              <li key={c.id}>
                <CityOption compact launch={launch} onPick={() => go(c.id, route.km)}
                  option={{ cityId: c.id, km: route.km, via: route.via, newCountry: !stamped.has(c.countryCode) }} />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/** Right after landing: the next flights, one tap each — a nearby city and the nearest new country. */
export function NextFlights({ onPick, navigate }: { onPick: () => void; navigate: (go: () => void) => void }) {
  const { t } = useI18n();
  const { options, launchTo } = useNextTrip();
  // the nearest new country first (a neighbour or further away), then the nearest other city
  const all = [...options.nearby, ...options.countries];
  const newCountry = all.filter((o) => o.newCountry).sort((a, b) => a.km - b.km)[0];
  const other = options.nearby.find((o) => o.cityId !== newCountry?.cityId);
  const picks = [newCountry, other].filter((o): o is NextOption => !!o);
  if (!picks.length) return null;
  return (
    <section aria-labelledby="next-flights-title" className="mt-4">
      <h3 id="next-flights-title" className="text-sm font-bold">{t("arrival.nextFlights")}</h3>
      <ul className="mt-2 grid gap-2 sm:grid-cols-2">
        {picks.map((o) => <li key={o.cityId}><CityOption compact option={o} launch onPick={() => { onPick(); launchTo(o.cityId, o.km, true, navigate); }} /></li>)}
      </ul>
    </section>
  );
}
