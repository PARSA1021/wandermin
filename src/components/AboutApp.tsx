"use client";
import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/react";
import { CURRENT_BUILD, CURRENT_BUILT_AT, applyUpdate, checkForUpdate, getUpdateStatus, onUpdateStatus, versionLabel, type UpdateStatus } from "./updates";

/** Settings → About: which version this is, and a button to check for (and install) a newer one. */
export function AboutApp() {
  const { t } = useI18n();
  const [status, setStatus] = useState<UpdateStatus>(getUpdateStatus());
  const [updating, setUpdating] = useState(false);
  useEffect(() => onUpdateStatus(setStatus), []);
  const line = status.kind === "checking" ? t("about.checking") : status.kind === "latest" ? `✓ ${t("about.latest")}` : status.kind === "offline" ? t("about.offline") : status.kind === "available" ? t("about.available") : null;
  return (
    <section aria-labelledby="about-title" className="rounded-3xl border border-line bg-card p-5" data-about="">
      <h2 id="about-title" className="text-lg font-bold">{t("about.title")}</h2>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm">
          <span className="text-ink-soft">{t("about.version")} </span>
          <b className="tabular" data-version="">{versionLabel(CURRENT_BUILD, CURRENT_BUILT_AT)}</b>
        </p>
        {status.kind === "available" ? (
          <button disabled={updating} onClick={() => { setUpdating(true); void applyUpdate(); }} className="tap min-h-11 rounded-xl bg-accent px-4 font-semibold text-paper disabled:opacity-60">
            {updating ? t("about.checking") : `${t("pwa.updateNow")} · ${status.build}`}
          </button>
        ) : (
          <button disabled={status.kind === "checking"} onClick={() => void checkForUpdate()} className="tap min-h-11 rounded-xl border border-ink px-4 font-semibold disabled:opacity-60">{t("about.check")}</button>
        )}
      </div>
      {line && <p role="status" className={`mt-2 text-sm ${status.kind === "available" ? "font-semibold text-accent" : "text-ink-soft"}`} data-update-status={status.kind}>{line}</p>}
      <p className="mt-2 text-xs text-ink-soft">{t("about.hint")}</p>
    </section>
  );
}
