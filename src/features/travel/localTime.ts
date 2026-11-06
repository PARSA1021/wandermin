/** Local wall-clock helpers for the cities' own time zones. */
function parts(at: number, timeZone: string) {
  const p = new Intl.DateTimeFormat("en-GB", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(at));
  const get = (t: string) => Number(p.find((x) => x.type === t)?.value ?? 0);
  return { y: get("year"), mo: get("month"), d: get("day"), h: get("hour"), mi: get("minute") };
}

/** Minutes the zone is ahead of UTC at that moment (daylight saving included). */
export function utcOffsetMinutes(timeZone: string, at: number): number {
  const p = parts(at, timeZone);
  const asUtc = Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi);
  return Math.round((asUtc - Math.floor(at / 60000) * 60000) / 60000);
}

/** "22:05" in that zone. */
export function localClock(at: number, timeZone: string): string {
  const p = parts(at, timeZone);
  return `${String(p.h).padStart(2, "0")}:${String(p.mi).padStart(2, "0")}`;
}

/** "2026.11.05" in that zone. */
export function localDate(at: number, timeZone: string): string {
  const p = parts(at, timeZone);
  return `${p.y}.${String(p.mo).padStart(2, "0")}.${String(p.d).padStart(2, "0")}`;
}

/** Hours (may be fractional, e.g. 5.5 for India) the city is ahead of the traveller; negative when behind. */
export function hoursAhead(cityZone: string, homeZone: string, at: number): number {
  return (utcOffsetMinutes(cityZone, at) - utcOffsetMinutes(homeZone, at)) / 60;
}
