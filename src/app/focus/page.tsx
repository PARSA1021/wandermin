"use client";
import { useCallback, useEffect, useState } from "react";
import { getCity } from "@/data";
import { TRAVEL_CONFIG } from "@/config/travel";
import { BREAK_MINUTES, CUSTOM_RANGE, PRESET_MINUTES, elapsedMs, formatClock, isPaused, remainingMs, type ActivityId } from "@/features/focus/timer";
import { livePass } from "@/features/tickets/passes";
import { useApp } from "@/store/AppProvider";
import { plannedSessionMs } from "@/store/state";
import { useI18n } from "@/i18n/react";
import { DestinationPicker } from "@/components/Pickers";
import { Onboarding } from "@/components/Onboarding";
import { Notice } from "@/components/Notice";
import { ArtImage } from "@/components/ArtImage";
import { TakeoffOverlay } from "@/components/Takeoff";
import { NoteReview } from "@/components/NoteReview";
import { useNow, useWakeLock } from "@/components/hooks";
import { LockScreenOptions } from "@/components/LockScreenOptions";
import { ConfirmSheet } from "@/components/ConfirmSheet";
import { cabin } from "@/components/cabin";
import { buzz, startSession } from "@/components/session";
import type { MessageKey } from "@/i18n";

const ACTIVITIES: ActivityId[] = ["studying", "working", "reading", "programming", "writing", "personal", "custom"];

function Chip({ on, children, onClick }: { on: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick}
      className={`min-h-11 rounded-full border px-4 text-sm font-semibold tabular ${on ? "border-ink bg-ink text-paper" : "border-line bg-card text-ink hover:border-ink"}`}>
      {children}
    </button>
  );
}

/** Circular progress around the clock; a small plane rides the ring. */
function TimerRing({ progress, paused, kind }: { progress: number; paused: boolean; kind: "focus" | "break" }) {
  const r = 46, c = 2 * Math.PI * r, p = Math.min(1, Math.max(0, progress));
  const a = (p * 360 - 90) * (Math.PI / 180);
  const color = kind === "break" ? "var(--color-ok)" : "var(--color-accent)";
  return (
    <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden="true">
      <circle cx="50" cy="50" r={r} fill="none" stroke="var(--color-paper-deep)" strokeWidth="3.5" />
      <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="3.5" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - p)}
        transform="rotate(-90 50 50)" style={{ transition: "stroke-dashoffset .9s linear", opacity: paused ? 0.45 : 1 }} />
      {kind === "focus" && (
        <g transform={`translate(${50 + r * Math.cos(a)} ${50 + r * Math.sin(a)}) rotate(${p * 360})`}>
          <circle r="4.2" fill="var(--color-card)" stroke={color} strokeWidth="1" />
          <path d="M2.6 0 L-0.9 -0.5 L-1.8 -2.2 L-2.4 -2.2 L-1.8 -0.45 L-2.6 -0.35 L-3.1 -1.1 L-3.5 -1.1 L-3.15 0 L-3.5 1.1 L-3.1 1.1 L-2.6 0.35 L-1.8 0.45 L-2.4 2.2 L-1.8 2.2 L-0.9 0.5 Z" fill="var(--color-ink)" />
        </g>
      )}
    </svg>
  );
}

export default function FocusPage() {
  const { state, journey, dispatch, timeZone } = useApp();
  const { t, name, fmt } = useI18n();
  const active = state.active;
  const now = useNow(250, !!active && !isPaused(active));
  const [minutes, setMinutes] = useState(state.settings.defaultMinutes);
  const [custom, setCustom] = useState("");
  const [activity, setActivity] = useState<ActivityId>(state.settings.activity);
  const [customActivity, setCustomActivity] = useState("");
  const [note, setNote] = useState(state.draftNote);
  useEffect(() => { if (state.draftNote) setNote(state.draftNote); }, [state.draftNote]);
  // a session (re)starting swaps the setup form for the timer: show it from the top
  const activeId = active?.id;
  useEffect(() => { if (activeId) window.scrollTo({ top: 0 }); }, [activeId]);
  const [justFinished, setJustFinished] = useState(false);
  const [confirm, setConfirm] = useState<null | "finish" | "cancel">(null);
  const closeConfirm = useCallback(() => setConfirm(null), []);

  const togglePause = useCallback(() => {
    const a = state.active;
    if (!a) return;
    buzz(15);
    if (a.pausedAt) { dispatch({ type: "resume", now: Date.now() }); if (state.settings.cabinSound) cabin.start(); }
    else dispatch({ type: "pause", now: Date.now() });
  }, [state.active, state.settings.cabinSound, dispatch]);

  // Space pauses and resumes (not while typing or when a button already has focus)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat || confirm) return;
      const el = document.activeElement as HTMLElement | null;
      if (el && el !== document.body && /^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(el.tagName)) return;
      e.preventDefault();
      togglePause();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePause, confirm]);
  const wakeSupported = useWakeLock(!!active && !isPaused(active) && state.settings.wakeLock);

  // when the clock reaches zero while the screen is open, record it straight away
  useEffect(() => {
    if (active && !isPaused(active) && remainingMs(active, now) <= 0) {
      dispatch({ type: "reconcile", now: Date.now() });
      if (active.kind === "focus") setJustFinished(true);
    }
  }, [active, now, dispatch]);

  if (!state.plan) return <Onboarding />;
  const needsDestination = !journey?.currentLeg && !active;

  if (active) {
    const remaining = remainingMs(active, now);
    const elapsedMin = elapsedMs(active, now) / 60000;
    const pass = active.kind === "focus" ? livePass(state.plan, state.ledger, timeZone, { startedAt: active.startedAt, elapsedMinutes: elapsedMin, kmPerMinute: active.kmPerMinute }) : null;
    const label = active.kind === "break" ? t("focus.onBreak")
      : t("focus.focusing", { activity: active.activity === "custom" && active.customActivity ? active.customActivity : t(`timer.activity.${active.activity}` as MessageKey) });
    const paused = isPaused(active);
    return (
      <section className="mx-auto flex max-w-2xl flex-col items-center gap-6 pt-6 text-center sm:pt-10 wideland:max-w-5xl wideland:flex-row wideland:items-start wideland:justify-center wideland:gap-x-8 short:gap-x-5 short:pt-2">
        {active.kind === "focus" && pass && (
          <TakeoffOverlay sessionId={active.id} startedAt={active.startedAt} city={name(getCity(state.plan.stops.at(-1) ?? pass.toId).name)} time={formatClock(active.plannedMs)} />
        )}
        <div className="flex flex-col items-center gap-3 wideland:sticky wideland:top-4">
        <p className="text-sm font-semibold text-ink-soft">{paused ? t("focus.paused") : label}</p>
        {pass && !paused && <p className="-mt-1 text-xs text-ink-soft">{t("focus.inFlightHint", { city: name(getCity(pass.toId).name), rate: TRAVEL_CONFIG.kmPerMinute })}</p>}
        {active.note && <p className="max-w-xs rounded-full bg-paper-deep/70 px-4 py-1.5 text-sm font-semibold">{t("note.onboard", { note: active.note })}</p>}
        <div className="relative grid aspect-square w-[min(78vw,20rem)] place-items-center wideland:w-[min(38vw,24rem)] short:w-[min(34vw,calc(100dvh-5rem))]">
          <TimerRing progress={elapsedMs(active, now) / active.plannedMs} paused={paused} kind={active.kind} />
          <p className={`tabular relative font-bold tracking-tight ${remaining >= 3_600_000 ? "text-5xl sm:text-6xl" : "text-6xl sm:text-7xl"} ${paused ? "opacity-60" : ""}`} role="timer" aria-live="off" aria-label={t("timer.remaining", { time: formatClock(remaining) })}>
            {formatClock(remaining)}
          </p>
        </div>
        </div>
        <div className="flex w-full max-w-xl flex-col items-center gap-6 wideland:min-w-0 wideland:flex-1 short:gap-3">
        {pass && <ArtImage eager className="w-full max-w-xl" job={{ kind: "pass", input: pass }} alt={`${name(getCity(pass.fromId).name)} → ${name(getCity(pass.toId).name)}`} />}
        <div className="grid w-full max-w-md grid-cols-3 gap-2">
          <button onClick={togglePause} className="min-h-14 whitespace-nowrap rounded-2xl bg-ink px-2 font-semibold text-paper short:min-h-12 short:text-sm">{paused ? t("timer.resume") : t("timer.pause")}</button>
          <button onClick={() => { if (active.kind === "break") dispatch({ type: "finish", now: Date.now() }); else setConfirm("finish"); }}
            className="min-h-14 whitespace-nowrap rounded-2xl border border-ink px-2 font-semibold short:min-h-12 short:text-sm">{t("timer.complete")}</button>
          <button onClick={() => setConfirm("cancel")} className="min-h-14 whitespace-nowrap rounded-2xl border border-line px-2 font-semibold text-ink-soft short:min-h-12 short:text-sm">{t("timer.cancel")}</button>
        </div>
        <p className="hidden text-xs text-ink-soft sm:block" aria-hidden="true">{t("focus.shortcuts")}</p>
        <ConfirmSheet open={confirm === "finish"} title={t("focus.finishTitle")}
          body={elapsedMs(active, now) < 60_000 ? t("focus.tooShort") : t("focus.finishConfirm", { minutes: Math.floor(elapsedMs(active, now) / 60000) })}
          confirmLabel={t("timer.complete")} cancelLabel={t("focus.keepGoing")} onCancel={closeConfirm}
          onConfirm={() => { setConfirm(null); dispatch({ type: "finish", now: Date.now() }); setJustFinished(true); }} />
        <ConfirmSheet open={confirm === "cancel"} title={t("focus.cancelTitle")} body={t("focus.cancelConfirm")} destructive
          confirmLabel={t("focus.cancelSession")} cancelLabel={t("focus.keepGoing")} onCancel={closeConfirm}
          onConfirm={() => { setConfirm(null); dispatch({ type: "cancel", now: Date.now() }); }} />
        {wakeSupported && (
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input type="checkbox" className="h-5 w-5 accent-[var(--color-ink)]" checked={state.settings.wakeLock} onChange={(e) => dispatch({ type: "settings", patch: { wakeLock: e.target.checked } })} />
            {t("focus.keepAwake")}
          </label>
        )}
        <div className="w-full max-w-md text-left"><LockScreenOptions collapsible /></div>
        <p className="max-w-md text-xs text-ink-soft">{t("focus.awayNote")}</p>
        </div>
      </section>
    );
  }

  const chosen = custom ? Number(custom) : minutes;
  const valid = Number.isFinite(chosen) && chosen >= CUSTOM_RANGE.min && chosen <= CUSTOM_RANGE.max;
  // when the final stop is closer than the chosen length, the session ends as the plane lands
  const plannedRun = valid ? plannedSessionMs(state, chosen) : null;
  const finalStop = state.plan?.stops.at(-1);
  const landing = plannedRun?.capped && finalStop ? { ms: plannedRun.ms, city: name(getCity(finalStop).name) } : null;
  const preview = journey?.currentLeg ? livePass(state.plan, state.ledger, timeZone, { startedAt: now, elapsedMinutes: 0, kmPerMinute: TRAVEL_CONFIG.kmPerMinute }) : null;

  return (
    <section className="mx-auto flex max-w-2xl flex-col gap-6">
      <Notice />
      <NoteReview />
      {justFinished && !state.pendingArrivals.length && (
        <div className="rise flex flex-col gap-3 rounded-2xl border border-line bg-card p-4 sm:flex-row sm:items-center">
          <p className="flex-1 font-semibold">✓ {t("timer.complete")}</p>
          {BREAK_MINUTES.map((m) => (
            <button key={m} onClick={() => { setJustFinished(false); startSession(dispatch, state.settings, { minutes: m, activity, kind: "break" }); }}
              className="min-h-11 rounded-xl border border-ink px-4 text-sm font-semibold">{t("focus.takeBreak", { minutes: m })}</button>
          ))}
        </div>
      )}
      {needsDestination ? <DestinationPicker /> : (
        <>
          {preview && <ArtImage eager job={{ kind: "pass", input: preview }} alt={`${name(getCity(preview.fromId).name)} → ${name(getCity(preview.toId).name)}`} />}
          <fieldset>
            <legend className="mb-2 text-sm font-bold">{t("focus.duration")}</legend>
            <div className="flex flex-wrap gap-2">
              {PRESET_MINUTES.map((m) => <Chip key={m} on={!custom && minutes === m} onClick={() => { setCustom(""); setMinutes(m); }}>{t("timer.duration", { count: m })}</Chip>)}
              <label className="flex items-center gap-2">
                <span className="sr-only">{t("focus.customMinutes")}</span>
                <input inputMode="numeric" pattern="[0-9]*" placeholder={t("timer.custom")} value={custom} onChange={(e) => setCustom(e.target.value.replace(/\D/g, "").slice(0, 3))}
                  className={`min-h-11 w-28 rounded-full border px-4 text-sm tabular ${custom ? "border-ink" : "border-line"} bg-card`} aria-describedby="custom-hint" />
              </label>
            </div>
            {custom && !valid && <p id="custom-hint" className="mt-2 text-sm text-accent">{t("focus.customMinutes")}</p>}
          </fieldset>
          <fieldset>
            <legend className="mb-2 text-sm font-bold">{t("focus.activityLabel")}</legend>
            <div className="flex flex-wrap gap-2">
              {ACTIVITIES.map((a) => <Chip key={a} on={activity === a} onClick={() => setActivity(a)}>{t(`timer.activity.${a}` as MessageKey)}</Chip>)}
            </div>
            {activity === "custom" && (
              <input value={customActivity} maxLength={30} onChange={(e) => setCustomActivity(e.target.value)} placeholder={t("focus.customActivity")}
                className="mt-2 min-h-11 w-full rounded-xl border border-line bg-card px-4" />
            )}
          </fieldset>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-bold">{t("note.label")}</span>
            <input value={note} maxLength={80} onChange={(e) => setNote(e.target.value)} placeholder={t("note.placeholder")} enterKeyHint="done"
              className="min-h-12 w-full rounded-xl border border-line bg-card px-4" />
            {state.draftNote && note === state.draftNote && <span className="text-xs text-ink-soft">↻ {t("note.carried")}</span>}
          </label>
          <LockScreenOptions collapsible />
          {!landing && journey?.currentLeg && (
            <p className="rounded-xl bg-paper-deep/60 px-4 py-3 text-sm text-ink-soft" role="note">
              {t("focus.flightHint", { city: name(getCity(journey.currentLeg.toId).name), km: fmt(Math.round(journey.currentLeg.remainingKm)), rate: TRAVEL_CONFIG.kmPerMinute })}
            </p>
          )}
          {landing && <p className="rounded-xl bg-accent/10 px-4 py-3 text-sm font-semibold text-accent" role="note">{t("focus.landsHint", { city: landing.city, time: formatClock(landing.ms) })}</p>}
          <p className="text-center text-xs text-ink-soft">{t("focus.tooShort")}</p>
          {/* the start button stays in reach of the thumb, above the tab bar */}
          <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-10 -mx-4 bg-gradient-to-t from-paper via-paper to-transparent px-4 pb-2 pt-6 sm:bottom-0 sm:not-short:static sm:not-short:mx-0 sm:not-short:bg-none sm:not-short:p-0 short:pt-3">
            <button disabled={!valid} onClick={() => {
              setJustFinished(false);
              buzz(20);
              startSession(dispatch, state.settings, { minutes: chosen, activity, customActivity: activity === "custom" ? customActivity.trim() : undefined, remember: !custom, note });
              setNote("");
            }} className="min-h-16 w-full rounded-2xl bg-accent text-lg font-bold text-paper shadow-lg disabled:opacity-40">
              {t("timer.start")} · {!valid ? "—" : landing ? t("timer.landsIn", { city: landing.city, time: formatClock(landing.ms) }) : t("timer.duration", { count: chosen })}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
