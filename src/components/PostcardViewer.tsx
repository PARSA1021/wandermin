"use client";
import { useState } from "react";
import { getCity, getCountry } from "@/data";
import type { PostcardJob } from "@/features/art/jobs";
import type { Arrival } from "@/features/travel/journey";
import { useI18n } from "@/i18n/react";
import { ArtImage } from "./ArtImage";
import { BottomSheet } from "./BottomSheet";
import { shareOrSave } from "./artClient";
import { buzz } from "./session";

export const postcardJob = (a: Arrival, timeZone: string): PostcardJob => ({
  kind: "postcard", cityId: a.cityId, fromId: a.fromId, arrivedAt: a.arrivedAt, focusMinutesAtArrival: a.focusMinutesAtArrival, timeZone,
});

/** Share through the system share sheet (or save) — one button used everywhere a postcard appears. */
export function ShareButton({ job, className = "" }: { job: PostcardJob; className?: string }) {
  const { t, name } = useI18n();
  const [busy, setBusy] = useState(false);
  const city = getCity(job.cityId);
  return (
    <button disabled={busy} onClick={async () => {
      setBusy(true); buzz(10);
      try { await shareOrSave(job, `wandermin-${job.cityId}`, t("postcard.shareText", { city: name(city.name) })); } finally { setBusy(false); }
    }} className={`tap flex min-h-12 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-ink px-4 font-semibold disabled:opacity-50 ${className}`}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 15V3M7 8l5-5 5 5" /><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" /></svg>
      {t("postcard.share")}
    </button>
  );
}

/** Full-size postcard with its story and a share button; opened by tapping a card in the album. */
export function PostcardViewer({ arrival, timeZone, onClose }: { arrival: Arrival | null; timeZone: string; onClose: () => void }) {
  const { t, name, date } = useI18n();
  if (!arrival) return <BottomSheet open={false} onClose={onClose} labelledBy="pc-view-title">{null}</BottomSheet>;
  const city = getCity(arrival.cityId), job = postcardJob(arrival, timeZone);
  return (
    <BottomSheet open onClose={onClose} labelledBy="pc-view-title" wide>
      <div className="px-5 pb-6 pt-2 sm:p-6 wideland:grid wideland:grid-cols-[3fr_2fr] wideland:items-center wideland:gap-x-6 short:p-4">
        <ArtImage eager job={job} alt={`${name(city.name)} postcard`} className="hidden rounded-lg shadow-lg wideland:col-start-1 wideland:row-span-4 wideland:row-start-1 wideland:block" />
        <div className="wideland:col-start-2">
        <h2 id="pc-view-title" className="text-xl font-bold">{name(city.name)} <span className="text-base font-normal text-ink-soft">· {name(getCountry(city.countryCode).name)}</span></h2>
        <p className="mt-1 text-sm text-ink-soft">{date(arrival.arrivedAt, undefined, { dateStyle: "long" })} · {t("arrival.reached", { minutes: Math.round(arrival.focusMinutesAtArrival) })}</p>
        <ArtImage eager job={job} alt={`${name(city.name)} postcard`} className="mt-4 rounded-lg shadow-lg wideland:hidden" />
        <p className="mt-3 text-sm"><span className="text-ink-soft">{t("arrival.landmark")}</span> · <b>{name(city.landmark.name)}</b></p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse wideland:flex-col">
          <ShareButton job={job} className="flex-1" />
          <button onClick={onClose} className="tap min-h-12 flex-1 rounded-xl bg-ink px-5 font-semibold text-paper">{t("common.close")}</button>
        </div>
        </div>
      </div>
    </BottomSheet>
  );
}
