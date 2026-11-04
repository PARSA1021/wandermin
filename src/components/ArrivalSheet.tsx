"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getCity, getCountry } from "@/data";
import { legPasses } from "@/features/tickets/passes";
import { useApp } from "@/store/AppProvider";
import { useI18n } from "@/i18n/react";
import { passSvg, postcardSvg } from "./art";
import { Pixel } from "./Pixel";

/** Save one of our SVG strings as a PNG (falls back to the SVG file if canvas export fails). */
export async function downloadSvg(svg: string, filename: string) {
  const blob = new Blob([svg], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(new Error("load")); img.src = url; });
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth * 2; canvas.height = img.naturalHeight * 2;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const png = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));
    const a = document.createElement("a");
    a.href = URL.createObjectURL(png ?? blob);
    a.download = png ? `${filename}.png` : `${filename}.svg`;
    a.click();
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

export function ArrivalSheet() {
  const { state, journey, dispatch, timeZone } = useApp();
  const { t, name } = useI18n();
  const closeRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();
  const cityId = state.pendingArrivals[0];

  useEffect(() => { if (cityId) closeRef.current?.focus(); }, [cityId]);
  useEffect(() => {
    if (!cityId) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") dispatch({ type: "ack-arrival", cityId }); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cityId, dispatch]);

  if (!cityId || !journey || !state.plan) return null;
  const arrival = [...journey.arrivals].reverse().find((a) => a.cityId === cityId);
  if (!arrival) return null;
  const city = getCity(cityId);
  const country = getCountry(city.countryCode);
  const pass = legPasses(state.plan, state.ledger, timeZone).find((p) => p.legIndex === arrival.legIndex);
  const card = postcardSvg(arrival, timeZone);
  const firstInCountry = journey.arrivals.findIndex((a) => getCity(a.cityId).countryCode === city.countryCode) === journey.arrivals.indexOf(arrival)
    && city.countryCode !== getCity(state.plan.departureId).countryCode;
  const ack = () => dispatch({ type: "ack-arrival", cityId });
  // last of the queued arrivals and no leg left to fly: lead straight to choosing the next city
  const routeDone = !journey.currentLeg && state.pendingArrivals.length === 1;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="arrival-title">
      <div className="mx-auto max-w-2xl rounded-3xl bg-paper p-5 shadow-2xl sm:p-7">
        <p className="text-xs font-black tracking-[0.25em] text-accent">{t("journey.arrived").toUpperCase()}</p>
        <h2 id="arrival-title" className="mt-1 text-2xl font-bold sm:text-3xl">{t("arrival.title", { city: name(city.name) })}</h2>
        <p className="mt-1 text-sm text-ink-soft">{t("arrival.reached", { minutes: Math.round(arrival.focusMinutesAtArrival) })}</p>

        {pass && <Pixel className="rise mt-5" svg={passSvg(pass)} label={`${name(getCity(pass.fromId).name)} → ${name(city.name)}`} />}
        {card && <Pixel className="rise-late mt-4 rounded-lg shadow-lg" svg={card} label={`${name(city.name)} postcard`} />}

        <dl className="rise-late mt-5 grid grid-cols-2 gap-3 rounded-2xl border border-line bg-card p-4 text-sm sm:grid-cols-3">
          <div><dt className="text-ink-soft">{name(country.name)}</dt><dd className="font-semibold">{firstInCountry ? t("arrival.newCountry") : "✓"}</dd></div>
          <div><dt className="text-ink-soft">{t("arrival.capital")}</dt><dd className="font-semibold">{country.capital ? name(country.capital) : "—"}</dd></div>
          <div className="col-span-2 sm:col-span-1"><dt className="text-ink-soft">{t("arrival.landmark")}</dt><dd className="font-semibold">{name(city.landmark.name)}</dd></div>
        </dl>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse">
          <button ref={closeRef} onClick={() => { ack(); if (routeDone) router.push("/"); }} className="min-h-12 flex-1 rounded-xl bg-ink px-5 font-semibold text-paper">
            {routeDone ? t("arrival.chooseNext") : t("arrival.next")}
          </button>
          {card && <button onClick={() => downloadSvg(card, `wandermin-${cityId}`)} className="min-h-12 flex-1 rounded-xl border border-ink px-5 font-semibold">{t("postcard.save")}</button>}
        </div>
      </div>
    </div>
  );
}
