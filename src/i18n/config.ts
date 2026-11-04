/**
 * Locale registry. To add a language (e.g. Simplified Chinese):
 *   1. add `src/i18n/messages/zh-Hans.json` with the same keys as en.json
 *   2. move "zh-Hans" from PLANNED_LOCALES into SUPPORTED_LOCALES and register it in messages/index.ts
 *   3. (optional) add `zh-Hans` names to src/data/*.json — missing ones fall back via FALLBACKS
 */
export const SUPPORTED_LOCALES = ["ko", "en", "ja"] as const;
export const PLANNED_LOCALES = ["zh-Hans", "zh-Hant"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];
export type AnyLocale = Locale | (typeof PLANNED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

/** Fallback chain used when a string or data name is missing in a locale. */
export const FALLBACKS: Record<AnyLocale, AnyLocale[]> = {
  ko: ["en"],
  en: [],
  ja: ["en"],
  "zh-Hans": ["zh-Hant", "en"],
  "zh-Hant": ["zh-Hans", "en"],
};

export const LOCALE_LABELS: Record<AnyLocale, string> = {
  ko: "한국어",
  en: "English",
  ja: "日本語",
  "zh-Hans": "简体中文",
  "zh-Hant": "繁體中文",
};

export function isSupportedLocale(value: string): value is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

/** Pick the best supported locale from a browser language list (e.g. navigator.languages). */
export function matchLocale(preferred: readonly string[]): Locale {
  for (const tag of preferred) {
    const lower = tag.toLowerCase();
    const exact = SUPPORTED_LOCALES.find((l) => l.toLowerCase() === lower);
    if (exact) return exact;
    const base = lower.split("-")[0];
    const byBase = SUPPORTED_LOCALES.find((l) => l.toLowerCase().split("-")[0] === base);
    if (byBase) return byBase;
  }
  return DEFAULT_LOCALE;
}

/** Text that exists in several languages. English is required as the final fallback. */
export type LocalizedText = { en: string } & Partial<Record<AnyLocale, string>>;

export function pickLocalized(text: LocalizedText, locale: AnyLocale): string {
  for (const l of [locale, ...FALLBACKS[locale]]) {
    const v = text[l];
    if (v) return v;
  }
  return text.en;
}
