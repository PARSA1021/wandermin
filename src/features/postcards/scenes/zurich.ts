import { bayer, rng, type PixelCanvas } from "../pixel/canvas";
import type { PostcardScene } from "../template";
import { W, H, birds, people, ridge, sky, townhouses, water, type TownhouseStyle } from "./common";

/** Zurich: the twin towers of the Grossmünster on the Limmat, Fraumünster's spire, St Peter's clock, the Alps. */
const P = {
  sky: ["#3f6fb0", "#5b8cc8", "#8db3dc", "#c9dcea", "#eef0ea"],
  alp: "#8a9cc0", alpShade: "#6f83ab", snow: "#f6f6f2", snowShade: "#c9d2e4",
  hill: "#6f9a6a", hillDark: "#5a8456",
  stone: "#ddd3c0", stoneShade: "#b8ad98", stoneDark: "#8c8272", dome: "#5a5f6a", domeLight: "#787e8a",
  copper: "#5f9a86", copperDark: "#47786a", clock: "#2b2b33", clockGold: "#d8b04a",
  water: "#4f8fa0", waterLight: "#a9d2dc", waterDark: "#3b7286",
  swan: "#f6f4ee", beak: "#e07a3a", boat: "#f3ead8", boatTrim: "#c0392b",
  coats: ["#2f3346", "#c0392b", "#3a5a9a", "#e2b84a", "#f3ead8", "#4f7a5a"],
};

const ALTSTADT: TownhouseStyle = {
  facades: ["#efe4cc", "#e9d6b0", "#f2e0b8", "#e7c9b0", "#dfe3d6", "#e6d0a0"],
  shade: "#b9a586", window: "#3d4558", sill: "#f8f2e4",
  roof: "gable", roofColor: "#9a5a42", roofDark: "#7a4432",
  shutters: ["#4f7a5a", "#c0392b", "#3a5a9a"], awnings: ["#c0392b", "#2f5a4a"], door: "#4a3a2a",
  widths: [11, 15], heights: [18, 24], floorH: 5,
};

function alps(c: PixelCanvas) {
  const top = (x: number) => 46 - Math.max(0, 14 - Math.abs(x - 50) * 0.35) - Math.max(0, 10 - Math.abs(x - 150) * 0.3) - Math.max(0, 8 - Math.abs(x - 210) * 0.4) + 2 * Math.sin(x / 4) + Math.sin(x / 1.6);
  c.paint((x, y) => {
    const t = top(x);
    if (y < t) return null;
    const snowLine = t + 7 + 2 * Math.sin(x * 0.7);
    const shade = Math.sin(x / 6 + y / 4) > 0.3;
    if (y < snowLine) return shade ? P.snowShade : P.snow;
    return shade ? P.alpShade : bayer(x, y) < 0.3 ? P.alpShade : P.alp;
  }, 0, 20, W - 1, 75);
  ridge(c, (x) => 68 + 3 * Math.sin(x / 13) + Math.sin(x / 4), P.hill, P.hillDark);
}

function grossmunster(c: PixelCanvas, cx: number) {
  // nave
  c.rect(cx - 16, 58, 32, 34, P.stone);
  for (let x = cx - 14; x < cx + 14; x += 4) { c.rect(x, 64, 2, 5, P.stoneDark); c.set(x, 64, P.stone); c.rect(x, 76, 2, 6, P.stoneDark); }
  for (let k = 0; k < 4; k++) c.hline(cx - 16 + k, cx + 15 - k, 57 - k, P.dome);
  // twin towers with clock, belfry and domed caps
  for (const tx of [cx - 13, cx + 5]) {
    c.rect(tx, 30, 9, 62, P.stone);
    c.rect(tx + 7, 30, 2, 62, P.stoneShade);
    for (let y = 36; y < 90; y += 10) c.hline(tx, tx + 8, y, P.stoneShade);
    c.disc(tx + 4, 46, 2.4, P.clockGold);
    c.set(tx + 4, 46, P.clock); c.set(tx + 4, 45, P.clock);
    for (let x = tx + 1; x < tx + 8; x += 3) c.rect(x, 33, 2, 4, P.stoneDark);
    // octagonal drum and rounded helm
    c.rect(tx + 1, 26, 7, 4, P.stone);
    for (let y = 18; y < 26; y++) {
      const hw = Math.sqrt(Math.max(0, 1 - ((26 - y) / 8) ** 2)) * 4;
      c.hline(Math.round(tx + 4 - hw), Math.round(tx + 4 + hw), y, y < 21 ? P.domeLight : P.dome);
    }
    c.rect(tx + 4, 12, 1, 6, P.dome);
    c.set(tx + 4, 11, P.clockGold);
  }
  // west portal
  c.rect(cx - 3, 82, 6, 10, P.stoneDark);
  c.set(cx - 3, 82, P.stone); c.set(cx + 2, 82, P.stone);
}

function spire(c: PixelCanvas, x: number, base: number, shaftTop: number, tip: number, clockFace: boolean) {
  c.rect(x - 3, shaftTop, 7, base - shaftTop, P.stone);
  c.rect(x + 2, shaftTop, 2, base - shaftTop, P.stoneShade);
  if (clockFace) { c.disc(x, shaftTop + 5, 3, P.clockGold); c.disc(x, shaftTop + 5, 2.2, P.clock); c.set(x, shaftTop + 3, P.clockGold); c.set(x + 1, shaftTop + 5, P.clockGold); }
  for (let y = tip; y < shaftTop; y++) {
    const hw = ((y - tip) / (shaftTop - tip)) * 3.5;
    c.hline(Math.round(x - hw), Math.round(x + hw), y, y % 3 ? P.copper : P.copperDark);
  }
  c.set(x, tip - 1, P.clockGold);
}

function limmat(c: PixelCanvas) {
  water(c, 93, P.water, P.waterLight, P.waterDark, 191);
  for (let x = 0; x < W; x++) {
    const col = c.get(x, 88);
    if (!col) continue;
    for (let y = 95; y < H; y++) if (bayer(x, y) < 0.18 && (y & 1)) c.set(x, y, col);
  }
  // swans
  for (const [sx, sy] of [[40, 101], [52, 104], [150, 100]] as const) {
    c.rect(sx, sy, 5, 2, P.swan);
    c.set(sx + 4, sy - 1, P.swan); c.set(sx + 4, sy - 2, P.swan); c.set(sx + 5, sy - 3, P.swan); c.set(sx + 6, sy - 3, P.beak);
  }
  // a small Limmat boat
  const bx = 176, by = 102;
  for (let k = 0; k < 3; k++) c.hline(bx + k, bx + 30 - k, by + k, k === 1 ? P.boatTrim : P.boat);
  c.rect(bx + 6, by - 4, 16, 4, "#dfe8ec");
  for (let x = bx + 7; x < bx + 21; x += 3) c.rect(x, by - 3, 2, 2, "#6f8aa0");
}

export const zurichScene: PostcardScene = {
  cityId: "zurich",
  accent: "#c0392b",
  description: "Pixel-art view of Zurich: the twin domed towers of the Grossmünster above the Limmat, Fraumünster's slender green spire and St Peter's great clock, old-town houses with shutters, swans and a river boat, with the snowy Alps beyond.",
  draw(c) {
    sky(c, P.sky);
    alps(c);
    birds(c, 192, 60, 10, 140, 24, 5, "#44557a");
    townhouses(c, 193, -4, 92, 92, ALTSTADT);
    townhouses(c, 194, 148, W + 6, 92, ALTSTADT);
    spire(c, 56, 92, 46, 22, false);
    spire(c, 176, 92, 52, 38, true);
    grossmunster(c, 120);
    people(c, 195, 91, 0, 220, 14, P.coats);
    limmat(c);
    const r = rng(196);
    for (let i = 0; i < 4; i++) c.set(Math.floor(r() * W), 96 + Math.floor(r() * 10), P.waterLight);
  },
  drawStamp(c, x, y, w, h) {
    c.rect(x, y, w, h, "#c0392b");
    const cx = x + Math.floor(w / 2), cy = y + Math.floor(h / 2);
    c.rect(cx - 2, cy - 6, 4, 12, "#f6f4ee");
    c.rect(cx - 6, cy - 2, 12, 4, "#f6f4ee");
  },
};
