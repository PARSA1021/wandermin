"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useApp } from "@/store/AppProvider";
import { CURRENT_BUILD, CURRENT_BUILT_AT, applyUpdate, checkForUpdate, getUpdateStatus, onUpdateStatus, versionLabel, type UpdateStatus } from "./updates";
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

/**
 * Updates, in plain sight. After a reload into a new build: "updated to …" for a few seconds. While the
 * app is open: it checks for a newer build (on start, when it comes back to the screen, every 30 min) and
 * offers "update now" — but never in the middle of a flight on the focus screen.
 */
export function UpdateToast() {
  const { t } = useI18n();
  const { state } = useApp();
  const pathname = usePathname();
  const [status, setStatus] = useState<UpdateStatus>(getUpdateStatus());
  const [justUpdated, setJustUpdated] = useState(false);
  const [dismissed, setDismissed] = useState<string | null>(null);

  useEffect(() => {
    try {
      const seen = localStorage.getItem("wm-seen-build");
      if (seen && seen !== CURRENT_BUILD) setJustUpdated(true);
      localStorage.setItem("wm-seen-build", CURRENT_BUILD);
    } catch { /* private mode */ }
  }, []);
  useEffect(() => {
    if (!justUpdated) return;
    const id = setTimeout(() => setJustUpdated(false), 6000);
    return () => clearTimeout(id);
  }, [justUpdated]);

  useEffect(() => {
    const off = onUpdateStatus(setStatus);
    const first = setTimeout(() => void checkForUpdate(), 3000);
    const every = setInterval(() => void checkForUpdate(), 30 * 60_000);
    const onVisible = () => { if (document.visibilityState === "visible") void checkForUpdate(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { off(); clearTimeout(first); clearInterval(every); document.removeEventListener("visibilitychange", onVisible); };
  }, []);

  const bar = "sheet-in fixed inset-x-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-md items-center gap-3 rounded-2xl bg-ink px-4 py-3 text-sm text-paper shadow-lg sm:bottom-6";
  const flying = pathname === "/focus" && !!state.active;
  if (status.kind === "available" && status.build !== dismissed && !flying) {
    return (
      <div role="status" className={bar} data-update="available">
        <span className="flex-1"><b className="block">{t("pwa.updateAvailable")}</b><span className="text-paper/70 tabular">{versionLabel(status.build, status.builtAt)}</span></span>
        <button onClick={() => void applyUpdate()} className="tap min-h-10 rounded-lg bg-paper px-3 font-semibold text-ink">{t("pwa.updateNow")}</button>
        <button onClick={() => setDismissed(status.build)} aria-label={t("pwa.later")} className="tap min-h-10 px-2 text-paper/70">✕</button>
      </div>
    );
  }
  if (justUpdated) {
    return (
      <div role="status" className={bar} data-update="done">
        <span aria-hidden="true">✓</span>
        <span className="flex-1">{t("pwa.updated")} <span className="text-paper/70 tabular">{versionLabel(CURRENT_BUILD, CURRENT_BUILT_AT)}</span></span>
        <button onClick={() => setJustUpdated(false)} aria-label={t("common.close")} className="tap min-h-10 px-2 text-paper/70">✕</button>
      </div>
    );
  }
  return null;
}
