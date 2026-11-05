"use client";
import { useState } from "react";
import { useI18n } from "@/i18n/react";
import { BottomSheet } from "./BottomSheet";
import { IntroContent } from "./Onboarding";

/** "How it works" in a sheet: the same three lines and sample postcard as the welcome screen. */
export function HowItWorksSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  return (
    <BottomSheet open={open} onClose={onClose} labelledBy="intro-title" wide>
      <div className="px-5 pb-6 pt-2 sm:p-6">
        <h2 id="intro-title" className="mb-1 text-xl font-bold">{t("welcome.howItWorks")}</h2>
        <p className="mb-4 text-sm text-ink-soft">{t("welcome.lead")}</p>
        <IntroContent />
        <button onClick={onClose} className="tap mt-6 min-h-12 w-full rounded-xl bg-ink font-semibold text-paper">{t("common.close")}</button>
      </div>
    </BottomSheet>
  );
}

/** Small "?" pill that opens the explanation from anywhere. */
export function HowItWorksButton({ className = "" }: { className?: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className={`tap inline-flex min-h-10 items-center gap-1.5 rounded-full border border-line bg-card px-3 text-sm font-semibold text-ink-soft ${className}`}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.5v.7M12 17h.01" /></svg>
        {t("help.open")}
      </button>
      <HowItWorksSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}
