import citiesFile from "./cities.json";
import countriesFile from "./countries.json";
import routesFile from "./routes.json";
import type { LocalizedText } from "@/i18n/config";

export type Region = "asia" | "europe" | "americas" | "oceania" | "africa";

export interface Landmark {
  id: string;
  name: LocalizedText;
  lat: number;
  lng: number;
}

export interface City {
  id: string;
  name: LocalizedText;
  /** ISO 3166-1 alpha-2 */
  countryCode: string;
  region: Region;
  lat: number;
  lng: number;
  /** Three-letter city code used on postmarks (IATA metropolitan code where one exists). */
  code: string;
  /** IANA time zone, for local times on passes, postcards and arrivals. */
  tz: string;
  /** Can be chosen as a starting point. */
  departure: boolean;
  landmark: Landmark;
}

export interface Country {
  code: string;
  name: LocalizedText;
  /** null where the place has no capital of its own (e.g. Hong Kong SAR). */
  capital: LocalizedText | null;
  /** Upper-case ASCII label printed on postcards. */
  postcardLabel: string;
}

export interface Leg {
  from: string;
  to: string;
}

export const CITIES: readonly City[] = citiesFile.cities as City[];
export const COUNTRIES: readonly Country[] = countriesFile.countries as Country[];
export const LEGS: readonly Leg[] = routesFile.legs;

const cityById = new Map(CITIES.map((c) => [c.id, c]));
const countryByCode = new Map(COUNTRIES.map((c) => [c.code, c]));

export function getCity(id: string): City {
  const city = cityById.get(id);
  if (!city) throw new Error(`Unknown city: ${id}`);
  return city;
}

export function getCountry(code: string): Country {
  const country = countryByCode.get(code);
  if (!country) throw new Error(`Unknown country: ${code}`);
  return country;
}

export const DEPARTURE_CITIES: readonly City[] = CITIES.filter((c) => c.departure);
