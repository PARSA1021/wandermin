import { bayer, rng, type PixelCanvas } from "../pixel/canvas";
import type { PostcardScene } from "../template";
import { W, birds, leaf, sky } from "./common";

/** Athens at sunset: the Parthenon on the Acropolis rock, Lycabettus, white Plaka houses, olive trees. */
const P = {
  sky: ["#4a5a9a", "#8a7ab0", "#e09a90", "#f4b880", "#f8d8a0"],
  sun: "#fbe0a0", sunCore: "#fff2cc",
  hill: "#8a7a8a", hillDark: "#6f6278", chapel: "#f3ece0",
  rock: "#c8a078", rockShade: "#a07a58", rockDark: "#7a5a40", rockLight: "#e0bc90",
  marble: "#f0dcb8", marbleShade: "#c8ac84", marbleDeep: "#a08660", marbleLight: "#fbeed0", gap: "#6a5a5a",
  wall: "#d8b48a", wallShade: "#b08c64",
  house: "#f3ece0", houseShade: "#d8cfbe", houseWarm: "#f6d8b0", roof: "#c8643a", roofDark: "#9a4a2a", door: "#3a6ab0", shutter: "#2f7a5a",
  olive: "#7a8a5a", oliveLight: "#9aa874", oliveDark: "#5a6a44", trunk: "#6a5a4a",
  pine: "#3f5a3a", pineLight: "#5a7a4a",
  bougainvillea: "#d83a8a",
};

function lycabettus(c: PixelCanvas) {
  c.paint((x, y) => {
    const t = 30 + Math.pow(Math.abs(x - 196) / 18, 1.6) * 12;
    return y >= t && y < 64 ? (leaf(x, y) < 0.2 ? P.hillDark : P.hill) : null;
  }, 150, 26, W - 1, 64);
  c.rect(195, 27, 3, 3, P.chapel); c.set(196, 26, P.chapel);
  c.paint((x, y) => {
    const t = 52 + 4 * Math.sin(x / 17);
    return y >= t && y < 64 ? P.hillDark : null;
  }, 0, 46, W - 1, 64);
}

function acropolis(c: PixelCanvas) {
  // the limestone rock: steep cliffs with ledges, the fortification wall along its crest
  c.paint((x, y) => {
    const dx = x - 92;
    const t = 44 + Math.max(0, Math.abs(dx) - 52) * 0.9 + Math.sin(x / 4) * 0.6;
    if (Math.abs(dx) > 92 || y < t || y > 74) return null;
    const d = y - t;
    if (d < 4) return (x % 5 === 0) ? P.wallShade : P.wall; // the wall
    const ledge = Math.round(y + Math.sin(x / 6) * 2) % 6 === 0;
    const l = leaf(x, y);
    if (ledge) return P.rockDark;
    return dx > 30 ? (l < 0.4 ? P.rockDark : P.rockShade) : l < 0.18 ? P.rockLight : l > 0.8 ? P.rockShade : P.rock;
  }, 0, 40, 190, 74);
}

function parthenon(c: PixelCanvas) {
  // Doric temple: stepped stylobate, a colonnade of fluted columns, architrave and frieze, the broken pediment
  const x0 = 58, x1 = 128, base = 44;
  for (let k = 0; k < 3; k++) c.hline(x0 - 3 + k, x1 + 3 - k, base - k, k === 0 ? P.marbleShade : P.marble);
  const colTop = 24;
  for (let x = x0; x <= x1; x += 5) {
    const ruined = x > 104 && x < 116; // gap left by the 1687 explosion
    const top = ruined ? colTop + 10 + (x % 3) * 2 : colTop;
    c.rect(x, top, 3, base - 2 - top, P.marble);
    c.set(x + 2, top, P.marbleShade);
    for (let y = top; y < base - 2; y++) c.set(x + 2, y, P.marbleShade); // fluting shadow
    c.hline(x - 1, x + 3, top, P.marbleLight); // capital
  }
  // the cella wall glimpsed between columns, in shadow
  for (let x = x0 + 3; x < x1; x += 5) for (let y = colTop + 2; y < base - 2; y++) if (bayer(x, y) < 0.5) c.set(x + 1, y, P.marbleDeep);
  // entablature, interrupted over the gap
  for (let x = x0 - 2; x <= x1 + 2; x++) {
    if (x > 103 && x < 117) continue;
    c.set(x, colTop - 1, P.marbleShade);
    c.set(x, colTop - 2, P.marble);
    c.set(x, colTop - 3, (x % 4 < 2) ? P.marbleDeep : P.marble); // triglyphs
    c.set(x, colTop - 4, P.marbleLight);
  }
  // west pediment, partly preserved at the left end
  for (let k = 0; k < 6; k++) c.hline(x0 - 1 + k * 2, x0 + 22 - k * 2, colTop - 5 - k, k === 0 ? P.marbleShade : P.marble);
  // a crane — the restoration is forever in progress
  c.rect(136, 8, 1, 36, P.gap);
  c.hline(120, 148, 8, P.gap);
  c.rect(130, 9, 1, 6, P.gap);
}

function erechtheion(c: PixelCanvas) {
  const x = 140, base = 44;
  c.rect(x, 32, 16, base - 32, P.marble);
  c.rect(x + 12, 32, 4, base - 32, P.marbleShade);
  for (let i = x + 2; i < x + 12; i += 3) c.rect(i, 34, 1, 9, P.marbleDeep);
  c.hline(x - 1, x + 16, 31, P.marbleLight);
}

function plaka(c: PixelCanvas) {
  // the old neighbourhood at the foot of the rock: whitewashed cubes with terracotta roofs
  const r = rng(212);
  for (let row = 0; row < 3; row++) {
    const base = 80 + row * 9;
    for (let x = -4 + row * 3; x < W; x += 9 + Math.floor(r() * 5)) {
      const w = 8 + Math.floor(r() * 5), h = 8 + Math.floor(r() * 4);
      const col = r() < 0.25 ? P.houseWarm : P.house;
      c.rect(x, base - h, w, h, col);
      c.rect(x + w - 2, base - h, 2, h, P.houseShade);
      if (r() < 0.6) for (let k = 0; k < 3; k++) c.hline(x - 1 + k, x + w - k, base - h - 1 - k, k === 0 ? P.roofDark : P.roof);
      c.rect(x + 2, base - h + 3, 2, 3, r() < 0.5 ? P.shutter : P.door);
      if (w > 9) c.rect(x + 6, base - h + 3, 2, 3, P.shutter);
      if (r() < 0.3) for (let k = 0; k < 5; k++) c.set(x + w - 3 + (k % 2), base - h + 1 + k, P.bougainvillea);
    }
  }
}

function olive(c: PixelCanvas, x: number, base: number, size: number) {
  // gnarled twin trunk, silvery-green rounded crown
  c.line(x, base, x - 1, base - size, P.trunk);
  c.line(x + 1, base, x + 3, base - size + 1, P.trunk);
  c.disc(x + 1, base - size - 3, size * 0.55 + 2, P.olive);
  c.disc(x - 2, base - size - 1, size * 0.4 + 1, P.olive);
  c.disc(x + 4, base - size - 1, size * 0.4 + 1, P.oliveDark);
  for (let i = -size; i <= size; i++) for (let j = -size; j <= 0; j++) if (bayer(x + i, base - size + j) < 0.15 && c.get(x + i, base - size - 3 + j) === P.olive) c.set(x + i, base - size - 3 + j, P.oliveLight);
}

export const athensScene: PostcardScene = {
  cityId: "athens",
  accent: "#2f6ab0",
  windowFocus: [92, 34],
  description: "Pixel-art view of Athens at sunset: the Parthenon's Doric colonnade with its broken pediment and gap from 1687 on top of the Acropolis rock and its walls, the Erechtheion beside it and a restoration crane, Lycabettus Hill with its white chapel, whitewashed Plaka houses with terracotta roofs and bougainvillea, and silvery olive trees.",
  draw(c) {
    sky(c, P.sky, 64);
    c.disc(176, 48, 9, P.sun); c.disc(176, 48, 5, P.sunCore);
    birds(c, 31, 20, 8, 60, 22, 5, "#5a4a6a");
    lycabettus(c);
    acropolis(c);
    parthenon(c);
    erechtheion(c);
    c.paint((x, y) => (y > 74 ? (leaf(x, y) < 0.3 ? P.pineLight : P.pine) : null), 0, 70, W - 1, 80);
    plaka(c);
    for (const [x, b, s] of [[8, 108, 7], [38, 108, 5], [196, 108, 8], [218, 106, 5]] as const) olive(c, x, b, s);
  },
  drawStamp(c, x, y, w, h) {
    c.gradient(y, y + h - 1, [P.sky[1]!, P.sky[3]!], x, x + w - 1);
    const base = y + h - 4;
    c.rect(x, base, w, 4, P.rock);
    c.hline(x + 2, x + w - 3, base - 1, P.marble);
    for (let i = x + 3; i < x + w - 3; i += 3) c.rect(i, base - 8, 1, 7, P.marble);
    c.hline(x + 2, x + w - 3, base - 9, P.marble);
    for (let k = 0; k < 3; k++) c.hline(x + 4 + k * 2, x + w - 5 - k * 2, base - 10 - k, P.marble);
  },
};
