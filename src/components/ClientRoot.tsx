"use client";
import { useEffect, type ReactNode } from "react";
import { AppProvider } from "@/store/AppProvider";
import { I18nProvider } from "@/i18n/react";
import { Shell } from "./Shell";
import { ArrivalSheet } from "./ArrivalSheet";
import { FlightCompanion } from "./FlightCompanion";
import { OfflinePill } from "./InstallCard";
import { AppBadge, UpdateToast } from "./AppSignals";

export function ClientRoot({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register(`/sw.js?v=${encodeURIComponent(process.env.NEXT_PUBLIC_BUILD_ID ?? "dev")}`, { scope: "/" }).catch(() => { /* app works without it, just not offline */ });
  }, []);
  return (
    <AppProvider>
      <I18nProvider>
        <OfflinePill />
        <UpdateToast />
        <AppBadge />
        <Shell>{children}</Shell>
        <ArrivalSheet />
        <FlightCompanion />
      </I18nProvider>
    </AppProvider>
  );
}
