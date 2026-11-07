"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { buzz, startSession } from "@/components/session";
import { CITIES, COUNTRIES, getCity, getCountry } from "@/data";
import { TRAVEL_CONFIG } from "@/config/travel";
import { useApp } from "@/store/AppProvider";
import { useI18n } from "@/i18n/react";
import { DestinationPicker } from "@/components/Pickers";
import { Onboarding } from "@/components/Onboarding";
import { Notice } from "@/components/Notice";
import { NoteReview } from "@/components/NoteReview";
import { HowItWorksButton } from "@/components/HowItWorks";
import { InstallCard } from "@/components/InstallCard";
import { FirstTrip } from "@/components/FirstTrip";
import { ArtImage } from "@/components/ArtImage";
import { postcardJob } from "@/components/PostcardViewer";
import { getSceneAvailable } from "@/features/art/available";
import { useNow } from "@/components/hooks";
import { ceilMinutes, elapsedMs } from "@/features/focus/timer";
import { flightLeftMs, plannedSessionMs } from "@/store/state";
import { fitSessionMinutes } from "@/features/travel/next";
import { livePass } from "@/features/tickets/passes";

function startOfLocalDay(now: number) { const d = new Date(now); d.setHours(0, 0, 0, 0); return d.getTime(); }

export default function HomePage() {
  const { state, journey, timeZone, dispatch } = useApp();
  const router = useRouter();
  const { t, name, fmt } = useI18n();
  const now = useNow(state.active ? 5_000 : 60_000);
  if (!state.plan || !journey) return <Onboarding />;

  const hour = new Date(now).getHours();
  const greeting = hour < 12 ? t("home.greeting.morning") : hour < 18 ? t("home.greeting.afternoon") : t("home.greeting.evening");
  const leg = journey.currentLeg;
  // while a session runs, show where the plane is now (it is recorded when the session completes)
  const liveKm = leg ? Math.min(leg.legKm, leg.travelledKm + (state.active?.kind === "focus" ? (elapsedMs(state.active, now) / 60000) * state.active.kmPerMinute : 0)) : 0;
  const liveProgress = leg ? liveKm / leg.legKm : 0;
  const liveRemaining = leg ? leg.legKm - liveKm : 0;
  const today = state.ledger.filter((s) => s.completedAt >= startOfLocalDay(now)).reduce((m, s) => m + s.focusedMs / 60000, 0);
  const recent = [...journey.arrivals].reverse().slice(0, 6);
  const here = getCity(journey.lastCityId);
  const quickMinutes = fitSessionMinutes(state.settings.defaultMinutes, flightLeftMs(state));
  const quick = plannedSessionMs(state, quickMinutes);
  const finalStop = state.plan.stops.at(-1);
  const stampCount = new Set([...(state.ledger.length ? [getCity(state.plan.departureId).countryCode] : []), ...journey.arrivals.map((a) => getCity(a.cityId).countryCode)]).size;
  // the boarding pass for the leg ahead (live while a session runs)
  const heroPass = leg ? livePass(state.plan, state.ledger, timeZone, state.active?.kind === "focus"
    ? { startedAt: state.active.startedAt, elapsedMinutes: elapsedMs(state.active, now) / 60000, kmPerMinute: state.active.kmPerMinute }
    : { startedAt: Math.floor(now / 300_000) * 300_000, elapsedMinutes: 0, kmPerMinute: TRAVEL_CONFIG.kmPerMinute }) : null;

  return (
    <div className="flex flex-col gap-5">
      <header>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-ink-soft">{greeting}</p>
          <HowItWorksButton />
        </div>
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
          {leg && liveKm > 0
            ? t("home.inFlight", { city: name(getCity(leg.toId).name), percent: Math.floor(liveProgress * 100) })
            : t("home.currentLocation", { place: name(here.name) })}
        </h1>
      </header>
      <Notice />
      <NoteReview />
      <InstallCard dismissible />

      {leg ? (
        <section className="grid gap-4 rounded-3xl border border-line bg-card p-4 sm:p-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-center">
          {heroPass && <ArtImage eager className="w-full" job={{ kind: "pass", input: heroPass }} alt={`${name(getCity(heroPass.fromId).name)} → ${name(getCity(heroPass.toId).name)}`} />}
          <div className="flex flex-col gap-4">
          <div>
            <p className="text-sm font-semibold text-ink-soft">{t("home.nextDestination", { city: name(getCity(leg.toId).name) })} · {name(getCountry(getCity(leg.toId).countryCode).name)}</p>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-paper-deep" role="progressbar" aria-label={t("home.nextDestination", { city: name(getCity(leg.toId).name) })} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(liveProgress * 100)}>
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
                startSession(dispatch, state.settings, { minutes: quickMinutes, activity: state.settings.activity });
                router.push("/focus");
              }} className="min-h-14 rounded-2xl bg-accent px-6 text-lg font-bold text-paper shadow">
                {quick.capped && finalStop
                  ? t("home.quickStartLand", { city: name(getCity(finalStop).name), time: t("timer.duration", { count: ceilMinutes(quick.ms) }) })
                  : t("home.quickStart", { minutes: state.settings.defaultMinutes })}
              </button>
              <div className="flex flex-wrap items-center justify-center gap-x-4">
                <Link href="/focus" className="flex min-h-11 items-center text-sm font-semibold text-ink-soft underline underline-offset-4">{t("home.customize")}</Link>
                <Link href="/map#change" className="flex min-h-11 items-center text-sm font-semibold text-ink-soft underline underline-offset-4">{t("home.changeDest")}</Link>
              </div>
            </div>
          )}
          </div>
        </section>
      ) : (
        <>
          {journey.arrivals.length > 0 && <p className="font-semibold">{t("home.arrivedAll", { city: name(here.name) })}</p>}
          <DestinationPicker />
        </>
      )}

      <FirstTrip />

      {state.ledger.length > 0 && (
        <section aria-label={t("home.statsLabel")} className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
          {[
            [t("journal.totalFocus"), t("journal.minutesShort", { minutes: fmt(Math.round(journey.totalFocusMinutes)) })],
            [t("home.today"), t("journal.minutesShort", { minutes: fmt(Math.round(today)) })],
            [t("journal.distance"), `${fmt(Math.round(journey.totalKm))} km`],
            [t("journal.cities"), fmt(new Set(journey.arrivals.map((a) => a.cityId)).size)],
          ].map(([label, value], i) => (
            <div key={i} className="flex shrink-0 items-baseline gap-2 rounded-full border border-line bg-card px-4 py-2">
              <span className="text-xs text-ink-soft">{label}</span>
              <span className="font-bold tabular">{value}</span>
            </div>
          ))}
          {/* the collections, one tap from Home */}
          {[[t("collection.title"), `${new Set(journey.arrivals.map((a) => a.cityId)).size}/${CITIES.length}`], [t("passport.title"), `${stampCount}/${COUNTRIES.length}`]].map(([label, value]) => (
            <Link key={label} href="/journal" className="tap flex shrink-0 items-baseline gap-2 rounded-full border border-accent/40 bg-accent/10 px-4 py-2">
              <span className="text-xs text-accent">{label}</span>
              <span className="font-bold tabular text-accent">{value}</span>
            </Link>
          ))}
        </section>
      )}

      <section>
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-bold">{t("home.recent")}</h2>
          {recent.length > 0 && <Link href="/journal" className="tap -my-2 inline-flex min-h-11 items-center px-2 text-sm font-semibold text-ink-soft underline underline-offset-4">{t("home.seeAll")}</Link>}
        </div>
        {recent.length === 0 ? (
          leg ? (
            // the first postcard, still faded: what's waiting at the end of this flight
            <div className="grid items-center gap-4 rounded-2xl border border-dashed border-line p-4 sm:grid-cols-[minmax(0,14rem)_1fr]">
              <div className="ghost-card overflow-hidden rounded-md">
                <ArtImage job={{ kind: "postcard", cityId: leg.toId, fromId: leg.fromId, arrivedAt: Date.UTC(2026, 0, 1), focusMinutesAtArrival: 0, timeZone, ghost: true }} alt="" />
              </div>
              <p className="text-ink-soft">
                <b className="block text-ink">{t("home.firstCardTitle", { city: name(getCity(leg.toId).name) })}</b>
                {t("home.noDiscoveries", { minutes: Math.ceil(leg.remainingKm / TRAVEL_CONFIG.kmPerMinute) })}
              </p>
            </div>
          ) : (
            <p className="rounded-2xl border border-dashed border-line p-5 text-ink-soft">{t("journal.empty")}</p>
          )
        ) : (
          <ul className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0">
            {recent.map((a) => {
              return getSceneAvailable(a.cityId) && (
                <li key={`${a.cityId}-${a.arrivedAt}`} className="w-[78%] shrink-0 snap-start sm:w-auto">
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
