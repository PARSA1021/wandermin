"use client";
import { useMemo, useState } from "react";
import { CITIES, getCity, getCountry } from "@/data";
import { TRAVEL_CONFIG } from "@/config/travel";
import { shortestPath, suggestNext, legDistanceKm } from "@/features/travel/graph";
import { useApp } from "@/store/AppProvider";
import { useI18n } from "@/i18n/react";

/** Choose where to fly next: three nearest neighbours, or any city via the shortest route. */
export function DestinationPicker({ onDone }: { onDone?: () => void }) {
  const { state, journey, dispatch } = useApp();
  const { t, name, fmt } = useI18n();
  const [pick, setPick] = useState("");
  const from = journey?.currentLeg && journey.currentLeg.travelledKm > 0 ? journey.currentLeg.toId : journey?.lastCityId ?? state.plan?.departureId ?? "";
  const visited = useMemo(() => new Set([state.plan?.departureId ?? "", ...(journey?.arrivals.map((a) => a.cityId) ?? [])]), [state.plan, journey]);
  const suggestions = from ? suggestNext(from, visited, TRAVEL_CONFIG.guidedSuggestions) : [];
  const path = pick && from ? shortestPath(from, pick) : null;
  const pathKm = path ? path.slice(1).reduce((sum, id, i) => sum + legDistanceKm(path[i]!, id), 0) : 0;
  const go = (cityId: string) => { dispatch({ type: "set-destination", cityId }); onDone?.(); };
  if (!from) return null;

  return (
    <section className="rise rounded-3xl border border-line bg-card p-5 sm:p-6">
      <h2 className="text-xl font-bold">{t("destination.title")}</h2>
      <p className="mt-3 text-xs font-bold uppercase tracking-wider text-ink-soft">{t("destination.suggested")}</p>
      <ul className="mt-2 grid gap-2 sm:grid-cols-3">
        {suggestions.map((s) => {
          const city = getCity(s.cityId);
          return (
            <li key={s.cityId}>
              <button onClick={() => go(s.cityId)} className="w-full rounded-2xl border border-line bg-paper p-4 text-left hover:border-ink">
                <span className="block font-semibold">{name(city.name)}</span>
                <span className="block text-xs text-ink-soft">{name(getCountry(city.countryCode).name)}</span>
                <span className="mt-2 block text-sm tabular">{t("destination.minutes", { km: fmt(Math.round(s.km)), minutes: Math.ceil(s.km / TRAVEL_CONFIG.kmPerMinute) })}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-5 text-xs font-bold uppercase tracking-wider text-ink-soft">{t("destination.anywhere")}</p>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <label className="sr-only" htmlFor="dest">{t("destination.pick")}</label>
        <select id="dest" value={pick} onChange={(e) => setPick(e.target.value)} className="min-h-12 flex-1 rounded-xl border border-line bg-paper px-3">
          <option value="">{t("destination.pick")}</option>
          {[...CITIES].filter((c) => c.id !== from).sort((a, b) => name(a.name).localeCompare(name(b.name))).map((c) => (
            <option key={c.id} value={c.id}>{name(c.name)} · {name(getCountry(c.countryCode).name)}</option>
          ))}
        </select>
        <button disabled={!path} onClick={() => go(pick)} className="min-h-12 rounded-xl bg-ink px-5 font-semibold text-paper disabled:opacity-40">{t("destination.go")}</button>
      </div>
      {path && (
        <p className="mt-2 text-sm text-ink-soft tabular">
          {t("destination.minutes", { km: fmt(Math.round(pathKm)), minutes: Math.ceil(pathKm / TRAVEL_CONFIG.kmPerMinute) })}
          {path.length > 2 && <> · {t("destination.via", { stops: path.slice(1, -1).map((id) => name(getCity(id).name)).join(", ") })}</>}
        </p>
      )}
    </section>
  );
}
