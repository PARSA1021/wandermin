import { DEFAULT_LOCALE, FALLBACKS, isSupportedLocale, matchLocale, type Locale } from "./config";
import { MESSAGES, type MessageKey } from "./messages";

export * from "./config";
export type { MessageKey } from "./messages";

export type Params = Record<string, string | number>;

const STORAGE_KEY = "wandermin.locale";

function lookup(locale: Locale, key: string): string | undefined {
  for (const l of [locale, ...FALLBACKS[locale]]) {
    if (!isSupportedLocale(l)) continue;
    let node: unknown = MESSAGES[l];
    for (const part of key.split(".")) node = (node as Record<string, unknown> | undefined)?.[part];
    if (typeof node === "string") return node;
  }
  return undefined;
}

/**
 * Minimal ICU subset: `{name}` and `{count, plural, one {# item} other {# items}}`
 * (also `=0 {...}`). Numbers are formatted for the locale.
 */
export function formatMessage(template: string, params: Params, locale: Locale): string {
  const nf = new Intl.NumberFormat(locale);
  const pr = new Intl.PluralRules(locale);
  const fmt = (v: string | number) => (typeof v === "number" ? nf.format(v) : v);
  let out = "";
  let i = 0;
  while (i < template.length) {
    const open = template.indexOf("{", i);
    if (open < 0) { out += template.slice(i); break; }
    out += template.slice(i, open);
    // find matching brace
    let depth = 0, end = open;
    for (; end < template.length; end++) {
      if (template[end] === "{") depth++;
      else if (template[end] === "}" && --depth === 0) break;
    }
    const body = template.slice(open + 1, end);
    const [name, kind, ...rest] = body.split(",");
    const key = name!.trim();
    const value = params[key];
    if (kind?.trim() === "plural" && typeof value === "number") {
      const options = rest.join(",");
      const cases = new Map<string, string>();
      const re = /\s*(=\d+|zero|one|two|few|many|other)\s*\{((?:[^{}]|\{[^{}]*\})*)\}/g;
      for (const m of options.matchAll(re)) cases.set(m[1]!, m[2]!);
      const chosen = cases.get(`=${value}`) ?? cases.get(pr.select(value)) ?? cases.get("other") ?? "";
      out += formatMessage(chosen.replace(/#/g, nf.format(value)), params, locale);
    } else {
      out += value === undefined ? `{${key}}` : fmt(value);
    }
    i = end + 1;
  }
  return out;
}

export interface I18n {
  readonly locale: Locale;
  t(key: MessageKey, params?: Params): string;
  setLocale(locale: Locale): void;
  /** Subscribe to locale changes; returns an unsubscribe function (fits React useSyncExternalStore). */
  subscribe(listener: () => void): () => void;
  formatNumber(n: number, opts?: Intl.NumberFormatOptions): string;
  formatDate(ms: number, timeZone?: string, opts?: Intl.DateTimeFormatOptions): string;
}

interface I18nOptions {
  initial?: Locale;
  storage?: Pick<Storage, "getItem" | "setItem"> | null;
  /** Usually document.documentElement; its `lang` follows the locale. */
  root?: { lang: string } | null;
  languages?: readonly string[];
}

/** Resolve the starting locale: saved choice → browser languages → default. */
export function resolveInitialLocale(opts: Pick<I18nOptions, "storage" | "languages">): Locale {
  try {
    const saved = opts.storage?.getItem(STORAGE_KEY);
    if (saved && isSupportedLocale(saved)) return saved;
  } catch { /* storage blocked (private mode) */ }
  return opts.languages?.length ? matchLocale(opts.languages) : DEFAULT_LOCALE;
}

/**
 * Framework-agnostic i18n store. The React layer reads it with
 * `useSyncExternalStore(i18n.subscribe, () => i18n.locale)`, so every mounted component
 * re-renders in place when the language changes — no page reload, no lost timer state.
 */
export function createI18n(opts: I18nOptions = {}): I18n {
  let locale = opts.initial ?? resolveInitialLocale(opts);
  const listeners = new Set<() => void>();
  if (opts.root) opts.root.lang = locale;

  return {
    get locale() { return locale; },
    t(key, params = {}) {
      const template = lookup(locale, key);
      if (template === undefined) return key;
      return formatMessage(template, params, locale);
    },
    setLocale(next) {
      if (!isSupportedLocale(next) || next === locale) return;
      locale = next;
      if (opts.root) opts.root.lang = next;
      try { opts.storage?.setItem(STORAGE_KEY, next); } catch { /* ignore */ }
      listeners.forEach((l) => l());
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    formatNumber(n, o) { return new Intl.NumberFormat(locale, o).format(n); },
    formatDate(ms, timeZone, o = { dateStyle: "medium" }) {
      return new Intl.DateTimeFormat(locale, { ...o, timeZone }).format(new Date(ms));
    },
  };
}
