"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { buzz, startSession } from "@/components/session";
import { getCity, getCountry } from "@/data";
import { TRAVEL_CONFIG } from "@/config/travel";
import { useApp } from "@/store/AppProvider";
import { useI18n } from "@/i18n/react";
import { DeparturePicker, DestinationPicker } from "@/components/Pickers";
import { Notice } from "@/components/Notice";
import { InstallCard } from "@/components/InstallCard";
import { ArtImage } from "@/components/ArtImage";
import { postcardJob } from "@/components/PostcardViewer";
import { getSceneAvailable } from "@/features/art/available";
import { useNow } from "@/components/hooks";
import { elapsedMs } from "@/features/focus/timer";

function startOfLocalDay(now: number) { const d = new Date(now); d.setHours(0, 0, 0, 0); return d.getTime(); }

export default function HomePage() {
  const { state, journey, timeZone, dispatch } = useApp();
  const router = useRouter();
  const { t, name, fmt } = useI18n();
  const now = useNow(state.active ? 5_000 : 60_000);
  if (!state.plan || !journey) return <DeparturePicker />;

  const hour = new Date(now).getHours();
  const greeting = hour < 12 ? t("home.greeting.morning") : hour < 18 ? t("home.greeting.afternoon") : t("home.greeting.evening");
  const leg = journey.currentLeg;
  // while a session runs, show where the plane is now (it is recorded when the session completes)
  const liveKm = leg ? Math.min(leg.legKm, leg.travelledKm + (state.active?.kind === "focus" ? (elapsedMs(state.active, now) / 60000) * state.active.kmPerMinute : 0)) : 0;
  const liveProgress = leg ? liveKm / leg.legKm : 0;
  const liveRemaining = leg ? leg.legKm - liveKm : 0;
  const today = state.ledger.filter((s) => s.completedAt >= startOfLocalDay(now)).reduce((m, s) => m + s.focusedMs / 60000, 0);
  const recent = [...journey.arrivals].reverse().slice(0, 3);
  const here = getCity(journey.lastCityId);

  return (
    <div className="flex flex-col gap-5">
      <header>
        <p className="text-sm text-ink-soft">{greeting}</p>
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
          {leg && liveKm > 0
            ? t("home.inFlight", { city: name(getCity(leg.toId).name), percent: Math.floor(liveProgress * 100) })
            : t("home.currentLocation", { place: name(here.name) })}
        </h1>
      </header>
      <Notice />
      <InstallCard dismissible />

      {leg ? (
        <section className="grid gap-4 rounded-3xl border border-line bg-card p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:p-6">
          <div>
            <p className="text-sm font-semibold text-ink-soft">{t("home.nextDestination", { city: name(getCity(leg.toId).name) })} · {name(getCountry(getCity(leg.toId).countryCode).name)}</p>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-paper-deep" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(liveProgress * 100)}>
              <div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(2, liveProgress * 100)}%` }} />
            </div>
            <p className="mt-2 text-sm tabular text-ink-soft">
              {t("travel.remaining", { km: fmt(Math.round(liveRemaining)), city: name(getCity(leg.toId).name) })} · {t("home.remainingFocus", { minutes: Math.ceil(liveRemaining / TRAVEL_CONFIG.kmPerMinute) })}
            </p>
          </div>
          {state.active ? (
            <Link href="/focus" className="flex min-h-14 items-center justify-center rounded-2xl bg-ink px-6 text-lg font-bold text-paper shadow">{t("nav.focus")} →</Link>
          ) : (
            <div className="flex flex-col items-stretch gap-1">
              <button onClick={() => {
                buzz(20);
                startSession(dispatch, state.settings, { minutes: state.settings.defaultMinutes, activity: state.settings.activity });
                router.push("/focus");
              }} className="min-h-14 rounded-2xl bg-accent px-6 text-lg font-bold text-paper shadow">
                {t("home.quickStart", { minutes: state.settings.defaultMinutes })}
              </button>
              <Link href="/focus" className="flex min-h-10 items-center justify-center text-sm font-semibold text-ink-soft underline underline-offset-4">{t("home.customize")}</Link>
            </div>
          )}
        </section>
      ) : (
        <>
          {journey.arrivals.length > 0 && <p className="font-semibold">{t("home.arrivedAll", { city: name(here.name) })}</p>}
          <DestinationPicker />
        </>
      )}

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          [t("journal.totalFocus"), t("journal.minutesShort", { minutes: fmt(Math.round(journey.totalFocusMinutes)) })],
          [t("home.today"), t("journal.minutesShort", { minutes: fmt(Math.round(today)) })],
          [t("journal.distance"), `${fmt(Math.round(journey.totalKm))} km`],
          [t("journal.cities"), fmt(new Set(journey.arrivals.map((a) => a.cityId)).size)],
        ].map(([label, value], i) => (
          <div key={i} className="rounded-2xl border border-line bg-card p-4">
            <p className="text-xs text-ink-soft">{label}</p>
            <p className="mt-1 text-xl font-bold tabular">{value}</p>
          </div>
        ))}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold">{t("home.recent")}</h2>
        {recent.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line p-5 text-ink-soft">
            {t("home.noDiscoveries", { minutes: leg ? Math.ceil(leg.remainingKm / TRAVEL_CONFIG.kmPerMinute) : 0 })}
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-3">
            {recent.map((a) => {
              return getSceneAvailable(a.cityId) && (
                <li key={`${a.cityId}-${a.arrivedAt}`}>
                  <Link href="/journal" className="tap block"><ArtImage className="rounded-lg shadow" job={postcardJob(a, timeZone)} alt={name(getCity(a.cityId).name)} /></Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
