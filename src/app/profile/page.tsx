"use client";
import { useRef, useState } from "react";
import { getCity } from "@/data";
import { PRESET_MINUTES } from "@/features/focus/timer";
import { LOCALE_LABELS, SUPPORTED_LOCALES, type Locale } from "@/i18n";
import { useApp } from "@/store/AppProvider";
import { useI18n } from "@/i18n/react";
import { InstallCard } from "@/components/InstallCard";
import { LockScreenOptions } from "@/components/LockScreenOptions";
import { ConfirmSheet } from "@/components/ConfirmSheet";
import { parseBackup, type AppState } from "@/store/state";

function Row({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="flex flex-col gap-2 border-b border-line py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between"><span className="font-semibold">{title}</span>{children}</div>;
}

export default function ProfilePage() {
  const { state, dispatch } = useApp();
  const { t, name } = useI18n();
  const s = state.settings;
  const [confirmReset, setConfirmReset] = useState(false);
  const [pending, setPending] = useState<AppState | null>(null);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pickBackup = async (file: File | undefined) => {
    if (!file) return;
    const parsed = parseBackup(await file.text());
    if (fileRef.current) fileRef.current.value = "";
    if (!parsed) { setImportMsg(t("profile.importInvalid")); return; }
    setImportMsg(null); setPending(parsed);
  };
  const exportData = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `wandermin-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-bold sm:text-3xl">{t("nav.profile")}</h1>
      <section className="rounded-3xl border border-line bg-card px-5">
        <Row title={t("profile.language")}>
          <select value={s.locale ?? ""} onChange={(e) => dispatch({ type: "settings", patch: { locale: (e.target.value || null) as Locale | null } })}
            className="min-h-11 rounded-xl border border-line bg-paper px-3">
            <option value="">{t("profile.auto")}</option>
            {SUPPORTED_LOCALES.map((l) => <option key={l} value={l}>{LOCALE_LABELS[l]}</option>)}
          </select>
        </Row>
        <Row title={t("settings.theme")}>
          <div role="radiogroup" aria-label={t("settings.theme")} className="flex overflow-hidden rounded-xl border border-line text-sm font-semibold">
            {(["system", "light", "dark"] as const).map((v) => (
              <button key={v} role="radio" aria-checked={s.theme === v} onClick={() => dispatch({ type: "settings", patch: { theme: v } })}
                className={`min-h-11 flex-1 px-4 ${s.theme === v ? "bg-ink text-paper" : "text-ink-soft"}`}>{t(`theme.${v}`)}</button>
            ))}
          </div>
        </Row>
        <Row title={t("profile.defaultMinutes")}>
          <select value={s.defaultMinutes} onChange={(e) => dispatch({ type: "settings", patch: { defaultMinutes: Number(e.target.value) } })}
            className="min-h-11 rounded-xl border border-line bg-paper px-3 tabular">
            {PRESET_MINUTES.map((m) => <option key={m} value={m}>{t("timer.duration", { count: m })}</option>)}
          </select>
        </Row>
        <Row title={t("settings.reduceMotion")}>
          <button role="switch" aria-checked={s.reduceMotion} onClick={() => dispatch({ type: "settings", patch: { reduceMotion: !s.reduceMotion } })}
            className={`min-h-11 rounded-full px-5 font-semibold ${s.reduceMotion ? "bg-ink text-paper" : "border border-line"}`}>{s.reduceMotion ? t("common.on") : t("common.off")}</button>
        </Row>
        <Row title={t("settings.departure")}>
          <span className="text-sm text-ink-soft sm:max-w-xs sm:text-right">
            {state.plan ? (state.ledger.length ? t("profile.departureLocked", { city: name(getCity(state.plan.departureId).name) }) : name(getCity(state.plan.departureId).name)) : "—"}
          </span>
        </Row>
        {state.plan && state.ledger.length === 0 && (
          <div className="pb-4"><button onClick={() => dispatch({ type: "reset" })} className="min-h-11 rounded-xl border border-ink px-4 text-sm font-semibold">{t("travel.chooseDeparture")}</button></div>
        )}
      </section>

      <InstallCard />
      <LockScreenOptions />
      <section className="rounded-3xl border border-line bg-card p-5">
        <h2 className="text-lg font-bold">{t("profile.data")}</h2>
        <p className="mt-1 text-sm text-ink-soft">{t("profile.dataBody")}</p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button onClick={exportData} className="tap min-h-12 rounded-xl bg-ink px-5 font-semibold text-paper">{t("profile.export")}</button>
          <button onClick={() => fileRef.current?.click()} className="tap min-h-12 rounded-xl border border-ink px-5 font-semibold">{t("profile.import")}</button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" tabIndex={-1} aria-hidden="true" data-testid="backup-file" onChange={(e) => pickBackup(e.target.files?.[0])} />
          <button onClick={() => setConfirmReset(true)} className="tap min-h-12 rounded-xl border border-accent px-5 font-semibold text-accent">{t("profile.reset")}</button>
        </div>
        {importMsg && <p role="status" className="mt-3 text-sm font-semibold">{importMsg}</p>}
      </section>
      <ConfirmSheet open={!!pending} title={t("profile.import")} body={t("profile.importConfirm")}
        confirmLabel={t("profile.importAction")} cancelLabel={t("common.cancel")} onCancel={() => setPending(null)}
        onConfirm={() => { if (pending) dispatch({ type: "import", state: pending }); setPending(null); setImportMsg(t("profile.importDone")); }} />
      <ConfirmSheet open={confirmReset} title={t("profile.reset")} body={t("profile.resetConfirm")} destructive
        confirmLabel={t("profile.reset")} cancelLabel={t("common.cancel")} onCancel={() => setConfirmReset(false)}
        onConfirm={() => { setConfirmReset(false); dispatch({ type: "reset" }); }} />
    </div>
  );
}
