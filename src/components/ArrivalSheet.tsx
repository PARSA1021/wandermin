"use client";
import { useRef } from "react";
import { useRouter } from "next/navigation";
import { getCity, getCountry } from "@/data";
import { getSceneAvailable } from "@/features/art/available";
import { legPasses } from "@/features/tickets/passes";
import { useApp } from "@/store/AppProvider";
import { useI18n } from "@/i18n/react";
import { ArtImage } from "./ArtImage";
import { BottomSheet } from "./BottomSheet";
import { Stamp, fmtDate } from "./Passport";
import { afterLayersClosed } from "./backStack";
import { ShareButton, postcardJob } from "./PostcardViewer";

/** Pixel confetti bursting from the arrival stamp: fixed directions, so it looks the same every time. */
const CONFETTI = Array.from({ length: 14 }, (_, i) => {
  const a = (i / 14) * Math.PI * 2, r = 46 + (i % 3) * 18;
  return { dx: Math.round(Math.cos(a) * r), dy: Math.round(Math.sin(a) * r * 0.8 - 10), rot: (i * 47) % 360, color: ["#c8322a", "#f2c14e", "#2f8f6a", "#3a78c8", "#e88aa0"][i % 5]! };
});

/** The arrival celebration: stamped boarding pass, the new postcard and the country card. */
export function ArrivalSheet() {
  const { state, journey, dispatch, timeZone } = useApp();
  const { t, name } = useI18n();
  const closeRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();
  const cityId = state.pendingArrivals[0];

  const arrival = cityId && journey ? [...journey.arrivals].reverse().find((a) => a.cityId === cityId) : undefined;
  if (!cityId || !journey || !state.plan || !arrival) return null;

  const city = getCity(cityId);
  const country = getCountry(city.countryCode);
  const pass = legPasses(state.plan, state.ledger, timeZone).find((p) => p.legIndex === arrival.legIndex);
  const firstInCountry = journey.arrivals.findIndex((a) => getCity(a.cityId).countryCode === city.countryCode) === journey.arrivals.indexOf(arrival)
    && city.countryCode !== getCity(state.plan.departureId).countryCode;
  const ack = () => dispatch({ type: "ack-arrival", cityId });
  // last of the queued arrivals and no leg left to fly: lead straight to choosing the next city
  const routeDone = !journey.currentLeg && state.pendingArrivals.length === 1;
  const job = postcardJob(arrival, timeZone);
  const hasCard = getSceneAvailable(cityId);

  return (
    <BottomSheet open onClose={ack} labelledBy="arrival-title" initialFocus={closeRef} wide>
      <div className="px-5 pb-6 pt-2 sm:p-7 wideland:grid wideland:grid-cols-2 wideland:items-start wideland:gap-x-6 short:p-4">
        <div className="wideland:col-start-1">
        <p className="text-xs font-black tracking-[0.25em] text-accent">{t("journey.arrived").toUpperCase()}</p>
        <h2 id="arrival-title" className="mt-1 text-2xl font-bold sm:text-3xl">{t("arrival.title", { city: name(city.name) })}</h2>
        <p className="mt-1 text-sm text-ink-soft">{t("arrival.reached", { minutes: Math.round(arrival.focusMinutesAtArrival) })}</p>

        {pass && (
          <div className="relative mt-5 short:mt-3">
            <ArtImage eager className="stamp-hit" job={{ kind: "pass", input: pass }} alt={`${name(getCity(pass.fromId).name)} → ${name(city.name)}`} />
            {CONFETTI.map((c, i) => <span key={i} aria-hidden="true" className="confetti" style={{ left: "38%", top: "36%", background: c.color, ["--dx" as string]: `${c.dx}px`, ["--dy" as string]: `${c.dy}px`, ["--rot" as string]: `${c.rot}deg` }} />)}
          </div>
        )}
        </div>
        {hasCard && <ArtImage eager className="deal-in mt-4 rounded-lg shadow-lg wideland:col-start-2 wideland:row-span-3 wideland:row-start-1 wideland:mt-0" job={job} alt={`${name(city.name)} postcard`} />}

        <dl className="rise-late mt-5 grid grid-cols-2 gap-3 rounded-2xl border border-line bg-paper p-4 text-sm sm:grid-cols-3 wideland:col-start-1 short:mt-3 short:p-3">
          <div className="flex items-center gap-2">
            {firstInCountry && <span className="stamp-in shrink-0" style={{ animationDelay: "900ms" }}><Stamp size={56} info={{ code: country.code, label: country.postcardLabel, date: fmtDate(arrival.arrivedAt), kind: "arrival" }} /></span>}
            <div><dt className="text-ink-soft">{name(country.name)}</dt><dd className="font-semibold">{firstInCountry ? t("passport.newStamp") : "✓"}</dd></div>
          </div>
          <div><dt className="text-ink-soft">{t("arrival.capital")}</dt><dd className="font-semibold">{country.capital ? name(country.capital) : "—"}</dd></div>
          <div className="col-span-2 sm:col-span-1"><dt className="text-ink-soft">{t("arrival.landmark")}</dt><dd className="font-semibold">{name(city.landmark.name)}</dd></div>
        </dl>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse wideland:col-start-1 short:mt-3 tiny:flex-col">
          <button ref={closeRef} onClick={() => { ack(); if (routeDone) setTimeout(() => afterLayersClosed(() => router.push("/")), 0); }} className="tap min-h-12 flex-1 whitespace-nowrap rounded-xl bg-ink px-4 font-semibold text-paper">
            {routeDone ? t("arrival.chooseNext") : t("arrival.next")}
          </button>
          {hasCard && <ShareButton job={job} className="flex-1" />}
        </div>
      </div>
    </BottomSheet>
  );
}
