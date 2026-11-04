import { bayer, rng, type PixelCanvas } from "../pixel/canvas";
import type { PostcardScene } from "../template";
import { W, H, birds, cloud, foliage, people, sky, townhouses, type TownhouseStyle } from "./common";

/** Barcelona: the spires of the Sagrada Família over Eixample blocks, palms and a trencadís mosaic bench. */
const P = {
  sky: ["#3f74b5", "#5d92cc", "#8ab4dc", "#c2d8e6", "#efe8d2"],
  cloud: "#f8f6ef", cloudShade: "#d9e2ea",
  sand: "#cfae7a", sandShade: "#a98656", sandLight: "#e6cc98", hole: "#6a4f32", nave: "#bf9d6b",
  mosaic: ["#c8432f", "#e2b84a", "#4f9a6a", "#f3ead8", "#3f7fb5", "#e07a3a"],
  palm: ["#3f8a4f", "#6db36a", "#2d6a3d", "#8ccf77"], trunk: "#8a6a4a",
  benchBase: "#e9e1cf", benchShade: "#c9bfa8",
};

const EIXAMPLE: TownhouseStyle = {
  facades: ["#ecdcc0", "#e9c9b0", "#e6d3a6", "#dcc7b4", "#efe2cc"],
  shade: "#c4ad8c", window: "#3d3f52", sill: "#f6efe0", balcony: "#2f3346",
  roof: "flat", roofColor: "#c46a4a", roofDark: "#9a8a72",
  shutters: ["#4f7a5a", "#6f8a6a"], awnings: ["#c8432f", "#2f5a7a", "#e2b84a"], door: "#3a2f2a",
  widths: [14, 18], heights: [24, 30], floorH: 5,
};

/** One of the cigar-shaped bell towers: perforated shaft, tapering cone, mosaic finial. */
function belltower(c: PixelCanvas, cx: number, top: number, base: number, hw: number, seed: number) {
  const r = rng(seed);
  const coneStart = top + Math.round((base - top) * 0.3);
  for (let y = top; y <= base; y++) {
    const w = y < coneStart ? hw * Math.pow((y - top) / (coneStart - top), 0.9) : hw;
    for (let x = Math.round(cx - w); x <= Math.round(cx + w); x++) {
      const right = x > cx + w * 0.3;
      const perforated = y > coneStart + 2 && (y - coneStart) % 4 < 2 && Math.abs(x - cx) <= w - 1 && (x - cx) % 2 === 0;
      c.set(x, y, perforated ? P.hole : right ? P.sandShade : bayer(x, y) < 0.12 ? P.sandLight : P.sand);
    }
  }
  // mosaic pinnacle with a cross-ball
  for (let k = 0; k < 5; k++) for (let dx = k < 2 ? -1 : 0; dx <= (k < 2 ? 1 : 0); dx++) c.set(cx + dx, top - k, P.mosaic[Math.floor(r() * P.mosaic.length)]!);
  c.set(cx, top - 6, P.mosaic[3]!);
  c.set(cx - 1, top - 7, P.mosaic[3]!); c.set(cx + 1, top - 7, P.mosaic[3]!); c.set(cx, top - 8, P.mosaic[3]!);
}

function sagrada(c: PixelCanvas, cx: number) {
  // nave and transept roofs
  c.rect(cx - 38, 62, 76, 32, P.nave);
  for (let x = cx - 36; x < cx + 36; x += 5) for (let y = 64; y < 92; y += 6) { c.rect(x, y, 2, 4, P.hole); c.set(x, y, P.nave); }
  for (let k = 0; k < 8; k++) c.hline(cx - 38 + k * 2, cx + 38 - k * 2, 62 - k, k === 0 ? P.sandShade : P.sand);
  // central towers (tallest) and the two facades' bell towers
  const towers: [number, number, number][] = [
    [cx, 6, 2.6], [cx - 9, 16, 2.2], [cx + 9, 16, 2.2],
    [cx - 30, 26, 2.4], [cx - 22, 20, 2.6], [cx - 14, 22, 2.4],
    [cx + 14, 24, 2.4], [cx + 22, 20, 2.6], [cx + 30, 28, 2.4],
  ];
  towers.forEach(([x, top, hw], i) => belltower(c, x, top, 92, hw + 0.8, 200 + i));
  // Nativity façade: three portals with dripping sculpted texture
  for (const dx of [-18, 0, 18]) {
    const px = cx + dx, w = dx === 0 ? 8 : 6;
    for (let y = 74; y < 94; y++) {
      const hw = y < 80 ? (y - 74) * (w / 6) : w;
      for (let x = Math.round(px - hw); x <= Math.round(px + hw); x++) c.set(x, y, bayer(x, y) < 0.4 ? P.sandShade : P.sandLight);
    }
    c.rect(px - Math.floor(w / 2), 84, w, 10, P.hole);
  }
  // star on the central tower
  c.set(cx - 1, 2, P.mosaic[1]!); c.set(cx + 1, 2, P.mosaic[1]!); c.set(cx, 1, P.mosaic[1]!);
}

function palm(c: PixelCanvas, x: number, base: number, h: number, seed: number) {
  for (let y = base; y > base - h; y--) c.set(x + Math.round(Math.sin((base - y) / 10) * 2), y, (y % 3) ? P.trunk : "#6a4f36");
  const tx = x + Math.round(Math.sin(h / 10) * 2), ty = base - h;
  for (let k = 0; k < 8; k++) {
    const a = Math.PI + (k / 7) * Math.PI;
    for (let d = 1; d < 11; d++) c.set(tx + Math.round(Math.cos(a) * d), ty + Math.round(Math.sin(a) * d * 0.6 + d * d * 0.05), k % 2 ? P.palm[0]! : P.palm[2]!);
  }
  foliage(c, seed, tx, ty, 3, P.palm);
}

/**
 * Park Güell-style serpentine bench: broken tiles laid as 3x2 shards with pale grout,
 * mostly white and blue with warm accents, under a rounded coping.
 */
function trencadis(c: PixelCanvas) {
  const r = rng(141);
  const tiles = ["#f3ead8", "#f3ead8", "#3f7fb5", "#6fa3d0", "#3f7fb5", "#e2b84a", "#4f9a6a", "#c8432f", "#e07a3a"];
  const topAt = (x: number) => 100 + Math.round(Math.sin(x / 9) * 2.5);
  for (let x = 0; x < W; x++) for (let y = topAt(x); y < H; y++) c.set(x, y, P.benchShade);
  for (let ty = 98; ty < H; ty += 3) {
    const offset = (ty / 3) % 2 ? 2 : 0;
    for (let tx = -offset; tx < W; tx += 4) {
      const col = tiles[Math.floor(r() * tiles.length)]!;
      for (let y = ty; y < ty + 2; y++) for (let x = tx; x < tx + 3; x++) if (x >= 0 && y >= topAt(x) + 1) c.set(x, y, col);
    }
  }
  for (let x = 0; x < W; x++) { c.set(x, topAt(x), P.benchBase); c.set(x, topAt(x) - 1, P.benchBase); }
}

export const barcelonaScene: PostcardScene = {
  cityId: "barcelona",
  accent: "#b23a48",
  description: "Pixel-art view of Barcelona: the perforated bell towers and mosaic pinnacles of the Sagrada Família above Eixample blocks with iron balconies, palm trees, and a serpentine trencadís mosaic bench in the foreground.",
  draw(c) {
    sky(c, P.sky);
    cloud(c, 10, 60, 30, P.cloud, P.cloudShade);
    cloud(c, 168, 210, 54, P.cloud, P.cloudShade);
    birds(c, 142, 20, 14, 70, 26, 4, "#4a5a7a");
    sagrada(c, 116);
    townhouses(c, 143, -6, 74, 98, EIXAMPLE);
    townhouses(c, 144, 158, W + 8, 98, EIXAMPLE);
    people(c, 145, 98, 70, 160, 9, ["#2f3346", "#c8432f", "#3a5a9a", "#e2b84a", "#f3ead8", "#4f9a6a"]);
    palm(c, 70, 99, 32, 146);
    palm(c, 162, 99, 28, 147);
    trencadis(c);
  },
  drawStamp(c, x, y, w, h) {
    c.rect(x, y, w, h, P.sky[1]!);
    const r = rng(148);
    for (let yy = y + h - 5; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) c.set(xx, yy, P.mosaic[Math.floor(r() * P.mosaic.length)]!);
    for (const [dx, top] of [[-5, 6], [-2, 3], [2, 4], [5, 7]] as const) {
      const tx = x + Math.floor(w / 2) + dx;
      c.rect(tx, y + top, 2, h - 5 - top, P.sand);
      c.set(tx, y + top - 1, P.mosaic[0]!);
    }
  },
};
