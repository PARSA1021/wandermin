"use client";
import Link from "next/link";
import { useApp } from "@/store/AppProvider";
import { useI18n } from "@/i18n/react";

/** One-off messages: a session that finished while away, or a break that has ended. */
export function Notice() {
  const { state, dispatch } = useApp();
  const { t } = useI18n();
  const n = state.notice;
  if (!n) return null;
  const text = n.kind === "break-over" ? t("focus.breakDone") : n.kind === "recovered" ? t("notice.recovered") : t("timer.completedWhileAwayMinutes", { minutes: n.minutes });
  return (
    <div role="status" className="rise flex flex-wrap items-center gap-3 rounded-2xl border border-ok/40 bg-ok/10 p-4 text-sm">
      <span className="min-w-0 flex-1">{text}</span>
      {n.kind === "recovered" && (
        <Link href="/profile#data" onClick={() => dispatch({ type: "dismiss-notice" })} className="min-h-10 rounded-lg bg-ink px-3 py-2 font-semibold text-paper">{t("notice.recoveredCta")}</Link>
      )}
      {n.kind === "break-over" && (
        <Link href="/focus" onClick={() => dispatch({ type: "dismiss-notice" })} className="min-h-10 rounded-lg bg-ink px-3 py-2 font-semibold text-paper">{t("home.nextFlight")}</Link>
      )}
      <button onClick={() => dispatch({ type: "dismiss-notice" })} className="min-h-10 rounded-lg px-3 font-semibold underline">{t("common.close")}</button>
    </div>
  );
}
