import { describe, expect, it, vi } from "vitest";
import { createI18n, formatMessage, matchLocale, pickLocalized, resolveInitialLocale, SUPPORTED_LOCALES, type MessageKey } from "@/i18n";
import { MESSAGES } from "@/i18n/messages";
import { CITIES } from "@/data";

const leaves = (o: object, p = ""): string[] =>
  Object.entries(o).flatMap(([k, v]) => (typeof v === "string" ? [`${p}${k}`] : leaves(v, `${p}${k}.`)));
const placeholders = (s: string) => [...s.matchAll(/\{\s*([a-zA-Z]+)/g)].map((m) => m[1]).sort();
const get = (o: object, key: string) => key.split(".").reduce<any>((n, k) => n?.[k], o) as string;

describe("message resources", () => {
  const enKeys = leaves(MESSAGES.en).sort();
  it.each(SUPPORTED_LOCALES)("%s has exactly the same keys as en", (l) => {
    expect(leaves(MESSAGES[l]).sort()).toEqual(enKeys);
  });
  it.each(SUPPORTED_LOCALES)("%s uses the same placeholders as en", (l) => {
    for (const k of enKeys) expect(placeholders(get(MESSAGES[l], k)), `${l}:${k}`).toEqual(placeholders(get(MESSAGES.en, k)));
  });
  it.each(SUPPORTED_LOCALES)("%s has no empty strings", (l) => {
    for (const k of enKeys) expect(get(MESSAGES[l], k).trim().length, `${l}:${k}`).toBeGreaterThan(0);
  });
});

describe("i18n runtime", () => {
  it("shows the agreed name and slogans", () => {
    const i = createI18n({ initial: "ko" });
    expect(i.t("app.name")).toBe("WANDERMIN");
    expect(i.t("app.slogan")).toBe("매 순간, 새로운 세상으로.");
    i.setLocale("en");
    expect(i.t("app.slogan")).toBe("Every Minute Takes You Somewhere.");
  });

  it("switches language in place: notifies subscribers, updates <html lang>, persists", () => {
    const root = { lang: "" };
    const store = new Map<string, string>();
    const storage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) };
    const i = createI18n({ initial: "en", root, storage });
    const listener = vi.fn();
    const off = i.subscribe(listener);
    expect(i.t("nav.journal")).toBe("Postcards");
    i.setLocale("ja");
    expect(listener).toHaveBeenCalledTimes(1);
    expect(i.t("nav.journal")).toBe("ポストカード");
    expect(root.lang).toBe("ja");
    expect(resolveInitialLocale({ storage })).toBe("ja");
    i.setLocale("ja"); // no-op
    expect(listener).toHaveBeenCalledTimes(1);
    off();
    i.setLocale("ko");
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("interpolates and pluralises per locale", () => {
    expect(formatMessage(MESSAGES.en.timer.duration, { count: 1 }, "en")).toBe("1 minute");
    expect(formatMessage(MESSAGES.en.timer.duration, { count: 25 }, "en")).toBe("25 minutes");
    expect(createI18n({ initial: "ko" }).t("travel.remaining", { km: 1149, city: "도쿄" })).toBe("도쿄까지 1,149km");
    expect(createI18n({ initial: "en" }).t("home.todayFocus", { minutes: 1240 })).toBe("Today: 1,240 minutes of focus");
  });

  it("matches browser languages and falls back to English", () => {
    expect(matchLocale(["ja-JP", "en"])).toBe("ja");
    expect(matchLocale(["ko-KR"])).toBe("ko");
    expect(matchLocale(["zh-TW", "fr"])).toBe("en");
  });

  it("survives blocked storage", () => {
    const storage = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } };
    const i = createI18n({ storage, languages: ["ko"] });
    expect(i.locale).toBe("ko");
    expect(() => i.setLocale("en")).not.toThrow();
  });

  it("returns the key for an unknown message instead of crashing", () => {
    expect(createI18n({ initial: "en" }).t("nope.missing" as MessageKey)).toBe("nope.missing");
  });

  it("localized data names fall back to English for planned locales", () => {
    const tokyo = CITIES.find((c) => c.id === "tokyo")!;
    expect(pickLocalized(tokyo.name, "ja")).toBe("東京");
    expect(pickLocalized(tokyo.name, "zh-Hant")).toBe("Tokyo");
    expect(pickLocalized({ en: "Tokyo", "zh-Hans": "东京" }, "zh-Hant")).toBe("东京");
  });
});
