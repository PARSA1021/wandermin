import { bayer, rng, type PixelCanvas } from "../pixel/canvas";
import type { PostcardScene } from "../template";
import { W, H, cloud, leaf, sky } from "./common";

/** Cusco: the Plaza de Armas — the cathedral's twin towers, red-tile roofs climbing to Andean peaks, Inca stone walls, a llama. */
const P = {
  sky: ["#2f6ac0", "#4f8ad4", "#86b4e4", "#c4dcec", "#eef0e4"],
  cloud: "#fbfaf4", cloudShade: "#d0dcea",
  peak: "#7a8a9a", peakShade: "#5f6e80", snow: "#f3f6f8", hill: "#6a8a4a", hillDark: "#4f6e3a", hillLight: "#8aa85a",
  stone: "#a8947a", stoneShade: "#867460", stoneDark: "#6a5a48", stoneLight: "#c8b498",
  arch: "#4a3e34", doorWood: "#5a3a24",
  roof: "#c8603a", roofDark: "#9a4428", roofLight: "#e08050",
  white: "#f3ece0", whiteShade: "#d4c8b4", balcony: "#3a5a8a", balconyWood: "#6a4a2a",
  inca: "#9a8a76", incaLight: "#b8a890", incaDark: "#6a5c4c",
  plaza: "#c8b89a", plazaShade: "#a8987a", grass: "#6a9a4a", fountain: "#d8d0c0",
  llama: "#f0e8dc", llamaShade: "#c8bca8", llamaDark: "#5a4a3a",
  textile: ["#e8483a", "#f2a62e", "#c8327a", "#2f8f6a", "#3a5ab0"],
  skin: "#a8704a",
};

function andes(c: PixelCanvas) {
  c.paint((x, y) => {
    const t = 30 + Math.abs(Math.sin(x / 26)) * 12 + Math.sin(x / 7) * 2 + (x > 140 ? -6 : 0);
    if (y < t || y > 60) return null;
    const d = y - t;
    if (d < 4 && (x % 3 !== 0 || d < 2)) return P.snow;
    return (Math.round(x * 0.7 + y) % 8 === 0) ? P.peakShade : x % 30 > 18 ? P.peakShade : P.peak;
  }, 0, 18, W - 1, 60);
  c.paint((x, y) => {
    const t = 48 + Math.sin(x / 17) * 5;
    if (y < t || y > 70) return null;
    const l = leaf(x, y);
    return l < 0.2 ? P.hillLight : l > 0.8 ? P.hillDark : P.hill;
  }, 0, 38, W - 1, 70);
}

function roofs(c: PixelCanvas) {
  // the terracotta city spilling up the hills
  const r = rng(303);
  for (let row = 0; row < 4; row++) {
    const base = 58 + row * 5;
    for (let x = -6 + (row % 2) * 5; x < W; x += 9 + Math.floor(r() * 4)) {
      const w = 8 + Math.floor(r() * 4);
      c.rect(x, base - 3, w, 4, r() < 0.3 ? P.whiteShade : P.white);
      for (let k = 0; k < 3; k++) c.hline(x - 1 + k, x + w - k, base - 4 - k, k === 0 ? P.roofDark : (x + k) % 3 ? P.roof : P.roofLight);
    }
  }
}

function cathedral(c: PixelCanvas) {
  const cx = 112, base = 86;
  // main façade between the towers
  c.rect(cx - 22, 52, 45, base - 52, P.stone);
  c.rect(cx + 18, 52, 5, base - 52, P.stoneShade);
  for (let y = 54; y < base; y += 4) for (let x = cx - 22; x < cx + 23; x++) if ((x + Math.floor(y / 4) * 3) % 7 === 0) c.set(x, y, P.stoneShade);
  // retablo-style portal: stacked columns and niches, round arch door
  c.rect(cx - 9, 56, 19, base - 56, P.stoneLight);
  for (const px of [cx - 8, cx - 5, cx + 5, cx + 8]) { c.rect(px, 58, 1, base - 58, P.stoneShade); }
  for (let y = 70; y < base; y++) { const t = Math.max(0, (74 - y) / 4); const hw = Math.round(3 * Math.sqrt(Math.max(0, 1 - t * t))) + (y < 72 ? 0 : 1); c.hline(cx - hw, cx + hw, y, P.doorWood); }
  c.rect(cx - 1, 60, 3, 5, P.arch); c.set(cx, 59, P.arch);
  for (let k = 0; k < 5; k++) c.hline(cx - 9 + k * 2, cx + 9 - k * 2, 55 - k, P.stoneLight);
  c.rect(cx, 46, 1, 4, P.stoneDark); c.hline(cx - 1, cx + 1, 47, P.stoneDark); // cross
  // twin bell towers with belfry arches and small domes
  for (const tx of [cx - 30, cx + 22]) {
    c.rect(tx, 40, 9, base - 40, P.stone);
    c.rect(tx + 6, 40, 3, base - 40, P.stoneShade);
    c.hline(tx - 1, tx + 9, 52, P.stoneLight);
    c.rect(tx + 2, 43, 2, 6, P.arch); c.rect(tx + 5, 43, 2, 6, P.arch);
    c.set(tx + 2, 42, P.arch); c.set(tx + 6, 42, P.arch);
    c.hline(tx - 1, tx + 9, 40, P.stoneLight);
    for (let x = tx; x < tx + 9; x += 2) c.set(x, 39, P.stone);
    c.disc(tx + 4, 36, 3.5, P.stone);
    c.disc(tx + 5, 36, 2, P.stoneShade);
    c.rect(tx + 4, 29, 1, 4, P.stoneDark); c.hline(tx + 3, tx + 5, 30, P.stoneDark);
  }
}

function colonialBalconies(c: PixelCanvas) {
  // white arcaded houses with the famous carved wooden balconies flanking the plaza
  for (const [x0, x1] of [[0, 76], [150, W]] as const) {
    c.rect(x0, 66, x1 - x0, 22, P.white);
    for (let x = x0; x < x1; x += 2) c.set(x, 66, P.roofDark);
    for (let k = 0; k < 2; k++) c.hline(x0, x1 - 1, 64 + k, k ? P.roof : P.roofDark);
    for (let x = x0 + 3; x < x1 - 4; x += 8) {
      c.rect(x, 69, 6, 6, P.balconyWood);
      for (let i = x + 1; i < x + 6; i += 2) c.rect(i, 70, 1, 4, P.balcony);
      c.hline(x - 1, x + 6, 75, P.balconyWood);
      c.rect(x + 1, 79, 4, 9, P.arch); c.hline(x + 2, x + 3, 78, P.arch);
    }
  }
}

function plaza(c: PixelCanvas) {
  // Inca stonework base: big polygonal blocks fitted without mortar
  c.paint((x, y) => {
    const row = Math.floor((y - 88) / 4), off = row * 5;
    const sx = (x + off) % 9, sy = (y - 88) % 4;
    if (sx === 0 || sy === 0) return P.incaDark;
    return sx < 3 && sy === 1 ? P.incaLight : bayer(x, y) < 0.1 ? P.incaLight : P.inca;
  }, 0, 88, W - 1, 95);
  c.paint((x, y) => (bayer(x, y) < 0.15 ? P.plazaShade : P.plaza), 0, 96, W - 1, H - 1);
  // a woman in a bright woven shawl and montera hat with her llama
  const wx = 150, wy = 106;
  c.rect(wx, wy - 9, 5, 9, P.textile[0]!);
  for (let i = 0; i < 5; i++) c.set(wx + i, wy - 6, P.textile[(i + 1) % 5]!);
  for (let i = 0; i < 5; i++) c.set(wx + i, wy - 3, P.textile[(i + 3) % 5]!);
  c.rect(wx + 1, wy - 12, 3, 3, P.skin);
  c.hline(wx - 1, wx + 5, wy - 13, P.textile[3]!); c.hline(wx, wx + 4, wy - 14, P.textile[3]!);
  // llama: long neck, upright ears, woolly body, a tasseled harness
  const lx = 160, ly = 106;
  c.rect(lx, ly - 9, 12, 5, P.llama);
  c.hline(lx, lx + 11, ly - 5, P.llamaShade);
  for (const k of [lx + 1, lx + 3, lx + 9, lx + 11]) c.rect(k, ly - 4, 1, 4, P.llamaShade);
  c.rect(lx + 10, ly - 17, 3, 9, P.llama);
  c.rect(lx + 11, ly - 19, 4, 3, P.llama);
  c.set(lx + 14, ly - 18, P.llamaDark);
  c.set(lx + 11, ly - 21, P.llama); c.set(lx + 11, ly - 20, P.llama); c.set(lx + 13, ly - 21, P.llama); c.set(lx + 13, ly - 20, P.llama);
  for (let i = 0; i < 3; i++) c.set(lx + 10 + i, ly - 12, P.textile[i]!);
  c.set(lx + 9, ly - 13, P.textile[2]!); c.set(lx + 13, ly - 13, P.textile[1]!);
  // garden beds and the fountain
  for (const [gx0, gx1] of [[20, 70], [80, 134], [190, 222]] as const) c.rect(gx0, 98, gx1 - gx0, 3, P.grass);
  c.rect(100, 92, 24, 6, P.fountain); c.rect(108, 86, 8, 6, P.fountain); c.rect(111, 82, 2, 4, P.fountain);
}

export const cuscoScene: PostcardScene = {
  cityId: "cusco",
  accent: "#c8503a",
  windowFocus: [112, 44],
  description: "Pixel-art view of Cusco's Plaza de Armas: the stone cathedral with its twin bell towers and carved portal, white colonial arcades with carved wooden balconies, terracotta roofs climbing green hills towards snowy Andean peaks, fitted Inca stonework, a fountain, and a woman in a bright woven shawl with her llama.",
  draw(c) {
    sky(c, P.sky, 50);
    cloud(c, 40, 100, 10, P.cloud, P.cloudShade, 3);
    cloud(c, 150, 186, 16, P.cloud, P.cloudShade);
    andes(c);
    roofs(c);
    colonialBalconies(c);
    cathedral(c);
    plaza(c);
    const r = rng(2);
    for (let i = 0; i < 8; i++) { const x = 6 + Math.floor(r() * 130), col = P.textile[i % 5]!; c.rect(x, 101, 2, 5, col); c.set(x, 100, P.skin); }
  },
  drawStamp(c, x, y, w, h) {
    c.gradient(y, y + h - 1, [P.sky[1]!, P.sky[3]!], x, x + w - 1);
    for (let i = x; i < x + w; i++) { const t = y + 4 + Math.abs(((i - x) % 10) - 5); for (let yy = t; yy < y + 10; yy++) c.set(i, yy, yy < t + 2 ? P.snow : P.peak); }
    const base = y + h - 2;
    for (const tx of [x + 3, x + w - 7]) c.rect(tx, base - 10, 4, 10, P.stone);
    c.rect(x + 7, base - 7, w - 14, 7, P.stone);
  },
};
