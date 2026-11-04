import { bayer, rng, type PixelCanvas } from "../pixel/canvas";
import type { PostcardScene } from "../template";
import { W, H, birds, cloud, foliage, people, ridge, sky } from "./common";

/** Rome in golden afternoon light: the Colosseum with its broken outer ring, stone pines and cypresses. */
const P = {
  sky: ["#5a78a8", "#7f9ac0", "#b3c3d4", "#e6d6bc", "#f2d9a8"],
  cloud: "#f8efdc", cloudShade: "#e0d2bd",
  hills: "#a7b08a", hillsDark: "#8f9a76",
  trav: "#dcbc8c", travShade: "#b8946a", travLight: "#eed6a8", arch: "#6a4a34", archDeep: "#4f3626", inner: "#c49e72",
  pine: "#3f5a3a", pineLight: "#58764e", pineDark: "#2e4430", trunk: "#6a4a36",
  cypress: "#2f4a34", cypressLight: "#466a48",
  grass: "#a6a66a", grassDark: "#8c8c58", road: "#cdb995", roadDither: "#b7a27c",
};

function colosseum(c: PixelCanvas, cx: number) {
  const hw = 62, base = 92;
  const levels = [ // [height of level, has arches]
    [11, true], [11, true], [11, true], [8, false],
  ] as const;
  // seen from street level the near half of the ellipse "smiles": its ends sit higher than its middle
  const lift = (x: number) => Math.round(((x - cx) / hw) ** 2 * 6);
  // height of the surviving outer wall: full on the left, broken stepping down on the right
  const ruin = (x: number) => (x < cx + 10 ? 41 : x < cx + 24 ? 41 - Math.round((x - cx - 10) * 0.9) - ((x * 7) % 3) : 22 - ((x * 5) % 3));
  // inner ring visible behind the broken part
  for (let x = cx; x <= cx + hw - 4; x++) {
    const top = base - 30 - lift(x) - 4;
    for (let y = top; y < base - 20 - lift(x); y++) c.set(x, y, (x % 5 === 0) ? P.arch : P.inner);
  }
  for (let x = cx - hw; x <= cx + hw; x++) {
    const b = base - lift(x) - 2;
    const height = ruin(x);
    let yTop = b;
    let acc = 0;
    for (const [lh, arches] of levels) {
      if (acc >= height) break;
      const h = Math.min(lh, height - acc);
      for (let k = 0; k < h; k++) {
        const y = b - acc - k;
        const inBay = ((x - cx + 200) % 8);
        const archOpen = arches && inBay >= 2 && inBay <= 5 && k >= 2 && k <= lh - 3 && !(k === lh - 3 && (inBay === 2 || inBay === 5));
        const capital = k === lh - 2 && (inBay === 0 || inBay === 7);
        const atticWindow = !arches && k >= 3 && k <= 4 && inBay % 8 === 3 && ((x - cx + 200) % 16 < 8);
        const col = archOpen ? (inBay === 5 ? P.archDeep : P.arch)
          : atticWindow ? P.arch
          : capital ? P.travLight
          : k === lh - 1 ? P.travLight
          : inBay === 0 ? P.travShade
          : inBay === 7 ? P.travLight
          : bayer(x, y) < 0.12 ? P.travShade : P.trav;
        c.set(x, y, col);
      }
      acc += lh;
      yTop = b - acc;
    }
    // shading towards the right end of the ellipse
    if (x > cx + hw - 10) for (let y = yTop; y <= b; y++) if (bayer(x, y) < 0.3 && c.get(x, y) === P.trav) c.set(x, y, P.travShade);
    for (let y = b + 1; y <= base + 4; y++) c.set(x, y, y === b + 1 ? P.travShade : P.trav);
  }
}

/** St Peter's dome far away on the left, softened by the haze. */
function stPeters(c: PixelCanvas, cx: number) {
  const haze = "#b9b9a8", hazeDark = "#a5a796";
  c.rect(cx - 14, 66, 28, 10, haze);
  c.rect(cx + 8, 66, 6, 10, hazeDark);
  c.rect(cx - 8, 60, 16, 6, haze);
  for (let y = 46; y < 60; y++) {
    const hw = Math.sqrt(Math.max(0, 1 - ((60 - y) / 14) ** 2)) * 9;
    c.hline(Math.round(cx - hw), Math.round(cx + hw), y, y > 56 ? hazeDark : haze);
  }
  c.rect(cx - 1, 42, 3, 4, haze);
  c.set(cx, 40, hazeDark); c.set(cx, 41, hazeDark);
}

/** Sampietrini cobbles: a grid of small rounded setts. */
function cobbles(c: PixelCanvas, y0: number) {
  c.paint((x, y) => {
    const row = Math.floor((y - y0) / 2);
    const gx = (x + (row % 2) * 2) % 4, gy = (y - y0) % 2;
    return gx === 0 || gy === 1 ? P.roadDither : P.road;
  }, 0, y0, W - 1, H - 1);
}

function vespa(c: PixelCanvas, x: number, base: number) {
  const red = "#c8432f", dark = "#2b2b33", chrome = "#d9dde0";
  c.disc(x + 2, base - 2, 2, dark);
  c.disc(x + 12, base - 2, 2, dark);
  c.rect(x + 1, base - 6, 7, 3, red);
  c.rect(x + 3, base - 8, 5, 2, red);
  c.line(x + 9, base - 3, x + 12, base - 9, red);
  c.hline(x + 10, x + 13, base - 10, chrome);
  c.rect(x + 3, base - 9, 4, 1, dark); // saddle
  c.set(x + 13, base - 8, "#f2cf6a");
}

function stonePine(c: PixelCanvas, x: number, base: number, h: number, w: number, seed: number) {
  c.line(x, base, x + 2, base - h + 4, P.trunk, 2);
  const r = rng(seed);
  const cy = base - h;
  // flat umbrella canopy
  for (let k = 0; k < 7; k++) {
    const hw = w * Math.sqrt(1 - ((k - 3) / 4) ** 2);
    for (let xx = Math.round(x + 2 - hw); xx <= Math.round(x + 2 + hw); xx++) {
      const col = k < 2 ? P.pineLight : k > 4 ? P.pineDark : r() < 0.2 ? P.pineLight : P.pine;
      c.set(xx, cy - 3 + k, col);
    }
  }
}

function cypress(c: PixelCanvas, x: number, base: number, h: number) {
  for (let y = base - h; y <= base; y++) {
    const t = (y - (base - h)) / h;
    const hw = 0.5 + Math.sin(Math.min(1, t * 1.3) * Math.PI * 0.55) * 3;
    for (let xx = Math.round(x - hw); xx <= Math.round(x + hw); xx++) c.set(xx, y, xx > x ? P.cypress : bayer(xx, y) < 0.3 ? P.cypressLight : P.cypress);
  }
}

export const romeScene: PostcardScene = {
  cityId: "rome",
  accent: "#9a4a2a",
  description: "Pixel-art view of Rome in golden afternoon light: the Colosseum with arched travertine tiers, pilasters and its broken outer ring, St Peter's dome in the haze, stone pines and cypresses, strollers and a red Vespa on the cobbles.",
  draw(c) {
    sky(c, P.sky);
    cloud(c, 18, 70, 22, P.cloud, P.cloudShade);
    cloud(c, 140, 190, 18, P.cloud, P.cloudShade);
    ridge(c, (x) => 76 + 3 * Math.sin(x / 17) + Math.sin(x / 5), P.hills, P.hillsDark);
    stPeters(c, 30);
    ridge(c, (x) => 78 + 2 * Math.sin(x / 9), P.hillsDark);
    birds(c, 111, 60, 16, 140, 34, 6, "#6a5a4a");
    colosseum(c, 112);
    c.paint((x, y) => (bayer(x, y) < 0.18 ? P.grassDark : P.grass), 0, 96, W - 1, 99);
    cobbles(c, 100);
    foliage(c, 112, 30, 97, 7, ["#5f8a5a", "#7fa66e", "#46684a", "#f09ab0", "#fbd0dc"]);
    foliage(c, 113, 196, 98, 6, ["#5f8a5a", "#7fa66e", "#46684a", "#f09ab0", "#fbd0dc"]);
    people(c, 114, 104, 70, 160, 10, ["#2f3346", "#c8432f", "#3a5a9a", "#e2b84a", "#f3ead8", "#6e4c3a"]);
    vespa(c, 160, 106);
    stonePine(c, 14, 104, 44, 18, 1);
    stonePine(c, 204, 104, 38, 16, 2);
    stonePine(c, 182, 100, 30, 11, 3);
    cypress(c, 40, 102, 34);
    cypress(c, 48, 101, 26);
    cypress(c, 166, 101, 28);
  },
  drawStamp(c, x, y, w, h) {
    c.rect(x, y, w, h, "#f3e6c9");
    for (let lvl = 0; lvl < 3; lvl++) {
      const yy = y + h - 4 - lvl * 5;
      c.rect(x + 1, yy - 4, w - 2, 5, P.trav);
      for (let i = x + 2; i < x + w - 2; i += 3) c.rect(i, yy - 3, 1, 3, P.arch);
    }
    c.rect(x + 1, y + 1, w - 2, 2, P.travLight);
  },
};
