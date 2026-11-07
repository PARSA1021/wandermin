"use client";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { DEPARTURE_CITIES, getCity, getCountry } from "@/data";
import { TRAVEL_CONFIG } from "@/config/travel";
import { suggestNext } from "@/features/travel/graph";
import { useApp } from "@/store/AppProvider";
import { useI18n } from "@/i18n/react";
import { LOCALE_LABELS, SUPPORTED_LOCALES } from "@/i18n";
import { ArtImage } from "./ArtImage";
import { ceilMinutes } from "@/features/focus/timer";
import { buzz, startSession } from "./session";
import { cabin } from "./cabin";
import { Notice } from "./Notice";

/** A best guess at the nearest departure city from the device time zone (the user can change it). */
export function guessDeparture(timeZone: string): string {
  if (timeZone === "Asia/Tokyo") return "tokyo";
  if (timeZone.startsWith("America/")) return "new-york";
  if (timeZone === "Europe/London" || timeZone === "Europe/Dublin" || timeZone === "Europe/Lisbon") return "london";
  if (timeZone.startsWith("Europe/") || timeZone.startsWith("Africa/")) return "paris";
  return "seoul";
}


function Step({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <li className="flex items-start gap-3 tiny:items-center">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent/15 text-accent short:h-8 short:w-8 tiny:h-7 tiny:w-7" aria-hidden="true">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{icon}</svg>
      </span>
      <span><b className="block">{title}</b><span className="text-sm text-ink-soft short:text-xs tiny:hidden">{body}</span></span>
    </li>
  );
}

/** What the app is, in one screen: a sample postcard and three short lines. Reused by "How it works" in Profile. */
export function IntroContent() {
  const { t } = useI18n();
  return (
    <div className="wideland:grid wideland:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] wideland:items-center wideland:gap-6 tiny:block">
      {/* a ready-made image, so the first thing a new visitor sees is the postcard, not a loading box */}
      <img src="/samples/welcome-tokyo.png" alt={t("welcome.sampleAlt")} width={720} height={492} fetchPriority="high"
        className="rise pixelated block aspect-[240/164] w-full rounded-lg shadow-lg short:mx-auto short:w-[min(100%,calc((100dvh-13rem)*1.46))] tiny:hidden" />
      <ul className="mt-6 grid gap-4 wideland:mt-0 short:gap-1.5 tiny:mt-3 tiny:gap-1">
        <Step icon={<><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2.5M9.5 2.5h5" /></>} title={t("welcome.how1Title")} body={t("welcome.how1", { km: TRAVEL_CONFIG.kmPerMinute })} />
        <Step icon={<path d="M2 16l20-7-3 9-6-3-3 4-1-5z" />} title={t("welcome.how2Title")} body={t("welcome.how2")} />
        <Step icon={<><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 15l5-4 4 3 3-2 6 4" /></>} title={t("welcome.how3Title")} body={t("welcome.how3")} />
      </ul>
    </div>
  );
}

/**
 * First run, one decision per screen: what this is → where you are → first flight → board.
 * Mirrors focus/travel apps: value first, sensible defaults pre-selected, and the first session
 * one tap away so the first postcard (the "aha") comes within one short sitting.
 */
export function Onboarding() {
  const { state, dispatch, timeZone } = useApp();
  const { t, name, fmt, locale } = useI18n();
  const router = useRouter();
  // each step is a history entry, so the system back button goes back a step instead of leaving the app
  const [step, setStep] = useState(() => (typeof history !== "undefined" ? (history.state as { wmStep?: number } | null)?.wmStep ?? 0 : 0));
  const stepRef = useRef(step);
  stepRef.current = step;
  const finishRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    const onPop = () => {
      const s = (history.state as { wmStep?: number } | null)?.wmStep ?? 0;
      if (finishRef.current && s === 0) { const f = finishRef.current; finishRef.current = null; f(); return; }
      setStep(s);
      window.scrollTo({ top: 0 });
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  const [from, setFrom] = useState(() => guessDeparture(timeZone));
  // every direct flight from the departure, nearest first; the three nearest are shown until "more" is tapped
  const allDirect = useMemo(() => suggestNext(from, new Set([from]), 99), [from]);
  const [showAll, setShowAll] = useState(false);
  const [toPick, setToPick] = useState<string | null>(null);
  const suggestions = showAll || (toPick && allDirect.findIndex((s) => s.cityId === toPick) >= 3) ? allDirect : allDirect.slice(0, 3);
  const to = toPick && allDirect.some((s) => s.cityId === toPick) ? toPick : allDirect[0]?.cityId ?? "";
  const leg = allDirect.find((s) => s.cityId === to);
  const flightMin = leg ? Math.ceil(leg.km / TRAVEL_CONFIG.kmPerMinute) : 0;
  const minutes = state.settings.defaultMinutes;
  const sessions = Math.max(1, Math.ceil(flightMin / minutes));
  // a first flight shorter than the session: the session will end as the plane lands
  const flightMs = leg ? Math.ceil((leg.km / TRAVEL_CONFIG.kmPerMinute) * 60) * 1000 : 0;
  const landsFirst = leg !== undefined && flightMs < minutes * 60_000;
  const go = (n: number) => {
    buzz(8);
    if (n < step) { history.back(); return; } // same as the system back button
    history.pushState({ ...(history.state ?? {}), wmStep: n }, "");
    setStep(n);
    window.scrollTo({ top: 0 });
  };
  /** Leave onboarding: drop the step entries from history first, so back later doesn't revisit them. */
  const leave = (fn: () => void) => {
    const n = stepRef.current;
    if (n > 0 && (history.state as { wmStep?: number } | null)?.wmStep === n) { finishRef.current = fn; history.go(-n); }
    else fn();
  };
  const commitPlan = () => { dispatch({ type: "choose-departure", departureId: from }); dispatch({ type: "set-destination", cityId: to }); };

  const steps = 4;
  const Footer = ({ children }: { children: ReactNode }) => (
    <div className="sticky bottom-0 z-10 -mx-4 mt-auto bg-gradient-to-t from-paper via-paper to-paper/0 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-6 short:pb-2 short:pt-3 wideland:mx-auto wideland:w-full wideland:max-w-md">{children}</div>
  );
  const primary = "tap flex min-h-14 w-full items-center justify-center rounded-2xl bg-ink px-5 text-lg font-semibold text-paper short:min-h-11 short:text-base";

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-2rem)] max-w-md flex-col wideland:max-w-3xl short:min-h-[calc(100dvh-1rem)]">
      {/* top bar: back, progress, language */}
      <div className="flex items-center gap-3 pt-1">
        <button onClick={() => go(step - 1)} aria-label={t("welcome.back")} className={`tap grid h-10 w-10 place-items-center rounded-full ${step === 0 ? "invisible" : ""}`}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
        </button>
        <div className="flex flex-1 justify-center gap-1.5" role="progressbar" aria-label={t("welcome.progress", { step: step + 1, total: steps })} aria-valuemin={1} aria-valuemax={steps} aria-valuenow={step + 1}>
          {Array.from({ length: steps }, (_, i) => <span key={i} className={`h-1.5 rounded-full transition-all ${i === step ? "w-6 bg-accent" : i < step ? "w-1.5 bg-accent/60" : "w-1.5 bg-line"}`} />)}
        </div>
        <div role="group" aria-label={t("onboarding.language")} className="flex overflow-hidden rounded-full border border-line text-xs font-semibold">
          {SUPPORTED_LOCALES.map((l) => (
            <button key={l} lang={l} aria-pressed={locale === l} onClick={() => dispatch({ type: "settings", patch: { locale: l } })}
              className={`min-h-9 whitespace-nowrap px-2.5 max-[359px]:px-1.5 ${locale === l ? "bg-ink text-paper" : "text-ink-soft"}`}>{LOCALE_LABELS[l]}</button>
          ))}
        </div>
      </div>

      <div key={step} className="page-in flex flex-1 flex-col pt-5">
        {step === 0 && (
          <>
            {/* saved data that couldn't be read: say so here too, since starting over lands on this screen */}
            <div className="mb-4 empty:hidden"><Notice /></div>
            <p className="text-xs font-black tracking-[0.25em] text-accent">WANDERMIN</p>
            <h1 className="mt-2 text-3xl font-bold leading-tight short:text-2xl">{t("app.slogan")}</h1>
            <p className="mt-2 text-ink-soft short:mt-1 short:text-sm">{t("welcome.lead")}</p>
            <div className="mt-5 short:mt-3"><IntroContent /></div>
            <Footer>
              <button onClick={() => go(1)} className={primary}>{t("welcome.start")}</button>
              <p className="mt-3 text-center text-xs text-ink-soft short:mt-1 tiny:hidden">{t("welcome.private")}</p>
            </Footer>
          </>
        )}

        {step === 1 && (
          <>
            <h1 className="text-2xl font-bold">{t("welcome.fromTitle")}</h1>
            <p className="mt-1 text-ink-soft">{t("welcome.fromBody")}</p>
            <ul className="mt-5 grid gap-2 wideland:grid-cols-2 short:mt-3" role="radiogroup" aria-label={t("welcome.fromTitle")}>
              {DEPARTURE_CITIES.map((c) => {
                const on = c.id === from;
                return (
                  <li key={c.id}>
                    <button role="radio" aria-checked={on} onClick={() => { buzz(8); setFrom(c.id); setToPick(null); setShowAll(false); }}
                      className={`tap flex min-h-16 w-full items-center gap-3 rounded-2xl border-2 bg-card px-4 text-left ${on ? "border-accent" : "border-line"}`}>
                      <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 ${on ? "border-accent bg-accent" : "border-line"}`}>{on && <span className="h-2 w-2 rounded-full bg-paper" />}</span>
                      <span className="flex-1 font-semibold">{name(c.name)}<span className="block text-xs font-normal text-ink-soft">{name(getCountry(c.countryCode).name)}</span></span>
                      {c.id === guessDeparture(timeZone) && <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs font-bold text-accent">{t("welcome.nearYou")}</span>}
                      <span className="font-mono text-sm text-ink-soft">{c.code}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <Footer><button onClick={() => go(2)} className={primary}>{t("welcome.next")}</button></Footer>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="text-2xl font-bold">{t("welcome.toTitle", { city: name(getCity(from).name) })}</h1>
            <p className="mt-1 text-ink-soft">{t("welcome.toBody")}</p>
            <ul className="mt-5 grid gap-2 wideland:grid-cols-2 short:mt-3" role="radiogroup" aria-label={t("welcome.toTitle", { city: name(getCity(from).name) })}>
              {suggestions.map((s, i) => {
                const city = getCity(s.cityId), on = s.cityId === to, min = Math.ceil(s.km / TRAVEL_CONFIG.kmPerMinute);
                return (
                  <li key={s.cityId}>
                    <button role="radio" aria-checked={on} onClick={() => { buzz(8); setToPick(s.cityId); }}
                      className={`tap flex min-h-20 w-full items-center gap-3 rounded-2xl border-2 bg-card px-4 py-3 text-left ${on ? "border-accent" : "border-line"}`}>
                      <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 ${on ? "border-accent bg-accent" : "border-line"}`}>{on && <span className="h-2 w-2 rounded-full bg-paper" />}</span>
                      <span className="flex-1">
                        <span className="block font-semibold">{name(city.name)} <span className="text-xs font-normal text-ink-soft">· {name(getCountry(city.countryCode).name)}</span></span>
                        <span className="block text-sm text-ink-soft tabular">{t("welcome.flight", { minutes: min, km: fmt(Math.round(s.km)) })}</span>
                      </span>
                      {i === 0 && <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs font-bold text-accent">{t("welcome.shortest")}</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
            {!showAll && allDirect.length > 3 && (
              <button onClick={() => setShowAll(true)} className="tap mt-2 min-h-12 w-full rounded-2xl border border-dashed border-line font-semibold text-ink-soft">
                {t("welcome.moreFlights", { n: allDirect.length - 3 })}
              </button>
            )}
            <p className="mt-4 text-sm text-ink-soft">{t("welcome.laterAnywhere")}</p>
            <Footer><button onClick={() => go(3)} className={primary}>{t("welcome.next")}</button></Footer>
          </>
        )}

        {step === 3 && leg && (
          <>
            <h1 className="text-2xl font-bold">{t("welcome.boardTitle")}</h1>
            <p className="mt-1 text-ink-soft">{t("welcome.boardBody", { minutes: flightMin, city: name(getCity(to).name) })}</p>
            <div className="wideland:grid wideland:grid-cols-[3fr_2fr] wideland:items-center wideland:gap-5">
            <ArtImage eager className="rise mt-5 short:mt-3" alt={`${name(getCity(from).name)} → ${name(getCity(to).name)}`}
              job={{ kind: "pass", input: { fromId: from, toId: to, boardedAt: Date.now(), minutesFlown: 0, kmPerMinute: TRAVEL_CONFIG.kmPerMinute, sessions: 0, timeZone } }} />
            <div className="mt-5 rounded-2xl border border-line bg-card p-4 text-sm short:mt-3">
              <p className="font-semibold">{landsFirst ? t("welcome.landsInOne", { time: t("timer.duration", { count: ceilMinutes(flightMs) }) }) : sessions === 1 ? t("welcome.oneSession", { minutes }) : t("welcome.nSessions", { minutes, n: sessions })}</p>
              <p className="mt-1 text-ink-soft">{t("welcome.awayOk")}</p>
            </div>
            </div>
            <Footer>
              <button onClick={() => {
                buzz(20);
                if (state.settings.cabinSound) cabin.start(); // audio must start inside the tap (iOS)
                leave(() => { commitPlan(); startSession(dispatch, state.settings, { minutes, activity: state.settings.activity }); router.push("/focus"); });
              }} className={primary}>
                {landsFirst ? t("welcome.boardTime", { time: t("timer.duration", { count: ceilMinutes(flightMs) }) }) : t("welcome.board", { minutes })}
              </button>
              <button onClick={() => leave(() => { commitPlan(); window.scrollTo({ top: 0 }); })} className="tap mt-2 min-h-12 w-full rounded-2xl font-semibold text-ink-soft short:mt-0 short:min-h-10">{t("welcome.later")}</button>
            </Footer>
          </>
        )}
      </div>
    </div>
  );
}
