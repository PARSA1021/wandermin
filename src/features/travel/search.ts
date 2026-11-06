import { CITIES, getCountry, type City } from "@/data";

/**
 * Find cities by what a traveller might type: the city's name in any language, its airport-style code,
 * its country or its landmark. Korean initial consonants work too ("ㅍㄹ" → 파리). Case, spaces and
 * accents are ignored ("reykjavik" → Reykjavík).
 */
const CHOSUNG = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
const COMBINING_MARKS = new RegExp("[\\u0300-\\u036f]", "g");
const strip = (s: string) => s.toLowerCase().replace(/[\s\-·.'’]/g, "");
/** Accents come off Latin letters (NFKD); Hangul is recomposed (NFC) so syllables stay whole. */
const norm = (s: string) => strip(s.normalize("NFKD").replace(COMBINING_MARKS, "").normalize("NFC"));
const chosung = (s: string) => [...s].map((ch) => {
  const c = ch.charCodeAt(0);
  return c >= 0xac00 && c <= 0xd7a3 ? CHOSUNG[Math.floor((c - 0xac00) / 588)] : ch;
}).join("");
const isChosungOnly = (s: string) => s.length > 0 && [...s].every((ch) => CHOSUNG.includes(ch));

interface Entry { city: City; names: string[]; extra: string[]; initials: string[] }
let index: Entry[] | null = null;
function entries(): Entry[] {
  if (index) return index;
  index = CITIES.map((city) => {
    const country = getCountry(city.countryCode);
    return {
      city,
      names: Object.values(city.name).map(norm),
      extra: [city.code, ...Object.values(country.name), ...Object.values(city.landmark.name)].map(norm),
      initials: [city.name.ko, country.name.ko].filter(Boolean).map((s) => chosung(strip(s!))),
    };
  });
  return index;
}

export function searchCities(query: string, opts: { exclude?: string; limit?: number } = {}): City[] {
  const q = norm(query);
  const raw = strip(query);
  if (!q) return [];
  const initialsOnly = isChosungOnly(raw);
  const scored: { city: City; score: number }[] = [];
  for (const e of entries()) {
    if (e.city.id === opts.exclude) continue;
    let score = 0;
    if (initialsOnly) score = e.initials.some((s) => s.startsWith(raw)) ? 3 : e.initials.some((s) => s.includes(raw)) ? 1 : 0;
    else if (e.names.some((n) => n === q)) score = 5;
    else if (e.names.some((n) => n.startsWith(q))) score = 4;
    else if (e.names.some((n) => n.includes(q))) score = 3;
    else if (e.extra.some((n) => n.startsWith(q))) score = 2;
    else if (q.length >= 2 && e.extra.some((n) => n.includes(q))) score = 1;
    if (score) scored.push({ city: e.city, score });
  }
  return scored.sort((a, b) => b.score - a.score || norm(a.city.name.en).localeCompare(norm(b.city.name.en)))
    .slice(0, opts.limit ?? 6).map((s) => s.city);
}
