"use client";
import { useState } from "react";
import { getCity, getCountry } from "@/data";
import { legDistanceKm } from "@/features/travel/graph";
import { useApp } from "@/store/AppProvider";
import { useI18n } from "@/i18n/react";
import { DestinationPicker } from "@/components/Pickers";
import { Onboarding } from "@/components/Onboarding";
import { WorldMap } from "@/components/WorldMap";

export default function RoutePage() {
  const { state, journey } = useApp();
  const { t, name, fmt, date } = useI18n();
  const [changing, setChanging] = useState(false);
  if (!state.plan || !journey) return <Onboarding />;
  const cities = [state.plan.departureId, ...state.plan.stops];
  const arrivedAt = (i: number) => journey.arrivals.find((a) => a.legIndex === i - 1)?.arrivedAt;

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-bold sm:text-3xl">{t("journey.title")}</h1>
      <WorldMap />
      <ol className="relative flex flex-col gap-0 rounded-3xl border border-line bg-card p-5 sm:p-6">
        {cities.map((id, i) => {
          const city = getCity(id);
          const isDeparture = i === 0;
          const done = isDeparture || arrivedAt(i) !== undefined;
          const flying = journey.currentLeg?.index === i - 1 && journey.currentLeg.travelledKm > 0;
          const status = isDeparture ? t("journey.departed") : done ? t("journey.arrived") : flying ? t("journey.flying") : t("journey.planned");
          return (
            <li key={`${id}-${i}`} className="relative flex gap-4 pb-5 last:pb-0">
              {i < cities.length - 1 && <span className={`absolute left-[11px] top-6 h-full w-0.5 ${done ? "bg-accent" : "bg-line"}`} aria-hidden="true" />}
              <span className={`relative z-10 mt-1 h-6 w-6 shrink-0 rounded-full border-4 ${done ? "border-accent bg-accent" : flying ? "border-accent bg-card" : "border-line bg-card"}`} aria-hidden="true" />
              <div className="flex-1">
                <p className="font-semibold">{name(city.name)} <span className="font-normal text-ink-soft">· {name(getCountry(city.countryCode).name)}</span></p>
                <p className="text-sm text-ink-soft tabular">
                  {status}
                  {!isDeparture && <> · {fmt(Math.round(legDistanceKm(cities[i - 1]!, id)))} km</>}
                  {arrivedAt(i) !== undefined && <> · {date(arrivedAt(i)!)}</>}
                  {flying && <> · {Math.floor(journey.currentLeg!.progress * 100)}%</>}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
      {!state.active && journey.currentLeg && !changing && (
        <button onClick={() => setChanging(true)} className="min-h-12 self-start rounded-xl border border-ink px-5 font-semibold">{t("journey.change")}</button>
      )}
      {(!journey.currentLeg || changing) && !state.active && <DestinationPicker onDone={() => setChanging(false)} />}
    </div>
  );
}
