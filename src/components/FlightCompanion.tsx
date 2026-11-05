"use client";
/**
 * Keeps the flight visible outside the app while a session runs:
 *  - Media Session (with the opt-in cabin sound): lock-screen "now playing" card with the flight,
 *    landing time and a progress bar; its play/pause buttons pause and resume the session.
 *  - Notification (opt-in): a quiet lock-screen notice with the landing time.
 *  - While audio plays, its timeupdate events let us record completion even with the screen off.
 * Nothing here counts time: every value comes from the stored timestamps.
 */
import { useEffect, useRef } from "react";
import { drawLockArt } from "./lockArt";
import { getCity } from "@/data";
import { elapsedMs, expectedEndAt, formatClock, isDue, remainingMs } from "@/features/focus/timer";
import { useApp } from "@/store/AppProvider";
import { useI18n } from "@/i18n/react";
import { cabin } from "./cabin";
import { buzz } from "./session";

const TAG = "wm-flight";

async function registration(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try { return (await navigator.serviceWorker.getRegistration()) ?? null; } catch { return null; }
}

async function notify(title: string, body: string, opts: { silent: boolean; tag?: string }) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  const reg = await registration();
  const options: NotificationOptions = { body, tag: opts.tag ?? TAG, silent: opts.silent, icon: "/icons/icon-192.png", badge: "/icons/icon-192.png" };
  try {
    if (reg) await reg.showNotification(title, options);
    else new Notification(title, options);
  } catch { /* some platforms only allow notifications from installed apps */ }
}

async function clearNotice() {
  const reg = await registration();
  try { (await reg?.getNotifications({ tag: TAG }))?.forEach((n) => n.close()); } catch { /* ignore */ }
}

export function FlightCompanion() {
  const { state, journey, dispatch, timeZone } = useApp();
  const journeyRef = useRef(journey);
  journeyRef.current = journey;
  const artRef = useRef<{ refresh: () => void; last: number } | null>(null);
  const { t, name, date } = useI18n();
  const stateRef = useRef(state);
  stateRef.current = state;
  const active = state.active;
  const paused = active?.pausedAt != null;
  const destination = journey?.currentLeg ? getCity(journey.currentLeg.toId) : null;
  const clock = (ms: number) => date(ms, undefined, { hour: "2-digit", minute: "2-digit" });

  const title = !active ? "" : active.kind === "break" ? t("companion.breakTitle")
    : t("companion.title", { city: destination ? name(destination.name) : "—" });
  const body = (now: number) => !active ? "" : paused ? t("companion.pausedBody", { time: formatClock(remainingMs(active, now)) })
    : active.kind === "break" ? t("companion.endsAt", { time: clock(expectedEndAt(active, now)) })
    : t("companion.lands", { time: clock(expectedEndAt(active, now)) });

  // cabin sound follows the session
  useEffect(() => {
    if (active && state.settings.cabinSound && !paused) { if (!cabin.playing()) cabin.start(); }
    else if (active && paused) cabin.pause();
    else cabin.stop();
  }, [active?.id, paused, state.settings.cabinSound]); // eslint-disable-line react-hooks/exhaustive-deps

  // lock-screen media card
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    const ms = navigator.mediaSession;
    if (!active || !state.settings.cabinSound) {
      ms.metadata = null;
      ms.playbackState = "none";
      return;
    }
    const now = Date.now();
    ms.metadata = new MediaMetadata({
      title, artist: body(now), album: "WANDERMIN",
      artwork: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }, { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" }],
    });
    ms.playbackState = paused ? "paused" : "playing";
    const setPosition = () => {
      const a = stateRef.current.active;
      if (!a) return;
      try { ms.setPositionState({ duration: a.plannedMs / 1000, position: Math.min(a.plannedMs, elapsedMs(a, Date.now())) / 1000, playbackRate: 1 }); } catch { /* unsupported */ }
    };
    setPosition();
    // swap the icon for a large live flight card (scene, route, progress, landing time)
    const icons = [{ src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" }];
    let alive = true;
    const refresh = async () => {
      const a = stateRef.current.active, j = journeyRef.current;
      if (!a || a.kind !== "focus" || !j?.currentLeg) return;
      const now = Date.now(), leg = j.currentLeg;
      const flown = Math.min(leg.legKm, leg.travelledKm + (elapsedMs(a, now) / 60000) * a.kmPerMinute);
      const isPaused = a.pausedAt !== null;
      const art = await drawLockArt({
        fromId: leg.fromId, toId: leg.toId, progress: flown / leg.legKm, timeZone, paused: isPaused, landsAt: expectedEndAt(a, now),
        bigLine: isPaused ? t("focus.paused") : t("companion.lands", { time: clock(expectedEndAt(a, now)) }),
        smallLine: `${name(getCity(leg.fromId).name)} → ${name(getCity(leg.toId).name)}`,
      });
      if (!alive || !art || !stateRef.current.active) return;
      ms.metadata = new MediaMetadata({ title, artist: body(Date.now()), album: "WANDERMIN", artwork: [{ src: art, sizes: "1024x1024", type: "image/png" }, ...icons] });
      if (artRef.current) artRef.current.last = Date.now();
    };
    artRef.current = { refresh: () => { void refresh(); }, last: Date.now() };
    void refresh();
    const every = window.setInterval(() => void refresh(), 60_000);
    const set = (action: MediaSessionAction, handler: MediaSessionActionHandler | null) => { try { ms.setActionHandler(action, handler); } catch { /* unsupported action */ } };
    set("play", () => { dispatch({ type: "resume", now: Date.now() }); cabin.start(); });
    set("pause", () => { dispatch({ type: "pause", now: Date.now() }); cabin.pause(); });
    for (const a of ["seekto", "seekbackward", "seekforward", "previoustrack", "nexttrack"] as MediaSessionAction[]) set(a, null);
    const el = cabin.element();
    el?.addEventListener("play", setPosition);
    return () => { alive = false; window.clearInterval(every); artRef.current = null; el?.removeEventListener("play", setPosition); };
  }, [active?.id, paused, state.settings.cabinSound, title, state.settings.locale]); // eslint-disable-line react-hooks/exhaustive-deps

  // with the screen off, the playing audio keeps firing timeupdate: use it to land on time
  useEffect(() => {
    const el = cabin.element();
    if (!el) return;
    let last = 0;
    const tick = () => {
      const now = Date.now();
      if (now - last < 1000) return;
      last = now;
      const a = stateRef.current.active;
      if (a && a.pausedAt === null && isDue(a, now)) dispatch({ type: "reconcile", now });
      else if (artRef.current && now - artRef.current.last > 60_000) { artRef.current.last = now; artRef.current.refresh(); }
    };
    el.addEventListener("timeupdate", tick);
    return () => el.removeEventListener("timeupdate", tick);
  }, [dispatch]);

  // quiet lock-screen notice while flying
  useEffect(() => {
    if (!state.settings.lockNotice) { clearNotice(); return; }
    if (active) notify(title, body(Date.now()), { silent: true });
    else clearNotice();
  }, [active?.id, paused, state.settings.lockNotice, title]); // eslint-disable-line react-hooks/exhaustive-deps

  // chime and a final notice when a focus session lands
  const seen = useRef({ ledger: state.ledger.length, arrivals: state.pendingArrivals.length });
  useEffect(() => {
    const before = seen.current;
    seen.current = { ledger: state.ledger.length, arrivals: state.pendingArrivals.length };
    if (state.ledger.length <= before.ledger) return;
    cabin.stop();
    cabin.ding();
    buzz([40, 80, 40]);
    if (!state.settings.lockNotice) return;
    const arrived = state.pendingArrivals.length > before.arrivals ? state.pendingArrivals.at(-1) : undefined;
    const last = state.ledger.at(-1)!;
    if (arrived) notify(t("companion.arrivedTitle", { city: name(getCity(arrived).name) }), t("companion.arrivedBody"), { silent: false, tag: "wm-arrival" });
    else notify(t("companion.doneTitle"), t("companion.doneBody", { minutes: Math.round(last.focusedMs / 60000) }), { silent: false, tag: "wm-arrival" });
  }, [state.ledger.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // a break that ran out: chime, buzz and (if enabled) a notice inviting the next flight
  const breakOver = state.notice?.kind === "break-over";
  useEffect(() => {
    if (!breakOver) return;
    cabin.stop();
    cabin.ding();
    buzz([30, 60, 30]);
    if (state.settings.lockNotice) notify(t("focus.breakDone"), t("home.nextFlight"), { silent: false, tag: "wm-arrival" });
  }, [breakOver]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
