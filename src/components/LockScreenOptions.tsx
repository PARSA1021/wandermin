"use client";
import { useState } from "react";
import { useApp } from "@/store/AppProvider";
import { useI18n } from "@/i18n/react";
import { cabin } from "./cabin";
import { isIOS, isStandalone } from "./InstallCard";

function Switch({ on, label, hint, onChange, note }: { on: boolean; label: string; hint: string; onChange: () => void; note?: string }) {
  return (
    <div className="flex items-start gap-3 py-3">
      <div className="flex-1">
        <p className="font-semibold">{label}</p>
        <p className="text-sm text-ink-soft">{hint}</p>
        {note && <p className="mt-1 text-sm text-accent" role="status">{note}</p>}
      </div>
      <button role="switch" aria-checked={on} aria-label={label} onClick={onChange}
        className={`relative mt-1 h-8 w-14 shrink-0 rounded-full transition-colors ${on ? "bg-ok" : "bg-line"}`}>
        <span className={`absolute top-1 h-6 w-6 rounded-full bg-card shadow transition-all ${on ? "left-7" : "left-1"}`} />
      </button>
    </div>
  );
}

/** "Know it's running without unlocking": cabin sound (media card) and the lock-screen notice. */
export function LockScreenOptions({ collapsible = false }: { collapsible?: boolean }) {
  const { state, dispatch } = useApp();
  const { t } = useI18n();
  const [note, setNote] = useState<string | undefined>();
  const s = state.settings;

  const toggleCabin = () => {
    const next = !s.cabinSound;
    dispatch({ type: "settings", patch: { cabinSound: next } });
    if (next && state.active && !state.active.pausedAt) cabin.start(); // must start inside the tap on iOS
    if (!next) cabin.stop();
  };

  const toggleNotice = async () => {
    setNote(undefined);
    if (s.lockNotice) { dispatch({ type: "settings", patch: { lockNotice: false } }); return; }
    if (typeof Notification === "undefined") { setNote(isIOS() && !isStandalone() ? t("companion.iosInstallFirst") : t("companion.unsupported")); return; }
    const result = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
    if (result === "granted") dispatch({ type: "settings", patch: { lockNotice: true } });
    else setNote(t("companion.denied"));
  };

  const body = (
    <>
      <Switch on={s.cabinSound} label={t("companion.cabin")} hint={t("companion.cabinHint")} onChange={toggleCabin} />
      <div className="border-t border-line" />
      <Switch on={s.lockNotice} label={t("companion.notify")} hint={t("companion.notifyHint")} onChange={toggleNotice} note={note} />
    </>
  );
  if (!collapsible) {
    return (
      <section className="rounded-2xl border border-line bg-card px-4 py-1">
        <p className="pt-3 text-xs font-bold uppercase tracking-wider text-ink-soft">{t("companion.lockTitle")}</p>
        {body}
      </section>
    );
  }
  const on = [s.cabinSound && t("companion.cabin"), s.lockNotice && t("companion.notify")].filter(Boolean) as string[];
  return (
    <details open={s.showLockOptions || !!note} onToggle={(e) => { const open = (e.currentTarget as HTMLDetailsElement).open; if (open !== s.showLockOptions) dispatch({ type: "settings", patch: { showLockOptions: open } }); }}
      className="group rounded-2xl border border-line bg-card px-4">
      <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 py-2 [&::-webkit-details-marker]:hidden">
        <span className="flex-1 text-sm font-semibold">{t("companion.lockTitle")}</span>
        <span className="text-xs text-ink-soft">{on.length ? `✓ ${on.join(" · ")}` : t("common.off")}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-ink-soft transition-transform group-open:rotate-180" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
      </summary>
      <div className="border-t border-line">{body}</div>
    </details>
  );
}
