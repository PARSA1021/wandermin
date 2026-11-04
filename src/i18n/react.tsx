"use client";
import { createContext, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { createI18n, matchLocale, pickLocalized, type I18n, type LocalizedText, type Locale } from "./index";
import { useApp } from "@/store/AppProvider";

const I18nContext = createContext<I18n | null>(null);

/** Follows the user's saved language (or the device language) and re-renders in place on change. */
export function I18nProvider({ children }: { children: ReactNode }) {
  const { state } = useApp();
  const i18n = useMemo(() => createI18n({ initial: state.settings.locale ?? matchLocale(navigator.languages ?? [navigator.language]), root: document.documentElement }), []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    i18n.setLocale(state.settings.locale ?? matchLocale(navigator.languages ?? [navigator.language]));
  }, [i18n, state.settings.locale]);
  return <I18nContext.Provider value={i18n}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const i18n = useContext(I18nContext);
  if (!i18n) throw new Error("useI18n outside I18nProvider");
  const locale = useSyncExternalStore(i18n.subscribe, () => i18n.locale, () => i18n.locale);
  return { t: i18n.t, locale: locale as Locale, name: (text: LocalizedText) => pickLocalized(text, locale), fmt: i18n.formatNumber, date: i18n.formatDate };
}
