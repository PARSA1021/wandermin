import { bayer, rng, type PixelCanvas } from "../pixel/canvas";
import type { PostcardScene } from "../template";
import { W, H, birds, people, ridge, sky, townhouses, water, type TownhouseStyle } from "./common";

/** San Francisco: the Golden Gate Bridge in rolling fog, Marin headlands, sailboats, Painted Ladies and a cable car. */
const P = {
  sky: ["#5f84b4", "#7fa0c6", "#a8c0d8", "#d4dee4", "#ece9e0"],
  fog: "#f1f0ea", fogShade: "#d9dde2",
  headland: "#8a8a5e", headlandDark: "#6f7450", headlandLight: "#a3a06e",
  orange: "#c8502e", orangeDark: "#93391f", orangeLight: "#e07a4a", cable: "#a8442a",
  water: "#4f7894", waterLight: "#a3bfd0", waterDark: "#3b6078",
  sail: "#f6f3ea", sailShade: "#d6d2c6", hull: "#2f3a63",
  street: "#8a8a8a", streetLight: "#a8a8a8", rail: "#5a5a5a",
  carRed: "#b8322a", carCream: "#efe2c4", carWindow: "#3d4560", carGold: "#d8b04a",
  coats: ["#2f3346", "#c8502e", "#3a5a9a", "#e2b84a", "#f3ead8"],
};

const PAINTED_LADIES: TownhouseStyle = {
  facades: ["#e9a8b8", "#9fc6d6", "#f2d38a", "#b8d6a6", "#d6b8e0", "#f3ead8"],
  shade: "#8a7a8a", window: "#3d4560", sill: "#f8f4ec",
  roof: "gable", roofColor: "#5a4a5e", roofDark: "#3d3346", door: "#3d3346",
  widths: [11, 13], heights: [16, 20], floorH: 5,
};

function headlands(c: PixelCanvas) {
  ridge(c, (x) => 54 - Math.max(0, 12 - Math.abs(x - 30) * 0.25) + 3 * Math.sin(x / 11) + Math.sin(x / 3.5), P.headland, P.headlandLight, P.headlandDark, 0.2);
  // fog spilling over the ridge in soft rolls
  c.paint((x, y) => {
    const top = 50 + 4 * Math.sin(x / 16) + 2 * Math.sin(x / 5);
    if (y < top || y > 66 + Math.sin(x / 9) * 3) return null;
    return bayer(x, y) < 0.3 ? P.fogShade : P.fog;
  }, 0, 44, 140, 72);
}

function goldenGate(c: PixelCanvas) {
  const deck = 74, t1 = 52, t2 = 158, top = 22;
  water(c, 76, P.water, P.waterLight, P.waterDark, 321);
  // suspension cables: catenaries between towers and down to the anchorages
  const cableY = (x: number) => {
    if (x < t1) return top + 2 + ((t1 - x) / t1) ** 1.1 * (deck - top - 4) * 0.95;
    if (x > t2) return top + 2 + ((x - t2) / (W - t2)) ** 1.1 * (deck - top - 4) * 0.95;
    const m = (t1 + t2) / 2, half = (t2 - t1) / 2;
    return top + 2 + (1 - ((x - m) / half) ** 2) * (deck - top - 12);
  };
  for (let x = 0; x < W; x++) {
    const y = Math.round(cableY(x));
    c.set(x, y, P.cable);
    c.set(x, y + 1, P.orangeDark);
    if (x % 3 === 0) for (let yy = y + 2; yy < deck; yy++) c.set(x, yy, P.cable); // suspenders
  }
  // deck with its truss
  c.rect(0, deck, W, 3, P.orange);
  c.hline(0, W - 1, deck + 3, P.orangeDark);
  for (let x = 0; x < W; x += 3) c.set(x, deck + 1, P.orangeDark);
  // art-deco towers: two legs joined by stepped portals
  for (const tx of [t1, t2]) {
    const foot = deck + 10;
    c.rect(tx - 8, foot - 2, 17, 4, P.orangeDark); // concrete pier at the waterline
    c.rect(tx - 8, foot - 2, 17, 1, "#b9b3a6");
    for (const lx of [tx - 6, tx + 3]) {
      c.rect(lx, top, 4, foot - 2 - top, P.orange);
      c.rect(lx + 3, top, 1, foot - 2 - top, P.orangeDark);
      c.rect(lx, top, 1, foot - 2 - top, P.orangeLight);
      for (let y = top + 4; y < deck; y += 9) c.hline(lx, lx + 3, y, P.orangeDark);
    }
    for (const py of [top + 2, top + 16, top + 30, deck - 6]) c.rect(tx - 2, py, 5, 4, P.orange);
    for (const py of [top + 2, top + 16, top + 30]) c.hline(tx - 2, tx + 2, py + 3, P.orangeDark);
    c.hline(tx - 6, tx + 6, top - 1, P.orangeDark);
    // tower reflection
    for (let y = deck + 12; y < H; y++) for (let x = tx - 6; x <= tx + 6; x++) if (bayer(x, y) < 0.3 && (y & 1)) c.set(x, y, P.orangeDark);
  }
  // headlights on the deck
  const r = rng(322);
  for (let i = 0; i < 16; i++) c.set(Math.floor(r() * W), deck - 1, r() < 0.5 ? "#f2cf6a" : "#e9e6dc");
}

function sailboat(c: PixelCanvas, x: number, y: number, s: number) {
  for (let k = 0; k < 2; k++) c.hline(x + k, x + Math.round(12 * s) - k, y + k, P.hull);
  const mx = x + Math.round(6 * s);
  c.rect(mx, y - Math.round(13 * s), 1, Math.round(13 * s), P.hull);
  c.polygon([[mx + 1, y - Math.round(12 * s)], [mx + 1, y - 1], [mx + Math.round(7 * s), y - 1]], P.sail);
  c.polygon([[mx - 1, y - Math.round(9 * s)], [mx - 1, y - 1], [mx - Math.round(5 * s), y - 1]], P.sailShade);
}

function cableCarStreet(c: PixelCanvas) {
  // a hill street climbing to the right in the foreground
  const slope = (x: number) => 104 - Math.round((x - 120) * 0.12);
  for (let x = 110; x < W; x++) for (let y = slope(x); y < H; y++) c.set(x, y, y === slope(x) ? P.streetLight : bayer(x, y) < 0.15 ? P.rail : P.street);
  // the cable car itself
  const x0 = 150, y0 = slope(170) - 1;
  c.rect(x0, y0 - 9, 26, 8, P.carRed);
  c.rect(x0, y0 - 9, 26, 2, P.carCream);
  for (let x = x0 + 2; x < x0 + 24; x += 4) c.rect(x, y0 - 6, 3, 3, P.carWindow);
  c.hline(x0 - 1, x0 + 26, y0 - 10, P.carGold);
  c.rect(x0 + 2, y0 - 12, 22, 2, P.carRed);
  c.hline(x0, x0 + 25, y0 - 1, P.rail);
  c.disc(x0 + 5, y0, 1.4, "#2b2b33"); c.disc(x0 + 20, y0, 1.4, "#2b2b33");
  // riders hanging off the running board
  people(c, 323, y0 - 2, x0 + 1, x0 + 24, 5, P.coats);
}

export const sanFranciscoScene: PostcardScene = {
  cityId: "san-francisco",
  accent: "#c8502e",
  description: "Pixel-art view of San Francisco: the international-orange Golden Gate Bridge with its art-deco towers and suspension cables, fog rolling over the Marin headlands, sailboats on the bay, a row of Painted Ladies and a cable car climbing a hill street.",
  draw(c) {
    sky(c, P.sky, 70);
    headlands(c);
    goldenGate(c);
    sailboat(c, 70, 92, 1);
    sailboat(c, 104, 96, 0.8);
    sailboat(c, 190, 90, 0.7);
    townhouses(c, 324, -4, 108, 108, PAINTED_LADIES);
    cableCarStreet(c);
    birds(c, 325, 80, 30, 140, 44, 5, "#55607a");
  },
  drawStamp(c, x, y, w, h) {
    c.rect(x, y, w, h, "#a8c0d8");
    c.rect(x, y + h - 5, w, 5, P.water);
    const tx = x + Math.floor(w / 2) - 2;
    c.rect(tx, y + 2, 2, h - 2, P.orange); c.rect(tx + 4, y + 2, 2, h - 2, P.orange);
    c.rect(tx, y + 5, 6, 2, P.orange); c.rect(tx, y + 10, 6, 2, P.orange);
    c.rect(x, y + h - 7, w, 2, P.orange);
    c.line(x, y + h - 10, tx, y + 3, P.cable); c.line(tx + 5, y + 3, x + w - 1, y + h - 10, P.cable);
  },
};
