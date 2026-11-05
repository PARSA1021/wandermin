"use client";
import { useEffect, useState } from "react";
import { useApp } from "@/store/AppProvider";
import { useI18n } from "@/i18n/react";

interface InstallPromptEvent extends Event { prompt(): Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> }

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

let deferred: InstallPromptEvent | null = null;
if (typeof window !== "undefined") window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferred = e as InstallPromptEvent; });

/** Install guidance: the native prompt on Android/desktop Chrome and Edge, step-by-step text on iOS. */
export function InstallCard({ dismissible = false }: { dismissible?: boolean }) {
  const { state, dispatch } = useApp();
  const { t } = useI18n();
  const [standalone, setStandalone] = useState(true);
  const [canPrompt, setCanPrompt] = useState(false);
  useEffect(() => {
    setStandalone(isStandalone());
    setCanPrompt(!!deferred);
    const onPrompt = () => setCanPrompt(true);
    const onInstalled = () => setStandalone(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => { window.removeEventListener("beforeinstallprompt", onPrompt); window.removeEventListener("appinstalled", onInstalled); };
  }, []);

  if (standalone) return dismissible ? null : <p className="text-sm text-ok">✓ {t("pwa.installed")}</p>;
  if (dismissible && state.settings.installDismissed) return null;
  // on the home screen, wait until the first finished session so the nudge is about keeping something real
  if (dismissible && state.ledger.length === 0) return null;
  const ios = isIOS();
  if (!ios && !canPrompt && dismissible) return null; // nothing actionable to offer on this browser

  return (
    <section className="rise flex flex-col gap-3 rounded-2xl border border-line bg-card p-4 sm:flex-row sm:items-center">
      <img src="/icons/icon-192.png" alt="" width={48} height={48} className="h-12 w-12 rounded-xl" />
      <div className="flex-1">
        <p className="font-semibold">{t("pwa.install")}</p>
        <p className="text-sm text-ink-soft">{ios ? (dismissible ? t("pwa.iosKeep") : t("pwa.iosSteps")) : t("pwa.installBody")}</p>
      </div>
      <div className="flex gap-2">
        {canPrompt && !ios && (
          <button onClick={async () => { await deferred?.prompt(); const r = await deferred?.userChoice; if (r?.outcome === "accepted") setStandalone(true); deferred = null; setCanPrompt(false); }}
            className="min-h-11 rounded-xl bg-ink px-4 font-semibold text-paper">{t("pwa.installButton")}</button>
        )}
        {dismissible && <button onClick={() => dispatch({ type: "settings", patch: { installDismissed: true } })} className="min-h-11 rounded-xl px-3 text-sm text-ink-soft underline">{t("pwa.later")}</button>}
      </div>
    </section>
  );
}

/** Small banner when the device goes offline; the app keeps working from cache. */
export function OfflinePill() {
  const { t } = useI18n();
  const [online, setOnline] = useState(true);
  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener("online", on); window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);
  if (online) return null;
  return <div role="status" className="fixed left-1/2 top-3 z-40 -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-xs font-semibold text-paper shadow">{t("pwa.offline")}</div>;
}
