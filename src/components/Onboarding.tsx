"use client";
import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { DEPARTURE_CITIES, getCity, getCountry } from "@/data";
import { TRAVEL_CONFIG } from "@/config/travel";
import { suggestNext } from "@/features/travel/graph";
import type { PostcardJob } from "@/features/art/jobs";
import { useApp } from "@/store/AppProvider";
import { useI18n } from "@/i18n/react";
import { LOCALE_LABELS, SUPPORTED_LOCALES } from "@/i18n";
import { ArtImage } from "./ArtImage";
import { buzz, startSession } from "./session";

/** A best guess at the nearest departure city from the device time zone (the user can change it). */
export function guessDeparture(timeZone: string): string {
  if (timeZone === "Asia/Tokyo") return "tokyo";
  if (timeZone.startsWith("America/")) return "new-york";
  if (timeZone === "Europe/London" || timeZone === "Europe/Dublin" || timeZone === "Europe/Lisbon") return "london";
  if (timeZone.startsWith("Europe/") || timeZone.startsWith("Africa/")) return "paris";
  return "seoul";
}

const SAMPLE: PostcardJob = { kind: "postcard", cityId: "tokyo", fromId: "seoul", arrivedAt: Date.UTC(2026, 10, 4, 13, 23), focusMinutesAtArrival: 23, timeZone: "Asia/Tokyo" };

function Step({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <li className="flex items-start gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent/15 text-accent" aria-hidden="true">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{icon}</svg>
      </span>
      <span><b className="block">{title}</b><span className="text-sm text-ink-soft">{body}</span></span>
    </li>
  );
}

/** What the app is, in one screen: a sample postcard and three short lines. Reused by "How it works" in Profile. */
export function IntroContent() {
  const { t } = useI18n();
  return (
    <>
      <ArtImage eager job={SAMPLE} alt={t("welcome.sampleAlt")} className="rise rounded-lg shadow-lg" />
      <ul className="mt-6 grid gap-4">
        <Step icon={<><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2.5M9.5 2.5h5" /></>} title={t("welcome.how1Title")} body={t("welcome.how1", { km: TRAVEL_CONFIG.kmPerMinute })} />
        <Step icon={<path d="M2 16l20-7-3 9-6-3-3 4-1-5z" />} title={t("welcome.how2Title")} body={t("welcome.how2")} />
        <Step icon={<><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 15l5-4 4 3 3-2 6 4" /></>} title={t("welcome.how3Title")} body={t("welcome.how3")} />
      </ul>
    </>
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
  const [step, setStep] = useState(0);
  const [from, setFrom] = useState(() => guessDeparture(timeZone));
  const suggestions = useMemo(() => suggestNext(from, new Set([from]), 3), [from]);
  const [toPick, setToPick] = useState<string | null>(null);
  const to = toPick && suggestions.some((s) => s.cityId === toPick) ? toPick : suggestions[0]?.cityId ?? "";
  const leg = suggestions.find((s) => s.cityId === to);
  const flightMin = leg ? Math.ceil(leg.km / TRAVEL_CONFIG.kmPerMinute) : 0;
  const minutes = state.settings.defaultMinutes;
  const sessions = Math.max(1, Math.ceil(flightMin / minutes));
  const go = (n: number) => { buzz(8); setStep(n); window.scrollTo({ top: 0 }); };
  const commitPlan = () => { dispatch({ type: "choose-departure", departureId: from }); dispatch({ type: "set-destination", cityId: to }); };

  const steps = 4;
  const Footer = ({ children }: { children: ReactNode }) => (
    <div className="sticky bottom-0 -mx-5 mt-8 bg-gradient-to-t from-paper via-paper to-paper/0 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-6 sm:static sm:mx-0 sm:bg-none sm:px-0">{children}</div>
  );
  const primary = "tap flex min-h-14 w-full items-center justify-center rounded-2xl bg-ink px-5 text-lg font-semibold text-paper";

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-2rem)] max-w-md flex-col">
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
              className={`min-h-9 px-2.5 ${locale === l ? "bg-ink text-paper" : "text-ink-soft"}`}>{LOCALE_LABELS[l]}</button>
          ))}
        </div>
      </div>

      <div key={step} className="page-in flex flex-1 flex-col pt-5">
        {step === 0 && (
          <>
            <p className="text-xs font-black tracking-[0.25em] text-accent">WANDERMIN</p>
            <h1 className="mt-2 text-3xl font-bold leading-tight">{t("app.slogan")}</h1>
            <p className="mt-2 text-ink-soft">{t("welcome.lead")}</p>
            <div className="mt-5"><IntroContent /></div>
            <Footer>
              <button onClick={() => go(1)} className={primary}>{t("welcome.start")}</button>
              <p className="mt-3 text-center text-xs text-ink-soft">{t("welcome.private")}</p>
            </Footer>
          </>
        )}

        {step === 1 && (
          <>
            <h1 className="text-2xl font-bold">{t("welcome.fromTitle")}</h1>
            <p className="mt-1 text-ink-soft">{t("welcome.fromBody")}</p>
            <ul className="mt-5 grid gap-2" role="radiogroup" aria-label={t("welcome.fromTitle")}>
              {DEPARTURE_CITIES.map((c) => {
                const on = c.id === from;
                return (
                  <li key={c.id}>
                    <button role="radio" aria-checked={on} onClick={() => { buzz(8); setFrom(c.id); setToPick(null); }}
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
            <ul className="mt-5 grid gap-2" role="radiogroup" aria-label={t("welcome.toTitle", { city: name(getCity(from).name) })}>
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
            <p className="mt-4 text-sm text-ink-soft">{t("welcome.laterAnywhere")}</p>
            <Footer><button onClick={() => go(3)} className={primary}>{t("welcome.next")}</button></Footer>
          </>
        )}

        {step === 3 && leg && (
          <>
            <h1 className="text-2xl font-bold">{t("welcome.boardTitle")}</h1>
            <p className="mt-1 text-ink-soft">{t("welcome.boardBody", { minutes: flightMin, city: name(getCity(to).name) })}</p>
            <ArtImage eager className="rise mt-5" alt={`${name(getCity(from).name)} → ${name(getCity(to).name)}`}
              job={{ kind: "pass", input: { fromId: from, toId: to, boardedAt: Date.now(), minutesFlown: 0, kmPerMinute: TRAVEL_CONFIG.kmPerMinute, sessions: 0, timeZone } }} />
            <div className="mt-5 rounded-2xl border border-line bg-card p-4 text-sm">
              <p className="font-semibold">{sessions === 1 ? t("welcome.oneSession", { minutes }) : t("welcome.nSessions", { minutes, n: sessions })}</p>
              <p className="mt-1 text-ink-soft">{t("welcome.awayOk")}</p>
            </div>
            <Footer>
              <button onClick={() => { commitPlan(); startSession(dispatch, state.settings, { minutes, activity: state.settings.activity }); buzz(20); router.push("/focus"); }} className={primary}>
                {t("welcome.board", { minutes })}
              </button>
              <button onClick={() => { commitPlan(); window.scrollTo({ top: 0 }); }} className="tap mt-2 min-h-12 w-full rounded-2xl font-semibold text-ink-soft">{t("welcome.later")}</button>
            </Footer>
          </>
        )}
      </div>
    </div>
  );
}
