import { bayer, rng, type PixelCanvas } from "../pixel/canvas";
import type { PostcardScene } from "../template";
import { W, H, birds, sky } from "./common";

/** Giza at golden hour: the three pyramids, the Sphinx, a camel caravan, palms and dunes, Cairo's minarets far off. */
const P = {
  sky: ["#4a68a0", "#7a8ab0", "#d0a888", "#f0c08a", "#f8d8a0"],
  sun: "#fbe2a6", sunCore: "#fff3d0",
  city: "#b8a08a", minaret: "#a88e78",
  stone: "#e0b878", stoneShade: "#b88a52", stoneDeep: "#9a6e3e", stoneLight: "#f0cf94", cap: "#f3e2b8",
  sand: "#e8c890", sandShade: "#d0aa72", sandLight: "#f4dcaa",
  sphinx: "#d0a468", sphinxShade: "#a87c48",
  camel: "#7a5a3a", camelDark: "#5a4028", rider: "#f3ead8", riderRed: "#c8432f",
  palm: ["#4f7a44", "#6f9a58", "#3a5a34"], trunk: "#7a5a40",
};

function farCairo(c: PixelCanvas) {
  const r = rng(381);
  for (let x = 150; x < W; x += 4 + Math.floor(r() * 4)) {
    const t = 74 + Math.floor(r() * 6);
    c.rect(x, t, 4 + Math.floor(r() * 3), 84 - t, P.city);
  }
  for (const mx of [160, 176, 204]) {
    c.rect(mx, 62, 2, 18, P.minaret);
    c.set(mx, 61, P.minaret); c.hline(mx - 1, mx + 2, 68, P.minaret);
  }
  c.disc(190, 70, 6, P.minaret);
}

function pyramid(c: PixelCanvas, apex: number, peakY: number, base: number, half: number, capped: boolean) {
  for (let y = peakY; y <= base; y++) {
    const hw = ((y - peakY) / (base - peakY)) * half;
    for (let x = Math.round(apex - hw); x <= Math.round(apex + hw); x++) {
      const right = x > apex + (y - peakY) * 0.05;
      const course = (y - peakY) % 3 === 0;
      const col = course ? (right ? P.stoneDeep : P.stoneShade) : right ? P.stoneShade : bayer(x, y) < 0.15 ? P.stoneLight : P.stone;
      c.set(x, y, col);
    }
    if (capped && y < peakY + 7) {
      const hw2 = ((y - peakY) / (base - peakY)) * half;
      c.hline(Math.round(apex - hw2), Math.round(apex), y, P.cap);
    }
  }
}

function dunes(c: PixelCanvas) {
  c.paint((x, y) => {
    const top = 86 + 3 * Math.sin(x / 19) + Math.sin(x / 6);
    if (y < top) return null;
    const ripple = (Math.round(y + Math.sin(x / 4) * 1.5) % 4) === 0;
    return y - top < 1 ? P.sandLight : ripple ? P.sandShade : bayer(x, y) < 0.15 ? P.sandLight : P.sand;
  }, 0, 80, W - 1, H - 1);
}

function sphinx(c: PixelCanvas, x: number, base: number) {
  // lion body lying down, paws forward, human head with the nemes headdress
  c.rect(x, base - 6, 30, 6, P.sphinx);
  c.rect(x + 22, base - 6, 8, 6, P.sphinxShade);
  c.rect(x - 8, base - 2, 10, 2, P.sphinx); // paws
  c.rect(x - 2, base - 12, 7, 8, P.sphinx);
  c.rect(x - 3, base - 10, 2, 5, P.sphinxShade); // headdress lappets
  c.rect(x + 5, base - 10, 2, 5, P.sphinxShade);
  c.hline(x - 2, x + 4, base - 13, P.sphinxShade);
  c.set(x, base - 10, P.stoneDeep); c.set(x + 3, base - 10, P.stoneDeep);
  for (let k = 0; k < 6; k++) c.set(x + 8 + k * 3, base - 4, P.sphinxShade);
}

function camel(c: PixelCanvas, x: number, base: number, ridden: boolean) {
  c.rect(x, base - 8, 10, 3, P.camel);
  c.rect(x + 3, base - 10, 4, 2, P.camel); // hump
  c.rect(x + 9, base - 12, 2, 5, P.camel); // neck
  c.rect(x + 10, base - 13, 3, 2, P.camel); // head
  for (const lx of [x + 1, x + 3, x + 7, x + 9]) c.rect(lx, base - 5, 1, 5, P.camelDark);
  c.set(x - 1, base - 7, P.camelDark); // tail
  if (ridden) { c.rect(x + 4, base - 14, 2, 4, P.rider); c.set(x + 4, base - 15, P.riderRed); c.set(x + 5, base - 15, P.riderRed); }
}

function palm(c: PixelCanvas, x: number, base: number, h: number) {
  for (let y = base; y > base - h; y--) c.set(x + Math.round(Math.sin((base - y) / 8)), y, (y % 3) ? P.trunk : "#5a4030");
  const tx = x + Math.round(Math.sin(h / 8)), ty = base - h;
  for (let k = 0; k < 8; k++) {
    const a = Math.PI + (k / 7) * Math.PI;
    for (let d = 1; d < 9; d++) c.set(tx + Math.round(Math.cos(a) * d), ty + Math.round(Math.sin(a) * d * 0.6 + d * d * 0.06), P.palm[k % 3]!);
  }
}

export const cairoScene: PostcardScene = {
  cityId: "cairo",
  accent: "#b8642a",
  description: "Pixel-art view of Giza at golden hour: the three great pyramids with their stone courses and Khafre's remaining casing, the Sphinx, a camel caravan crossing rippled dunes, date palms, and Cairo's minarets in the haze.",
  draw(c) {
    sky(c, P.sky, 82);
    c.disc(186, 58, 10, P.sun);
    c.disc(186, 58, 6, P.sunCore);
    birds(c, 382, 20, 16, 90, 34, 5, "#6a5068");
    farCairo(c);
    pyramid(c, 150, 44, 86, 34, false); // Menkaure (small, behind)
    pyramid(c, 118, 26, 86, 54, true); // Khafre, with its casing cap
    pyramid(c, 66, 22, 88, 62, false); // Khufu
    dunes(c);
    sphinx(c, 160, 96);
    palm(c, 210, 96, 26);
    palm(c, 200, 98, 20);
    for (const [x, ridden] of [[20, true], [36, false], [52, true], [68, false]] as const) camel(c, x, 104, ridden);
  },
  drawStamp(c, x, y, w, h) {
    c.gradient(y, y + h - 1, [P.sky[1]!, P.sky[3]!, P.sky[4]!], x, x + w - 1);
    c.disc(x + w - 6, y + 5, 2.5, P.sun);
    const ax = x + Math.floor(w / 2) - 2;
    for (let k = 0; k < 11; k++) c.hline(ax - k, ax + k, y + h - 12 + k, k % 3 === 0 ? P.stoneShade : P.stone);
    c.rect(x, y + h - 2, w, 2, P.sand);
  },
};
