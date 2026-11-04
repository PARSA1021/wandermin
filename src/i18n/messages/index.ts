import en from "./en.json";
import ko from "./ko.json";
import ja from "./ja.json";
import type { Locale } from "../config";

export type Messages = typeof en;

/** Register each supported locale here. TypeScript rejects a file whose keys differ from en. */
export const MESSAGES: Record<Locale, Messages> = { en, ko, ja };

type Leaves<T, P extends string = ""> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Leaves<T[K], `${P}${K}.`>;
}[keyof T & string];

/** Every valid message key, e.g. "nav.home" or "timer.activity.reading". */
export type MessageKey = Leaves<Messages>;
