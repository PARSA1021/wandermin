"use client";
import { CITIES, getCity } from "@/data";
import { legPasses } from "@/features/tickets/passes";
import { useApp } from "@/store/AppProvider";
import { useI18n } from "@/i18n/react";
import { Onboarding } from "@/components/Onboarding";
import { useState } from "react";
import { ArtImage } from "@/components/ArtImage";
import { PostcardViewer, postcardJob } from "@/components/PostcardViewer";
import { getSceneAvailable } from "@/features/art/available";
import type { Arrival } from "@/features/travel/journey";
import type { MessageKey } from "@/i18n";

const DAY = 86_400_000;

export default function JournalPage() {
  const { state, journey, timeZone } = useApp();
  const { t, name, fmt, date } = useI18n();
  const [viewing, setViewing] = useState<Arrival | null>(null);
  if (!state.plan || !journey) return <Onboarding />;

  const totalMin = Math.round(state.ledger.reduce((m, s) => m + s.focusedMs, 0) / 60000);
  const firstByCity = new Map<string, (typeof journey.arrivals)[number]>();
  for (const a of journey.arrivals) if (!firstByCity.has(a.cityId)) firstByCity.set(a.cityId, a);
  const countries = new Set([...firstByCity.keys()].map((id) => getCity(id).countryCode));
  const passes = legPasses(state.plan, state.ledger, timeZone).reverse();

  // last 7 local days of focus
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const days = [...Array(7)].map((_, i) => {
    const start = today.getTime() - (6 - i) * DAY;
    const minutes = state.ledger.filter((s) => s.completedAt >= start && s.completedAt < start + DAY).reduce((m, s) => m + s.focusedMs / 60000, 0);
    return { start, minutes };
  });
  const maxDay = Math.max(30, ...days.map((d) => d.minutes));

  const tiles: [string, string][] = [
    [t("journal.totalFocus"), totalMin >= 60 ? t("journal.hours", { hours: Math.floor(totalMin / 60), minutes: totalMin % 60 }) : t("journal.minutesShort", { minutes: totalMin })],
    [t("journal.distance"), `${fmt(Math.round(journey.totalKm))} km`],
    [t("journal.cities"), fmt(firstByCity.size)],
    [t("journal.countries"), fmt(countries.size)],
  ];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold sm:text-3xl">{t("nav.journal")}</h1>
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-line bg-card p-4"><p className="text-xs text-ink-soft">{label}</p><p className="mt-1 text-xl font-bold tabular">{value}</p></div>
        ))}
      </section>

      <section className="rounded-3xl border border-line bg-card p-5">
        <h2 className="text-lg font-bold">{t("journal.week")}</h2>
        <div className="mt-4 grid h-32 grid-cols-7 items-end gap-2" role="list">
          {days.map((d) => (
            <div key={d.start} role="listitem" className="flex h-full flex-col items-center justify-end gap-1" aria-label={`${date(d.start, undefined, { weekday: "short" })} ${Math.round(d.minutes)}`}>
              <span className="text-[10px] tabular text-ink-soft">{d.minutes ? Math.round(d.minutes) : ""}</span>
              <div className="w-full rounded-t-md bg-accent" style={{ height: `${(d.minutes / maxDay) * 100}%`, minHeight: d.minutes ? 4 : 0 }} />
              <span className="text-xs text-ink-soft">{date(d.start, undefined, { weekday: "narrow" })}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold">{t("journal.postcards")} <span className="font-normal text-ink-soft tabular">{firstByCity.size}/{CITIES.length}</span></h2>
        {firstByCity.size === 0 ? <p className="rounded-2xl border border-dashed border-line p-5 text-ink-soft">{t("journal.empty")}</p> : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...firstByCity.values()].reverse().map((a) => {
              return getSceneAvailable(a.cityId) && (
                <li key={a.cityId}>
                  <button onClick={() => setViewing(a)} className="tap block w-full text-left" aria-haspopup="dialog">
                    <ArtImage className="rounded-lg shadow transition-transform hover:-translate-y-0.5" job={postcardJob(a, timeZone)} alt={name(getCity(a.cityId).name)} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold">{t("journal.passes")}</h2>
        {passes.length === 0 ? <p className="rounded-2xl border border-dashed border-line p-5 text-ink-soft">{t("journal.empty")}</p> : (
          <ul className="grid gap-4 lg:grid-cols-2">
            {passes.map((p) => <li key={p.legIndex}><ArtImage job={{ kind: "pass", input: p }} alt={`${name(getCity(p.fromId).name)} → ${name(getCity(p.toId).name)}`} /></li>)}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold">{t("journal.sessions")}</h2>
        <ul className="divide-y divide-line rounded-2xl border border-line bg-card">
          {[...state.ledger].reverse().slice(0, 12).map((s) => (
            <li key={s.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <span>{date(s.completedAt, undefined, { dateStyle: "medium", timeStyle: "short" })}</span>
              <span className="text-ink-soft">{s.activity ? (["studying", "working", "reading", "programming", "writing", "personal", "custom"].includes(s.activity) ? t(`timer.activity.${s.activity}` as MessageKey) : s.activity) : ""}</span>
              <span className="font-semibold tabular">{t("journal.minutesShort", { minutes: Math.round(s.focusedMs / 60000) })}</span>
            </li>
          ))}
          {state.ledger.length === 0 && <li className="px-4 py-3 text-sm text-ink-soft">{t("journal.empty")}</li>}
        </ul>
      </section>
      <PostcardViewer arrival={viewing} timeZone={timeZone} onClose={() => setViewing(null)} />
    </div>
  );
}
