"use client";
import { useEffect, useState } from "react";
import { useApp } from "@/store/AppProvider";
import { useI18n } from "@/i18n/react";

/** Home-screen icon badge = postcards waiting to be opened (where the platform supports it). */
export function AppBadge() {
  const { state } = useApp();
  const count = state.pendingArrivals.length;
  useEffect(() => {
    const nav = navigator as Navigator & { setAppBadge?: (n?: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
    if (!nav.setAppBadge) return;
    (count > 0 ? nav.setAppBadge(count) : nav.clearAppBadge?.())?.catch(() => {});
  }, [count]);
  // once there is something worth keeping, ask the browser not to evict it under storage pressure
  const hasRecords = state.ledger.length > 0;
  useEffect(() => {
    if (!hasRecords) return;
    navigator.storage?.persisted?.().then((done) => { if (!done) return navigator.storage.persist?.(); }).catch(() => {});
  }, [hasRecords]);
  return null;
}

/** When a new service worker takes over, offer a reload instead of swapping the app mid-session. */
export function UpdateToast() {
  const { t } = useI18n();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const hadController = !!navigator.serviceWorker.controller;
    const onChange = () => { if (hadController) setReady(true); };
    navigator.serviceWorker.addEventListener("controllerchange", onChange);
    return () => navigator.serviceWorker.removeEventListener("controllerchange", onChange);
  }, []);
  if (!ready) return null;
  return (
    <div role="status" className="sheet-in fixed inset-x-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-md items-center gap-3 rounded-2xl bg-ink px-4 py-3 text-sm text-paper shadow-lg sm:bottom-6">
      <span className="flex-1">{t("pwa.updateReady")}</span>
      <button onClick={() => location.reload()} className="tap min-h-10 rounded-lg bg-paper px-3 font-semibold text-ink">{t("pwa.reload")}</button>
      <button onClick={() => setReady(false)} aria-label={t("common.close")} className="tap min-h-10 px-2 text-paper/70">✕</button>
    </div>
  );
}
