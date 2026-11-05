/**
 * Boarding pass: one ticket per flight leg, used twice.
 *  - "boarding": issued when the leg starts (first focus session on it)
 *  - "in-flight": the route bar fills as sessions complete
 *  - "arrived": an ARRIVED stamp lands and the stub tears off along the perforation
 * Rendered with the same pixel engine and bitmap fonts as the postcards.
 */
import { getCity } from "@/data";
import { legDistanceKm } from "@/features/travel/graph";
import { getScene } from "@/features/postcards/scenes";
import { SCENE_H, SCENE_W } from "@/features/postcards/template";
import { PixelCanvas, rng, type Color } from "@/features/postcards/pixel/canvas";
import { FONT_3x5, FONT_5x7, drawText, measureText } from "@/features/postcards/pixel/font";

export type PassState = "boarding" | "in-flight" | "arrived";

export interface BoardingPassInput {
  fromId: string;
  toId: string;
  /** When the leg was boarded (start of its first session), epoch ms. */
  boardedAt: number;
  /** Focus minutes flown on this leg so far. */
  minutesFlown: number;
  /** km per focus minute in force for this leg. */
  kmPerMinute: number;
  /** Sessions completed on this leg so far. */
  sessions: number;
  /** Set once the leg is complete. */
  arrivedAt?: number;
  timeZone: string;
}

export interface BoardingPassContent {
  state: PassState;
  toId: string;
  flight: string;
  seat: string;
  from: { code: string; name: string };
  to: { code: string; name: string };
  date: string; // MM.DD
  year: string;
  boarding: string; // HH:MM
  arrived?: string; // HH:MM
  km: number;
  focusMinutes: number; // minutes needed for the whole leg
  progress: number; // 0..1
  sessions: number;
}

const hash = (s: string) => [...s].reduce((h, ch) => (Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0), 2166136261);

function clock(ms: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(ms));
  const p = (t: string) => parts.find((x) => x.type === t)?.value ?? "";
  return { date: `${p("month")}.${p("day")}`, year: p("year"), time: `${p("hour")}:${p("minute")}` };
}

export function buildBoardingPass(input: BoardingPassInput): BoardingPassContent {
  const from = getCity(input.fromId), to = getCity(input.toId);
  const km = legDistanceKm(from.id, to.id);
  const focusMinutes = km / input.kmPerMinute;
  const progress = Math.min(1, (input.minutesFlown * input.kmPerMinute) / km);
  const state: PassState = input.arrivedAt !== undefined ? "arrived" : input.sessions > 0 || input.minutesFlown > 0 ? "in-flight" : "boarding";
  // the seat belongs to the flight, so it never changes between the live, preview and stored pass
  const h = hash(`seat|${from.code}|${to.code}`);
  const b = clock(input.boardedAt, input.timeZone);
  return {
    state,
    toId: to.id,
    flight: `WM ${100 + (hash(from.code + to.code) % 900)}`,
    seat: `${1 + (h % 38)}${"ABCDEF"[(h >>> 8) % 6]}`,
    from: { code: from.code, name: from.name.en },
    to: { code: to.code, name: to.name.en },
    date: b.date,
    year: b.year,
    boarding: b.time,
    arrived: input.arrivedAt !== undefined ? clock(input.arrivedAt, input.timeZone).time : undefined,
    km: Math.round(km),
    focusMinutes: Math.ceil(focusMinutes),
    progress: state === "arrived" ? 1 : progress,
    sessions: input.sessions,
  };
}

/* ------------------------------------------------------------------ */

export const PASS_W = 252;
export const PASS_H = 100;
const BODY_W = 182; // printed area of the main coupon
const STUB_X = 186; // the perforation runs down x = STUB_X - 1
const STUB_W = 60;

const C = {
  paper: "#f4ecd8", paperShade: "#e4d8bc", edge: "#d2c29c",
  ink: "#283152", inkSoft: "#6f6b74", rule: "#d3c29e",
  frame: "#c9ccd4", frameDark: "#9aa0ae", glass: "#e9eef2",
  stamp: "#c0392b", ok: "#3d7a4f",
};

const fmt = (n: number) => n.toLocaleString("en-US");

function planeSprite(c: PixelCanvas, x: number, y: number, color: Color) {
  // 9 x 7 pixel airliner pointing right
  const rows = ["...#.....", "...##....", "#..###...", "#########", "#..###...", "...##....", "...#....."];
  rows.forEach((row, j) => [...row].forEach((bit, i) => { if (bit === "#") c.set(x + i, y + j, color); }));
}

function card(c: PixelCanvas, x0: number, x1: number, accent: Color) {
  c.rect(x0, 0, x1 - x0, PASS_H, C.paper);
  const r = rng(x0 + 7);
  for (let i = 0; i < (x1 - x0) * PASS_H * 0.015; i++) c.set(x0 + Math.floor(r() * (x1 - x0)), Math.floor(r() * PASS_H), C.paperShade);
  c.rect(x0, 0, x1 - x0, 13, accent);
  c.hline(x0, x1 - 1, PASS_H - 1, C.edge);
}

/**
 * Destination view through an aircraft window: the city's postcard scene at half scale
 * (every other pixel), centred on the scene's landmark, so the whole view stays recognisable.
 */
function windowView(c: PixelCanvas, toId: string, x: number, y: number, w: number, h: number) {
  const scene = getScene(toId);
  c.rect(x - 2, y - 2, w + 4, h + 4, C.frameDark);
  c.rect(x - 1, y - 1, w + 2, h + 2, C.frame);
  if (scene) {
    const art = new PixelCanvas(SCENE_W, SCENE_H);
    scene.draw(art);
    const [fx, fy] = scene.windowFocus ?? [SCENE_W / 2, SCENE_H / 2];
    const sx = Math.max(0, Math.min(SCENE_W - w * 2, Math.round(fx - w)));
    const sy = Math.max(0, Math.min(SCENE_H - h * 2, Math.round(fy - h)));
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) c.set(x + i, y + j, art.get(sx + i * 2, sy + j * 2));
  } else c.rect(x, y, w, h, C.glass);
  for (const [cx, cy] of [[x, y], [x + w - 1, y], [x, y + h - 1], [x + w - 1, y + h - 1]] as const) {
    c.set(cx, cy, C.frame);
    c.set(cx + (cx === x ? 1 : -1), cy, C.frame);
    c.set(cx, cy + (cy === y ? 1 : -1), C.frame);
  }
  for (let k = 0; k < 5; k++) c.set(x + 2 + k, y + 2 + k, C.glass);
}

function label(c: PixelCanvas, x: number, y: number, title: string, value: string) {
  drawText(c, title, x, y, { font: FONT_3x5, color: C.inkSoft });
  drawText(c, value, x, y + 7, { font: FONT_5x7, color: C.ink });
}

function arrivedStamp(c: PixelCanvas, cx: number, cy: number, p: BoardingPassContent) {
  const r = rng(91);
  // the stamp's pressed area hides the dashed route underneath
  c.disc(cx, cy, 15.5, C.paper);
  for (const rad of [17, 15.5]) for (let a = 0; a < 360; a += 2) {
    if (r() < 0.1) continue;
    const t = (a * Math.PI) / 180;
    c.set(Math.round(cx + Math.cos(t) * rad), Math.round(cy + Math.sin(t) * rad), C.stamp);
  }
  const lines = ["ARRIVED", p.to.code, p.arrived ?? ""];
  lines.forEach((text, i) => {
    const w = measureText(text, FONT_3x5);
    drawText(c, text, Math.round(cx - w / 2), cy - 8 + i * 6, { font: FONT_3x5, color: C.stamp });
  });
}

export function composeBoardingPass(p: BoardingPassContent, accent: Color): PixelCanvas {
  const c = new PixelCanvas(PASS_W, PASS_H);
  const torn = p.state === "arrived";
  const stubShift = torn ? 6 : 0;
  const stubDrop = torn ? 2 : 0;

  // body
  card(c, 0, STUB_X, accent);
  drawText(c, "WANDERMIN AIR", 8, 3, { font: FONT_5x7, color: C.paper });
  const bp = "BOARDING PASS";
  drawText(c, bp, BODY_W - 6 - measureText(bp, FONT_3x5), 5, { font: FONT_3x5, color: C.paper });

  // route: big codes, dashed arc, plane placed by progress
  drawText(c, p.from.code, 10, 20, { font: FONT_5x7, scale: 3, color: C.ink });
  const toW = measureText(p.to.code, FONT_5x7, 3);
  drawText(c, p.to.code, BODY_W - 8 - toW, 20, { font: FONT_5x7, scale: 3, color: C.ink });
  const rx0 = 66, rx1 = BODY_W - 14 - toW, ry = 30;
  for (let x = rx0; x <= rx1; x++) {
    const y = Math.round(ry - Math.sin((Math.PI * (x - rx0)) / (rx1 - rx0)) * 5);
    const flown = x <= rx0 + (rx1 - rx0) * p.progress;
    if (flown || x % 3 === 0) c.set(x, y, flown ? accent : C.inkSoft);
  }
  const px = Math.round(rx0 + (rx1 - rx0) * p.progress) - 4;
  const py = Math.round(ry - Math.sin(Math.PI * Math.min(1, Math.max(0, p.progress))) * 5) - 3;
  planeSprite(c, Math.min(rx1 - 8, Math.max(rx0, px)), py, C.ink);
  drawText(c, p.from.name, 10, 44, { font: FONT_3x5, color: C.inkSoft });
  drawText(c, p.to.name, BODY_W - 8 - measureText(p.to.name, FONT_3x5), 44, { font: FONT_3x5, color: C.inkSoft });
  if (!torn) {
    // a short leg can be fully flown before the session ends; arrival is recorded when it does
    const status = p.state === "boarding" ? "NOW BOARDING" : p.progress >= 1 ? "LANDING" : `IN FLIGHT ${Math.round(p.progress * 100)}%`;
    const sw = measureText(status, FONT_3x5);
    drawText(c, status, Math.round((rx0 + rx1) / 2 - sw / 2), 38, { font: FONT_3x5, color: C.ok });
  }

  // fields
  for (let x = 10; x < BODY_W - 6; x += 2) c.set(x, 51, C.rule);
  label(c, 10, 55, "FLIGHT", p.flight);
  label(c, 66, 55, "DATE", p.date);
  label(c, 122, 55, "BOARDING", p.boarding);
  label(c, 10, 73, "SEAT", p.seat);
  label(c, 66, 73, "DISTANCE", `${fmt(p.km)} KM`);
  label(c, 122, 73, "FOCUS", `${p.focusMinutes} MIN`);

  // progress bar with one notch per completed session
  const bx0 = 10, bx1 = 150, by = 91;
  c.rect(bx0, by, bx1 - bx0, 3, C.rule);
  c.rect(bx0, by, Math.round((bx1 - bx0) * p.progress), 3, accent);
  for (let k = 1; k <= p.sessions; k++) {
    const nx = bx0 + Math.round(((bx1 - bx0) * p.progress * k) / Math.max(1, p.sessions));
    c.set(Math.min(bx1 - 1, nx), by - 1, C.ink);
  }
  const pct = `${Math.round(p.progress * 100)}%`;
  drawText(c, pct, BODY_W - 6 - measureText(pct, FONT_3x5), by - 1, { font: FONT_3x5, color: C.ink });

  // perforation (or torn edge)
  const r = rng(17);
  for (let y = 0; y < PASS_H; y++) {
    if (torn) {
      const bite = Math.floor(r() * 3);
      for (let k = 0; k < bite; k++) c.set(STUB_X - 1 - k, y, null);
    }
  }

  // stub
  const sx = STUB_X + stubShift;
  const stub = new PixelCanvas(STUB_W, PASS_H);
  card(stub, 0, stub.width, accent);
  drawText(stub, p.flight, Math.round((stub.width - measureText(p.flight, FONT_3x5)) / 2), 5, { font: FONT_3x5, color: C.paper });
  windowView(stub, p.toId, 15, 19, 30, 32);
  const leg = `${p.from.code} → ${p.to.code}`;
  drawText(stub, leg, Math.round((stub.width - measureText(leg, FONT_3x5)) / 2), 58, { font: FONT_3x5, color: C.ink });
  const seat = `SEAT ${p.seat}`;
  drawText(stub, seat, Math.round((stub.width - measureText(seat, FONT_3x5)) / 2), 65, { font: FONT_3x5, color: C.inkSoft });
  // decorative barcode derived from the flight
  const bars = hash(`${p.flight}${p.seat}${p.date}`);
  for (let i = 0; i < 40; i++) if ((bars >>> (i % 31)) & 1 || i % 7 === 0) stub.rect(10 + i, 73, 1, 12, C.ink);
  if (torn) {
    for (let y = 0; y < PASS_H; y++) { const bite = Math.floor(r() * 3); for (let k = 0; k < bite; k++) stub.set(k, y, null); }
    const done = `ARRIVED ${p.arrived ?? ""}`.trim();
    drawText(stub, done, Math.round((stub.width - measureText(done, FONT_3x5)) / 2), 89, { font: FONT_3x5, color: C.stamp });
  }
  for (let y = 0; y < PASS_H; y++) for (let x = 0; x < stub.width; x++) {
    const col = stub.get(x, y);
    if (col && sx + x < PASS_W && y + stubDrop < PASS_H) c.set(sx + x, y + stubDrop, col);
  }
  // perforation dashes while the stub is still attached
  if (!torn) for (let y = 0; y < PASS_H; y++) if (y % 3 !== 2) c.set(STUB_X - 1, y, y < 13 ? C.paper : C.edge);
  // the arrival stamp lands in the open sky of the route, between the two city codes
  if (torn) arrivedStamp(c, Math.round((rx0 + rx1) / 2), 32, p);
  return c;
}

/** Accent for a pass: the destination scene's accent colour. */
export const passAccent = (toId: string): Color => getScene(toId)?.accent ?? "#283152";

export function renderBoardingPassSvg(p: BoardingPassContent, accent: Color, displayScale = 4): string {
  const pass = composeBoardingPass(p, accent);
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const title = `Boarding pass ${p.flight}, ${p.from.name} to ${p.to.name}`;
  const desc = p.state === "arrived"
    ? `Arrived ${p.year}.${p.date} at ${p.arrived}. ${p.km} km over ${p.sessions} focus sessions.`
    : `Boarding ${p.year}.${p.date} at ${p.boarding}, seat ${p.seat}. ${p.km} km, about ${p.focusMinutes} focus minutes. ${Math.round(p.progress * 100)}% flown.`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${PASS_W} ${PASS_H}" width="${PASS_W * displayScale}" height="${PASS_H * displayScale}" shape-rendering="crispEdges" role="img" aria-labelledby="bp-title bp-desc">` +
    `<title id="bp-title">${esc(title)}</title><desc id="bp-desc">${esc(desc)}</desc>` + pass.toSvgPaths() + `</svg>`;
}
