import { bayer, rng, type PixelCanvas } from "../pixel/canvas";
import type { PostcardScene } from "../template";
import { W, H, birds, cloud, people, sky, townhouses, water, type TownhouseStyle } from "./common";

/** Venice: the Rialto Bridge over the Grand Canal, painted palazzi, a campanile, gondolas and mooring poles. */
const P = {
  sky: ["#6a86b6", "#86a0c6", "#adc0d6", "#d8d9d6", "#efe4cc"],
  cloud: "#f5f1e8", cloudShade: "#d6dbe2",
  brick: "#b5603f", brickDark: "#8f4630", spire: "#5f8a7a", spireDark: "#4a6f62",
  stone: "#ece3d0", stoneShade: "#c9bea8", stoneDeep: "#a89c84", shopDark: "#6a5a48",
  roof: "#c46a4a", roofDark: "#9a4f36",
  water: "#4f8f8c", waterLight: "#9fd0c8", waterDark: "#3a6f6e",
  gondola: "#1f1f26", ferro: "#d9dde0", stripeA: "#f3ead8", stripeB: "#2f3a63", seat: "#a8382b", skin: "#e3b48f",
  poleRed: "#c8432f", poleBlue: "#2f5a9a", poleWhite: "#f3ead8",
};

const PALAZZI: TownhouseStyle = {
  facades: ["#d9906a", "#e6b46a", "#e7a3a0", "#d8c2a0", "#c76a50", "#e9c9a0"],
  shade: "#a8765a", window: "#3d3a46", sill: "#f3ead8", balcony: "#f3ead8",
  roof: "flat", roofColor: "#c46a4a", roofDark: "#9a4f36",
  shutters: ["#4f7a5a", "#5f8a7a"], door: "#3a2f2a",
  widths: [13, 18], heights: [24, 32], floorH: 6,
};

/** Venetian chimneys flare outwards at the top like funnels. */
function chimneys(c: PixelCanvas, seed: number, x0: number, x1: number) {
  const r = rng(seed);
  for (let x = x0 + 3; x < x1; x += 7 + Math.floor(r() * 6)) {
    let top = 0;
    for (let y = 40; y < 92; y++) if (c.get(x, y) === PALAZZI.roofDark) { top = y; break; }
    if (!top) continue;
    c.rect(x, top - 4, 1, 4, P.roofDark);
    c.hline(x - 1, x + 1, top - 5, P.roof);
    c.hline(x - 1, x + 1, top - 6, P.roofDark);
  }
}

function campanile(c: PixelCanvas, x: number) {
  c.rect(x, 30, 8, 62, P.brick);
  c.rect(x + 6, 30, 2, 62, P.brickDark);
  for (let y = 34; y < 90; y += 6) c.set(x + 3, y, P.brickDark);
  c.rect(x - 1, 24, 10, 6, P.stone);
  for (let k = 0; k < 4; k++) c.rect(x + k * 2, 25, 1, 4, P.shopDark);
  for (let y = 12; y < 24; y++) c.hline(x + Math.floor((24 - y) / 3) - 0, x + 7 - Math.floor((24 - y) / 3), y, y % 2 ? P.spire : P.spireDark);
  c.set(x + 3, 10, "#d8b04a"); c.set(x + 4, 10, "#d8b04a"); c.set(x + 4, 9, "#d8b04a");
}

function rialto(c: PixelCanvas, cx: number) {
  const half = 44, spring = 93, rise = 13;
  const deck = (x: number) => spring - 4 - rise * Math.sin((Math.PI * (x - cx + half)) / (2 * half));
  // single great arch: masonry between the curved deck and the arch underside
  for (let x = cx - half; x <= cx + half; x++) {
    const top = Math.round(deck(x));
    const t = (x - cx) / (half - 4);
    const under = Math.abs(t) < 1 ? Math.round(spring - (rise - 2) * Math.sqrt(1 - t * t)) : spring + 4;
    for (let y = top; y < Math.min(under, H); y++) c.set(x, y, y === top ? P.stoneShade : bayer(x, y) < 0.1 ? P.stoneShade : P.stone);
    c.set(x, under, P.stoneDeep);
    // voussoir lines around the arch
    if (x % 3 === 0 && Math.abs(t) < 1) c.set(x, under - 1, P.stoneShade);
  }
  // balustrade
  for (let x = cx - half; x <= cx + half; x++) {
    const top = Math.round(deck(x));
    c.set(x, top - 3, P.stone);
    if (x % 2 === 0) { c.set(x, top - 2, P.stoneShade); c.set(x, top - 1, P.stoneShade); }
  }
  // arcades of shops stepping up both ramps
  for (const side of [-1, 1]) {
    for (let k = 0; k < 4; k++) {
      const sx = cx + side * (12 + k * 7);
      const base = Math.round(deck(sx));
      const top = base - 9;
      c.rect(sx - 3, top, 7, 9, P.stone);
      c.rect(sx - 1, top + 3, 3, 6, P.shopDark);
      c.set(sx - 1, top + 3, P.stone); c.set(sx + 1, top + 3, P.stone);
      for (let j = 0; j < 3; j++) c.hline(sx - 4 + j, sx + 4 - j, top - 3 + j, j === 0 ? P.roofDark : P.roof);
    }
  }
  // central portico with its big arch and pediment
  const top = Math.round(deck(cx)) - 14;
  c.rect(cx - 8, top, 17, 14, P.stone);
  c.rect(cx + 6, top, 3, 14, P.stoneShade);
  c.rect(cx - 3, top + 4, 7, 10, P.shopDark);
  c.set(cx - 3, top + 4, P.stone); c.set(cx + 3, top + 4, P.stone);
  for (let j = 0; j < 5; j++) c.hline(cx - 9 + j * 2, cx + 9 - j * 2, top - 1 - j, j === 0 ? P.stoneDeep : P.stone);
}

function gondola(c: PixelCanvas, x0: number, y: number, len: number) {
  for (let x = x0; x < x0 + len; x++) {
    const t = (x - x0) / len;
    const lift = Math.round(Math.pow(Math.abs(t - 0.5) * 2, 3) * 5);
    c.set(x, y - lift, P.gondola);
    c.set(x, y + 1 - lift, P.gondola);
  }
  // ferro (prow comb) and seat
  c.rect(x0 + len - 2, y - 9, 1, 4, P.ferro);
  for (let k = 0; k < 3; k++) c.set(x0 + len - 3 - k, y - 7 + k, P.ferro);
  c.rect(x0 + Math.round(len * 0.45), y - 2, 5, 2, P.seat);
  // gondolier in a striped shirt with a long oar
  const gx = x0 + 4;
  c.set(gx, y - 9, P.stripeA); c.set(gx, y - 10, P.stripeB); // boater hat
  c.set(gx, y - 8, P.skin);
  for (let k = 0; k < 4; k++) c.set(gx, y - 7 + k, k % 2 ? P.stripeB : P.stripeA);
  c.set(gx, y - 3, P.stripeB); c.set(gx, y - 2, P.stripeB);
  c.line(gx + 1, y - 7, gx - 5, y + 4, "#8a6a4a");
}

function poles(c: PixelCanvas, x: number, top: number, col: string) {
  for (const dx of [0, 4]) for (let y = top; y < H; y++) c.set(x + dx, y, (y >> 1) % 2 ? col : P.poleWhite);
  for (const dx of [0, 4]) c.set(x + dx, top - 1, P.gondola);
}

export const veniceScene: PostcardScene = {
  cityId: "venice",
  accent: "#b5603f",
  description: "Pixel-art view of Venice: the white stone Rialto Bridge with its shop arcades and portico over the Grand Canal, painted palazzi with green shutters and funnel chimneys, a brick campanile, gondoliers in striped shirts and striped mooring poles.",
  draw(c) {
    sky(c, P.sky);
    cloud(c, 60, 120, 22, P.cloud, P.cloudShade, 3);
    cloud(c, 150, 196, 40, P.cloud, P.cloudShade);
    birds(c, 121, 80, 14, 170, 34, 6, "#55607a");
    campanile(c, 34);
    townhouses(c, 31, -6, 100, 93, PALAZZI);
    townhouses(c, 32, 124, W + 8, 93, PALAZZI);
    chimneys(c, 33, 0, W);
    water(c, 93, P.water, P.waterLight, P.waterDark, 123);
    // dithered reflections of the facades
    for (let x = 0; x < W; x++) {
      const col = c.get(x, 88);
      if (!col) continue;
      for (let y = 95; y < H; y++) if (bayer(x, y) < 0.22 && (y & 1)) c.set(x, y, col);
    }
    rialto(c, 112);
    people(c, 124, 76, 92, 132, 7, ["#2f3346", "#c8432f", "#3a5a9a", "#e2b84a", "#f3ead8"]);
    gondola(c, 22, 102, 40);
    gondola(c, 160, 99, 30);
    poles(c, 6, 84, P.poleRed);
    poles(c, 206, 82, P.poleBlue);
  },
  drawStamp(c, x, y, w, h) {
    c.rect(x, y, w, h, "#f3e6c9");
    c.rect(x, y + h - 6, w, 6, P.water);
    for (let k = 0; k < w - 4; k++) c.set(x + 2 + k, y + h - 6 - Math.round(Math.pow(Math.abs(k / (w - 4) - 0.5) * 2, 3) * 3), P.gondola);
    c.rect(x + w - 4, y + h - 12, 1, 4, P.gondola);
    c.set(x + 5, y + 4, P.stripeB); c.set(x + 5, y + 5, P.skin);
    for (let k = 0; k < 4; k++) c.set(x + 5, y + 6 + k, k % 2 ? P.stripeB : P.stripeA);
  },
};
