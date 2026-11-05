"use client";
import { useCallback, useEffect, useState } from "react";
import { getCity } from "@/data";
import { TRAVEL_CONFIG } from "@/config/travel";
import { BREAK_MINUTES, CUSTOM_RANGE, PRESET_MINUTES, elapsedMs, formatClock, isPaused, remainingMs, type ActivityId } from "@/features/focus/timer";
import { livePass } from "@/features/tickets/passes";
import { useApp } from "@/store/AppProvider";
import { useI18n } from "@/i18n/react";
import { DestinationPicker } from "@/components/Pickers";
import { Onboarding } from "@/components/Onboarding";
import { Notice } from "@/components/Notice";
import { ArtImage } from "@/components/ArtImage";
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
  const { t, name } = useI18n();
  const active = state.active;
  const now = useNow(250, !!active && !isPaused(active));
  const [minutes, setMinutes] = useState(state.settings.defaultMinutes);
  const [custom, setCustom] = useState("");
  const [activity, setActivity] = useState<ActivityId>(state.settings.activity);
  const [customActivity, setCustomActivity] = useState("");
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
      <section className="mx-auto flex max-w-2xl flex-col items-center gap-6 pt-6 text-center sm:pt-10">
        <p className="text-sm font-semibold text-ink-soft">{paused ? t("focus.paused") : label}</p>
        <div className="relative grid aspect-square w-[min(78vw,20rem)] place-items-center">
          <TimerRing progress={elapsedMs(active, now) / active.plannedMs} paused={paused} kind={active.kind} />
          <p className={`tabular relative font-bold tracking-tight ${remaining >= 3_600_000 ? "text-5xl sm:text-6xl" : "text-6xl sm:text-7xl"} ${paused ? "opacity-60" : ""}`} role="timer" aria-live="off" aria-label={t("timer.remaining", { time: formatClock(remaining) })}>
            {formatClock(remaining)}
          </p>
        </div>
        {pass && <ArtImage eager className="w-full max-w-xl" job={{ kind: "pass", input: pass }} alt={`${name(getCity(pass.fromId).name)} → ${name(getCity(pass.toId).name)}`} />}
        <div className="grid w-full max-w-md grid-cols-3 gap-2">
          <button onClick={togglePause} className="min-h-14 rounded-2xl bg-ink font-semibold text-paper">{paused ? t("timer.resume") : t("timer.pause")}</button>
          <button onClick={() => { if (active.kind === "break") dispatch({ type: "finish", now: Date.now() }); else setConfirm("finish"); }}
            className="min-h-14 rounded-2xl border border-ink font-semibold">{t("timer.complete")}</button>
          <button onClick={() => setConfirm("cancel")} className="min-h-14 rounded-2xl border border-line font-semibold text-ink-soft">{t("timer.cancel")}</button>
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
      </section>
    );
  }

  const chosen = custom ? Number(custom) : minutes;
  const valid = Number.isFinite(chosen) && chosen >= CUSTOM_RANGE.min && chosen <= CUSTOM_RANGE.max;
  const preview = journey?.currentLeg ? livePass(state.plan, state.ledger, timeZone, { startedAt: now, elapsedMinutes: 0, kmPerMinute: TRAVEL_CONFIG.kmPerMinute }) : null;

  return (
    <section className="mx-auto flex max-w-2xl flex-col gap-6">
      <Notice />
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
          <LockScreenOptions collapsible />
          <p className="text-center text-xs text-ink-soft">{t("focus.tooShort")}</p>
          {/* the start button stays in reach of the thumb, above the tab bar */}
          <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-10 -mx-4 bg-gradient-to-t from-paper via-paper to-transparent px-4 pb-2 pt-6 sm:static sm:mx-0 sm:bg-none sm:p-0">
            <button disabled={!valid} onClick={() => {
              setJustFinished(false);
              buzz(20);
              startSession(dispatch, state.settings, { minutes: chosen, activity, customActivity: activity === "custom" ? customActivity.trim() : undefined, remember: !custom });
            }} className="min-h-16 w-full rounded-2xl bg-accent text-lg font-bold text-paper shadow-lg disabled:opacity-40">
              {t("timer.start")} · {valid ? t("timer.duration", { count: chosen }) : "—"}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
