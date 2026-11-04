import { bayer, rng, type PixelCanvas } from "../pixel/canvas";
import type { PostcardScene } from "../template";
import { W, H, birds, cloud, foliage, people, sky, townhouses, water, type TownhouseStyle } from "./common";

/** Paris at a pastel dusk: the Eiffel Tower, Haussmann rooftops, the Seine with a stone bridge. */
const P = {
  sky: ["#5f6fa4", "#8a8fbc", "#c9a8c0", "#ecc7b4", "#f5dcc0"],
  cloud: "#f6dccf", cloudShade: "#d9b3bd",
  iron: "#7a5a48", ironDark: "#553d31", ironLight: "#a07c63", beacon: "#f2cf6a",
  stone: "#e9dcc3", stoneShade: "#c9b99c", zinc: "#7d8ca0", zincDark: "#64738a", window: "#4a4f66", balcony: "#2f3346",
  chimney: "#b96a52",
  tree: "#5f7d5a", treeLight: "#7f9c6e", treeDark: "#46604a",
  water: "#7a86a8", waterLight: "#e6c3b4", waterDark: "#5f6a8c",
  quay: "#d8c9ab", quayShade: "#b5a586", lamp: "#2f3346",
};

function eiffel(c: PixelCanvas, cx: number) {
  const top = 8, base = 92;
  const hw = (y: number) => 1 + 27 * Math.pow((y - top) / (base - top), 2.3);
  for (let y = top; y <= base; y++) {
    const w = hw(y);
    for (let x = Math.round(cx - w); x <= Math.round(cx + w); x++) {
      const d = Math.abs(x - cx);
      // great arch between the legs
      const archTop = 74 + Math.sqrt(Math.max(0, 1 - (d / Math.max(1, w - 6)) ** 2)) * -0 + (d / Math.max(1, w - 6)) ** 2 * 12;
      if (y > 72 && d < w - 6 && y > archTop) continue;
      // hollow core between the four edges above the first platform
      if (y > 30 && y < 72 && d < w - 3.5 && d > 0.9) {
        if (((x + y) % 4 === 0 || (x - y + 400) % 4 === 0)) c.set(x, y, P.ironDark);
        continue;
      }
      const edge = d > w - 1.5;
      const lattice = (x + y) % 3 === 0;
      c.set(x, y, edge ? P.ironDark : lattice ? P.ironLight : P.iron);
    }
  }
  // platforms
  const platform = (y: number, extra: number) => {
    const w = Math.round(hw(y) + extra);
    c.rect(cx - w, y - 1, w * 2 + 1, 3, P.iron);
    c.hline(cx - w, cx + w, y - 1, P.ironLight);
    for (let x = cx - w + 1; x < cx + w; x += 2) c.set(x, y + 1, P.ironDark);
  };
  platform(72, 2);
  platform(50, 2);
  // X-bracing between platforms reads as the tower's famous lattice
  for (let y = 52; y < 71; y += 6) {
    const w = Math.round(hw(y + 3) - 2);
    c.line(cx - w, y, cx + w, y + 5, P.ironDark);
    c.line(cx + w, y, cx - w, y + 5, P.ironDark);
  }
  for (let y = 33; y < 49; y += 5) { const w = Math.round(hw(y + 2) - 1); c.line(cx - w, y, cx + w, y + 4, P.ironDark); c.line(cx + w, y, cx - w, y + 4, P.ironDark); }
  for (let x = cx - 12; x <= cx + 12; x += 4) c.set(x, 73, P.beacon);
  c.rect(cx - 2, top - 2, 5, 3, P.iron);
  c.rect(cx, 2, 1, top - 3, P.ironDark);
  c.set(cx, 1, P.beacon);
}

const HAUSSMANN: TownhouseStyle = {
  facades: ["#ecdfc6", "#e6d6b8", "#efe4ce", "#e2d1b2"],
  shade: "#c9b99c", window: "#4a4f66", sill: "#f6efe0", balcony: "#2f3346",
  roof: "mansard", roofColor: "#7d8ca0", roofDark: "#64738a",
  awnings: ["#b8402f", "#2f5a4a", "#3a5a9a", "#8a3a52"], door: "#3d3a46",
  widths: [13, 17], heights: [20, 25], floorH: 5,
};

/** Paris plane tree along the quay. */
function planeTree(c: PixelCanvas, x: number, base: number, seed: number) {
  c.rect(x, base - 9, 2, 9, "#8a7a62");
  c.set(x, base - 6, "#b3a48a");
  foliage(c, seed, x + 1, base - 13, 7, [P.tree, P.treeLight, P.treeDark, "#8fab74"]);
}

function bateauMouche(c: PixelCanvas, x0: number, y: number) {
  for (let k = 0; k < 3; k++) c.hline(x0 + k, x0 + 46 - k * 2, y + k, k === 0 ? "#f3ece0" : "#3d4560");
  c.rect(x0 + 4, y - 5, 36, 5, "#dfe6ea");
  for (let x = x0 + 5; x < x0 + 39; x += 3) c.rect(x, y - 4, 2, 3, "#7f93a8");
  c.hline(x0 + 4, x0 + 39, y - 6, "#f3ece0");
  people(c, 102, y - 6, x0 + 6, x0 + 38, 6, ["#b8402f", "#2f3346", "#f2cf6a", "#3a5a9a"]);
}

function seine(c: PixelCanvas) {
  // quay wall with lamps
  c.rect(0, 94, W, 4, P.quay);
  c.hline(0, W - 1, 97, P.quayShade);
  for (let x = 10; x < W; x += 22) { c.rect(x, 88, 1, 6, P.lamp); c.rect(x - 1, 87, 3, 1, P.lamp); c.set(x, 86, "#f2cf6a"); }
  water(c, 98, P.water, P.waterLight, P.waterDark, 101);
  // stone bridge with three arches across the left of the river: solid masonry, open arches
  const y0 = 92, x1 = 72;
  c.rect(0, y0, x1, H - y0, P.quay);
  c.hline(0, x1 - 1, y0, P.quayShade);
  c.hline(0, x1 - 1, y0 + 3, P.quayShade);
  for (const ax of [12, 36, 60]) {
    for (let x = ax - 9; x <= ax + 9; x++) {
      const crown = y0 + 5 + Math.round(((x - ax) / 9) ** 2 * 6);
      for (let y = crown; y < H; y++) c.set(x, y, y === crown ? P.quayShade : bayer(x, y) < 0.15 ? P.waterLight : P.waterDark);
    }
  }
}

export const parisScene: PostcardScene = {
  cityId: "paris",
  accent: "#3a5a9a",
  description: "Pixel-art view of Paris at a pastel dusk: the lattice Eiffel Tower over Haussmann buildings with zinc mansard roofs, iron balconies and café awnings, plane trees and strollers along the Seine, a stone arched bridge and a bateau-mouche.",
  draw(c) {
    sky(c, P.sky);
    cloud(c, 140, 200, 26, P.cloud, P.cloudShade);
    cloud(c, 20, 70, 44, P.cloud, P.cloudShade);
    cloud(c, 160, 186, 52, P.cloud, P.cloudShade);
    eiffel(c, 118);
    birds(c, 105, 30, 20, 90, 40, 5, "#5a4d6a");
    townhouses(c, 7, -4, 88, 94, HAUSSMANN);
    townhouses(c, 8, 150, W + 12, 94, HAUSSMANN);
    for (const [x, sd] of [[92, 31], [140, 32], [6, 33], [46, 34], [178, 35], [214, 36]] as const) planeTree(c, x, 94, sd);
    people(c, 103, 93, 0, 220, 14, ["#2f3346", "#b8402f", "#3a5a9a", "#c9a35a", "#6e4c3a"]);
    seine(c);
    bateauMouche(c, 150, 102);
    c.paint((x, y) => (bayer(x, y) < 0.3 && (y & 1) && Math.abs(x - 118) < 10 - (y - 99) * 0.6 ? P.ironDark : null), 100, 99, 136, H - 1);
  },
  drawStamp(c, x, y, w, h) {
    c.rect(x, y, w, h, "#f3e6c9");
    c.rect(x, y, 6, h, "#3a5a9a");
    c.rect(x + w - 6, y, 6, h, "#c8432f");
    const cx = x + Math.floor(w / 2);
    for (let k = 0; k < h - 2; k++) {
      const hw = Math.round(Math.pow(k / (h - 2), 2.2) * 6);
      c.hline(cx - hw, cx + hw, y + 1 + k, k > h - 6 && Math.abs(hw) > 2 ? P.ironDark : P.iron);
    }
  },
};
