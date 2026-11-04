import { getCity, getCountry } from "@/data";
import { legDistanceKm } from "@/features/travel/graph";
import { PixelCanvas, rng, type Color } from "./pixel/canvas";
import { FONT_3x5, FONT_5x7, canPrint, drawText, measureText, normalizeForFont, type BitmapFont } from "./pixel/font";

/** Card is ~1.46:1 like a real 148×100 mm postcard. Units are art pixels. */
export const CARD_W = 240;
export const CARD_H = 164;
export const SCENE_X = 8;
export const SCENE_Y = 8;
export const SCENE_W = 224;
export const SCENE_H = 108;

export interface PostcardScene {
  cityId: string;
  /** Accent used for the title shadow, country label and stamp frame. */
  accent: Color;
  /** Draw the illustration into a SCENE_W × SCENE_H canvas. */
  draw(canvas: PixelCanvas): void;
  /** Small motif inside the postage stamp (art area 20 × 18). */
  drawStamp(canvas: PixelCanvas, x: number, y: number, w: number, h: number): void;
  /** Accessible description of the illustration (English; UI shows a localized one). */
  description: string;
  /** Postmark ink; use a light ink on dark (night) scenes. Defaults to navy. */
  postmarkInk?: Color;
  /** Point the boarding-pass window view centres on (scene pixels). Defaults to the centre. */
  windowFocus?: [number, number];
}

/** Everything printed on the card. Built from data, never typed by hand per city. */
export interface PostcardContent {
  title: string;
  countryLabel: string;
  cityCode: string;
  date: { year: string; month: string; day: string };
  focusMinutes: number;
  route: { fromName: string; toName: string; km: number };
}

export interface PostcardInput {
  cityId: string;
  fromId: string;
  arrivedAt: number;
  focusMinutesAtArrival: number;
  /** IANA zone used for the printed date, e.g. the user's "Asia/Seoul". */
  timeZone: string;
}

/** Postcards are printed in English like real souvenir cards; the app chrome around them is localized. */
export function buildPostcardContent(input: PostcardInput): PostcardContent {
  const city = getCity(input.cityId);
  const from = getCity(input.fromId);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: input.timeZone, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date(input.arrivedAt));
  const part = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return {
    title: city.name.en,
    countryLabel: getCountry(city.countryCode).postcardLabel,
    cityCode: city.code,
    date: { year: part("year"), month: part("month"), day: part("day") },
    focusMinutes: Math.round(input.focusMinutesAtArrival),
    route: { fromName: from.name.en, toName: city.name.en, km: Math.round(legDistanceKm(from.id, city.id)) },
  };
}

export const PAPER = {
  paper: "#efe3c6",
  speckle: "#e2d3b0",
  fleck: "#f6eedb",
  edge: "#d6c39b",
  ink: "#283152",
  inkSoft: "#6f6b74",
  rule: "#d3c29e",
  stampPaper: "#faf4e6",
};

const fmt = (n: number) => n.toLocaleString("en-US");

/** Pick the larger font if the text fits, otherwise the fine-print font. */
function fit(text: string, max: number, prefer: BitmapFont = FONT_5x7): BitmapFont {
  return measureText(text, prefer) <= max ? prefer : FONT_3x5;
}

export function composePostcard(content: PostcardContent, scene: PostcardScene): PixelCanvas {
  const c = new PixelCanvas(CARD_W, CARD_H);
  const r = rng(0x5eed ^ content.cityCode.charCodeAt(0) ^ (content.cityCode.charCodeAt(2) << 8));

  // Paper with rounded corners, speckle and a soft edge.
  c.rect(0, 0, CARD_W, CARD_H, PAPER.paper);
  for (let i = 0; i < CARD_W * CARD_H * 0.02; i++) c.set(Math.floor(r() * CARD_W), Math.floor(r() * CARD_H), r() < 0.7 ? PAPER.speckle : PAPER.fleck);
  c.hline(1, CARD_W - 2, CARD_H - 1, PAPER.edge);
  for (let y = 1; y < CARD_H - 1; y++) c.set(CARD_W - 1, y, PAPER.edge);
  for (const [x, y] of [[0, 0], [1, 0], [0, 1], [CARD_W - 1, 0], [CARD_W - 2, 0], [CARD_W - 1, 1],
    [0, CARD_H - 1], [1, CARD_H - 1], [0, CARD_H - 2], [CARD_W - 1, CARD_H - 1], [CARD_W - 2, CARD_H - 1], [CARD_W - 1, CARD_H - 2]] as const)
    c.set(x, y, null);

  // Illustration inside a thin ink frame.
  const art = new PixelCanvas(SCENE_W, SCENE_H);
  scene.draw(art);
  c.rect(SCENE_X - 1, SCENE_Y - 1, SCENE_W + 2, SCENE_H + 2, PAPER.ink);
  c.blit(art, SCENE_X, SCENE_Y);

  drawStamp(c, content, scene);
  drawPostmark(c, content, r, scene.postmarkInk ?? "#2f3a63");

  // Caption block under the picture.
  const left = SCENE_X + 2;
  const right = SCENE_X + SCENE_W - 2;
  const width = right - left;
  const rowA = SCENE_Y + SCENE_H + 5;

  // city-states (Singapore) would print their name twice; drop the country line then
  const country = normalizeForFont(content.countryLabel) === normalizeForFont(content.title) ? "" : normalizeForFont(content.countryLabel);
  const countryW = measureText(country, FONT_5x7);
  const title = normalizeForFont(content.title);
  const titleScale = measureText(title, FONT_5x7, 2) + countryW + 8 <= width ? 2 : 1;
  drawText(c, title, left, rowA, {
    font: FONT_5x7, scale: titleScale, color: PAPER.ink, shadow: { color: scene.accent, dx: 1, dy: 1 },
  });
  if (country) drawText(c, country, right - countryW, rowA + 7 * titleScale - 7, { font: FONT_5x7, color: scene.accent });

  const ruleY = rowA + 7 * 2 + 3;
  for (let x = left; x <= right; x += 2) c.set(x, ruleY, PAPER.rule);

  const rowB = ruleY + 3;
  const { year, month, day } = content.date;
  const arrivedLabel = "ARRIVED ", arrivedValue = `${year}.${month}.${day}`;
  const focusLabel = "TOTAL FOCUS ", focusValue = `${fmt(content.focusMinutes)} MIN`;
  const lineB = `${arrivedLabel}${arrivedValue}  ${focusLabel}${focusValue}`;
  const fontB = fit(lineB, width);
  let x = left;
  x += drawText(c, arrivedLabel, x, rowB, { font: fontB, color: PAPER.inkSoft });
  drawText(c, arrivedValue, x, rowB, { font: fontB, color: PAPER.ink });
  const focusW = measureText(focusLabel + focusValue, fontB);
  x = right - focusW;
  x += drawText(c, focusLabel, x, rowB, { font: fontB, color: PAPER.inkSoft });
  drawText(c, focusValue, x, rowB, { font: fontB, color: PAPER.ink });

  const rowC = rowB + fontB.height + 4;
  const route = `${content.route.fromName} → ${content.route.toName} · ${fmt(content.route.km)} KM`;
  drawText(c, canPrint(route, FONT_3x5) ? route : `${content.cityCode}`, left, rowC, { font: FONT_3x5, color: PAPER.inkSoft });
  const brand = "WANDERMIN";
  drawText(c, brand, right - measureText(brand, FONT_3x5), rowC, { font: FONT_3x5, color: scene.accent });
  return c;
}

function drawStamp(c: PixelCanvas, content: PostcardContent, scene: PostcardScene) {
  const w = 26, h = 32;
  const x0 = SCENE_X + SCENE_W - w - 6, y0 = SCENE_Y + 4;
  // perforations: every other edge pixel shows whatever lies beneath the stamp
  const holes: [number, number][] = [];
  for (let i = 0; i < w; i += 2) holes.push([x0 + i, y0], [x0 + i, y0 + h - 1]);
  for (let j = 2; j < h - 2; j += 2) holes.push([x0, y0 + j], [x0 + w - 1, y0 + j]);
  const under = holes.map(([x, y]) => c.get(x, y));
  c.rect(x0 + 1, y0 + 1, w, h, "#3b456a"); // hard shadow
  c.rect(x0, y0, w, h, PAPER.stampPaper);
  holes.forEach(([x, y], i) => c.set(x, y, under[i] ?? null));
  // frame + art
  const ax = x0 + 3, ay = y0 + 3, aw = w - 6, ah = h - 12;
  c.rect(ax - 1, ay - 1, aw + 2, ah + 2, scene.accent);
  scene.drawStamp(c, ax, ay, aw, ah);
  const code = content.cityCode;
  drawText(c, code, x0 + Math.floor((w - measureText(code, FONT_3x5)) / 2), y0 + h - 7, { font: FONT_3x5, color: PAPER.ink });
}

function drawPostmark(c: PixelCanvas, content: PostcardContent, r: () => number, ink: Color) {
  const cx = SCENE_X + SCENE_W - 34, cy = SCENE_Y + 45, rad = 11.5;
  for (let a = 0; a < 360; a += 2.5) {
    if (r() < 0.12) continue; // worn ink
    const t = (a * Math.PI) / 180;
    c.set(Math.round(cx + Math.cos(t) * rad), Math.round(cy + Math.sin(t) * rad), ink);
  }
  const lines = [content.cityCode, `${content.date.month}.${content.date.day}`, content.date.year];
  lines.forEach((text, i) => {
    const tw = measureText(text, FONT_3x5);
    drawText(c, text, Math.round(cx - tw / 2), Math.round(cy - 8 + i * 6), { font: FONT_3x5, color: ink });
  });
  // cancellation waves to the right of the ring, clear of the illustration's subject
  for (let k = 0; k < 3; k++)
    for (let x = cx + rad + 2; x < SCENE_X + SCENE_W - 3; x++)
      if (r() > 0.1) c.set(x, Math.round(cy - 4 + k * 4 + Math.sin(x / 2.2) * 1.2), ink);
}

/** Render the finished card as a standalone, accessible SVG string. */
export function renderPostcardSvg(content: PostcardContent, scene: PostcardScene, displayScale = 4): string {
  const card = composePostcard(content, scene);
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
  const title = `${content.title}, ${content.countryLabel}`;
  const desc = `${scene.description} Arrived ${content.date.year}-${content.date.month}-${content.date.day}. ` +
    `Total focus ${content.focusMinutes} minutes. ${content.route.fromName} to ${content.route.toName}, ${content.route.km} km.`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CARD_W} ${CARD_H}" width="${CARD_W * displayScale}" height="${CARD_H * displayScale}" shape-rendering="crispEdges" role="img" aria-labelledby="pc-title pc-desc">` +
    `<title id="pc-title">${esc(title)}</title><desc id="pc-desc">${esc(desc)}</desc>` +
    card.toSvgPaths() + `</svg>`;
}
