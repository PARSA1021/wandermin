"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useApp } from "@/store/AppProvider";
import { useI18n } from "@/i18n/react";

const KEY = "wm-first-trip-hidden";

/**
 * A three-step guide for the first days: take off, collect the first postcard, fly on. Steps tick
 * themselves off from the travel record; the card goes away once all three are done (or when hidden).
 */
export function FirstTrip() {
  const { state, journey } = useApp();
  const { t } = useI18n();
  const [hidden, setHidden] = useState(true);
  useEffect(() => { try { setHidden(localStorage.getItem(KEY) === "1"); } catch { setHidden(false); } }, []);
  if (!state.plan || !journey || hidden) return null;

  const steps = [
    { done: state.ledger.length > 0 || !!state.active, label: t("firstTrip.fly"), hint: t("firstTrip.flyHint") },
    { done: journey.arrivals.length > 0, label: t("firstTrip.card"), hint: t("firstTrip.cardHint") },
    { done: journey.arrivals.length > 1 || (journey.arrivals.length > 0 && !!journey.currentLeg), label: t("firstTrip.next"), hint: t("firstTrip.nextHint") },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  if (doneCount === steps.length) return null;
  const hide = () => { try { localStorage.setItem(KEY, "1"); } catch { /* private mode */ } setHidden(true); };

  return (
    <section aria-labelledby="first-trip-title" className="rounded-3xl border border-line bg-card p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 id="first-trip-title" className="font-bold">{t("firstTrip.title")} <span className="font-normal text-ink-soft tabular">{doneCount}/{steps.length}</span></h2>
        <button onClick={hide} className="tap -my-2 -mr-2 min-h-11 px-2 text-sm text-ink-soft underline underline-offset-4">{t("firstTrip.hide")}</button>
      </div>
      <ol className="mt-3 flex flex-col gap-2">
        {steps.map((s, i) => {
          const current = !s.done && steps.slice(0, i).every((p) => p.done);
          return (
            <li key={i} className={`flex items-start gap-3 rounded-2xl px-3 py-2 ${current ? "bg-accent/10" : ""}`} aria-current={current ? "step" : undefined}>
              <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 text-xs font-black ${s.done ? "border-accent bg-accent text-paper" : current ? "border-accent text-accent" : "border-line text-ink-soft"}`} aria-hidden="true">
                {s.done ? "✓" : i + 1}
              </span>
              <span className="min-w-0">
                <span className={`block text-sm font-semibold ${s.done ? "text-ink-soft line-through" : ""}`}>{s.label}<span className="sr-only">{s.done ? ` (${t("firstTrip.doneSr")})` : ""}</span></span>
                {current && <span className="block text-xs text-ink-soft">{s.hint}</span>}
              </span>
            </li>
          );
        })}
      </ol>
      {doneCount >= 2 && <Link href="/journal" className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-accent underline underline-offset-4">{t("firstTrip.seeCards")}</Link>}
    </section>
  );
}
