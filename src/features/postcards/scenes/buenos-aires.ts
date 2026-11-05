import { bayer, rng, type PixelCanvas } from "../pixel/canvas";
import type { PostcardScene } from "../template";
import { W, H, birds, cloud, leaf, sky } from "./common";

/** Buenos Aires in spring: the Obelisco on Avenida 9 de Julio, purple jacarandas, colectivo buses, La Boca colours, tango. */
const P = {
  sky: ["#4a86cc", "#6ea4dc", "#9cc4e8", "#cfe2ee", "#f2f0e2"],
  cloud: "#fbfaf4", cloudShade: "#d2e0ea",
  obelisk: "#f3eee2", obeliskShade: "#d0c8b4", obeliskDeep: "#b0a690", window: "#6a6458",
  city: "#d8d0c0", cityShade: "#b8b0a0", cityWin: "#7a8a9a", cityWarm: "#e8d4b8", mansard: "#5a6a7a",
  jacaranda: "#9a6ad0", jacarandaLight: "#c09ae8", jacarandaDark: "#7a4ab0", bark: "#5a4a3a",
  road: "#6a6a72", roadLight: "#7e7e86", lane: "#f2e8c8", crossing: "#f3f0e6",
  bus: [{ body: "#2f8fd0", stripe: "#f2c12e" }, { body: "#e8483a", stripe: "#f3f0e6" }, { body: "#2f9a6a", stripe: "#f2c12e" }],
  busWin: "#3a4a5a", tyre: "#2a2a2e",
  boca: ["#e8483a", "#f2c12e", "#2f8fd0", "#3aa86a", "#f3a0b0"], tin: "#8a8a92",
  tangoDress: "#c8322a", tangoSuit: "#2a2a30", skin: "#e0b08a",
  flag: "#7ab8e8", sun: "#f2c12e",
};

function cityBlocks(c: PixelCanvas) {
  // Parisian-style buildings with mansard roofs lining the avenue
  const r = rng(9);
  for (let x = 0; x < W; x += 12 + Math.floor(r() * 6)) {
    if (x > 94 && x < 126) continue;
    const w = 12 + Math.floor(r() * 6), t = 34 + Math.floor(r() * 26);
    c.rect(x, t, w, 80 - t, r() < 0.4 ? P.cityWarm : P.city);
    c.rect(x + w - 2, t, 2, 80 - t, P.cityShade);
    if (r() < 0.6) { for (let k = 0; k < 4; k++) c.hline(x + k, x + w - 1 - k, t - 1 - k, P.mansard); c.set(x + Math.floor(w / 2), t - 5, P.mansard); }
    for (let y = t + 3; y < 78; y += 4) for (let i = x + 2; i < x + w - 3; i += 3) c.rect(i, y, 1, 2, P.cityWin);
  }
}

function obelisco(c: PixelCanvas) {
  const cx = 112, base = 86, top = 6;
  for (let y = top + 6; y < base; y++) {
    const half = 2 + ((y - top) / (base - top)) * 4.5;
    for (let x = Math.round(cx - half); x <= Math.round(cx + half); x++) c.set(x, y, x > cx + half * 0.3 ? P.obeliskShade : P.obelisk);
  }
  for (let k = 0; k < 6; k++) c.hline(cx - Math.floor(k / 2), cx + Math.floor(k / 2), top + k, k < 2 ? P.obeliskShade : P.obelisk);
  c.set(cx, top + 2, P.window); // the single small window near the tip
  c.rect(cx - 7, base - 2, 15, 2, P.obeliskDeep);
}

function jacarandas(c: PixelCanvas) {
  // the median strip and sidewalks lined with flowering jacaranda trees
  const tree = (x: number, base: number, size: number) => {
    c.line(x, base, x, base - size, P.bark);
    c.line(x, base - size + 2, x - 3, base - size - 2, P.bark);
    c.line(x, base - size + 2, x + 3, base - size - 1, P.bark);
    c.paint((px, py) => {
      const dx = (px - x) / (size * 0.9), dy = (py - (base - size - 3)) / (size * 0.5);
      if (dx * dx + dy * dy > 1) return null;
      const l = leaf(px, py);
      return l < 0.25 ? P.jacarandaLight : l > 0.8 ? P.jacarandaDark : P.jacaranda;
    }, x - size, base - size * 2, x + size, base - size + 2);
  };
  for (const [x, b, s] of [[8, 88, 9], [30, 86, 8], [52, 86, 8], [74, 86, 7], [150, 86, 7], [172, 86, 8], [196, 86, 8], [218, 88, 9]] as const) tree(x, b, s);
  // petals on the ground
  const r = rng(5);
  for (let i = 0; i < 40; i++) c.set(Math.floor(r() * W), 88 + Math.floor(r() * 4), P.jacarandaLight);
}

function avenue(c: PixelCanvas) {
  c.paint((x, y) => (bayer(x, y) < 0.12 ? P.roadLight : P.road), 0, 86, W - 1, H - 1);
  for (let x = 0; x < W; x += 14) { c.hline(x, x + 6, 96, P.lane); c.hline(x + 7, x + 13, 104, P.lane); }
  for (let x = 92; x < 132; x += 3) c.rect(x, 87, 2, 4, P.crossing); // zebra crossing at the obelisk
  // colectivos — the city's colourful buses, with their decorated fronts
  const bus = (x: number, y: number, k: number) => {
    const b = P.bus[k % P.bus.length]!;
    c.rect(x, y - 10, 30, 9, b.body);
    c.hline(x, x + 29, y - 4, b.stripe);
    c.hline(x, x + 29, y - 10, b.stripe);
    for (let wx = x + 2; wx < x + 27; wx += 5) c.rect(wx, y - 8, 4, 3, P.busWin);
    c.rect(x + 27, y - 9, 2, 6, P.busWin);
    for (const wx of [x + 5, x + 23]) { c.disc(wx, y, 2.2, P.tyre); c.set(wx, y, P.roadLight); }
  };
  bus(10, 100, 0);
  bus(150, 100, 2);
  bus(60, 108, 1);
}

function laBoca(c: PixelCanvas) {
  // a strip of corrugated-tin houses painted in leftover ship paint, at the very left
  const r = rng(31);
  for (let x = -2; x < 22; x += 7) {
    const col = P.boca[Math.floor(r() * P.boca.length)]!, t = 62 + Math.floor(r() * 6);
    c.rect(x, t, 7, 86 - t, col);
    for (let i = x; i < x + 7; i += 2) for (let y = t; y < 86; y++) if (bayer(i, y) < 0.3) c.set(i, y, P.tin);
    c.rect(x + 2, t + 4, 3, 3, P.busWin);
  }
}

function tango(c: PixelCanvas, x: number, base: number) {
  // a couple mid-step on the corner: her red dress flaring, his dark suit
  c.rect(x, base - 10, 3, 8, P.tangoSuit); c.rect(x, base - 2, 1, 2, P.tangoSuit); c.rect(x + 2, base - 2, 1, 2, P.tangoSuit);
  c.rect(x, base - 12, 3, 2, P.skin); c.hline(x - 1, x + 3, base - 13, P.tangoSuit);
  c.rect(x + 3, base - 10, 3, 5, P.tangoDress);
  for (let k = 0; k < 5; k++) c.hline(x + 3 - Math.floor(k / 2), x + 6 + k, base - 5 + k, P.tangoDress);
  c.rect(x + 3, base - 12, 3, 2, P.skin); c.set(x + 5, base - 13, P.tangoSuit);
  c.line(x + 6, base - 10, x + 9, base - 13, P.skin);
}

export const buenosAiresScene: PostcardScene = {
  cityId: "buenos-aires",
  accent: "#3a86c8",
  windowFocus: [112, 40],
  description: "Pixel-art view of Buenos Aires in spring: the white Obelisco rising in the middle of Avenida 9 de Julio, Parisian-style buildings with mansard roofs, purple flowering jacaranda trees and fallen petals, colourful colectivo buses, a zebra crossing, La Boca's brightly painted tin houses and a tango couple on the corner.",
  draw(c) {
    sky(c, P.sky, 80);
    cloud(c, 20, 70, 14, P.cloud, P.cloudShade, 3);
    cloud(c, 150, 196, 22, P.cloud, P.cloudShade);
    birds(c, 21, 130, 10, 180, 26, 4, "#3a4a5a");
    cityBlocks(c);
    laBoca(c);
    obelisco(c);
    // Argentine flag on the obelisk's square
    c.rect(132, 62, 1, 24, P.tangoSuit);
    for (let k = 0; k < 6; k++) c.hline(133, 142, 62 + k, k === 2 || k === 3 ? P.obelisk : P.flag);
    c.set(137, 64, P.sun); c.set(137, 65, P.sun);
    avenue(c);
    jacarandas(c);
    tango(c, 196, 108);
  },
  drawStamp(c, x, y, w, h) {
    c.gradient(y, y + h - 1, [P.sky[1]!, P.sky[3]!], x, x + w - 1);
    const cx = x + Math.floor(w / 2);
    for (let k = 0; k < h - 4; k++) { const hw = Math.floor((k / (h - 4)) * 2.5); c.hline(cx - hw, cx + hw, y + 1 + k, P.obelisk); }
    c.disc(x + 3, y + h - 5, 3, P.jacaranda);
    c.disc(x + w - 4, y + h - 5, 3, P.jacaranda);
    c.rect(x, y + h - 3, w, 3, P.road);
  },
};
