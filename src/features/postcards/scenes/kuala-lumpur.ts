import { bayer, rng, type PixelCanvas } from "../pixel/canvas";
import type { PostcardScene } from "../template";
import { W, H, birds, cloud, leaf, palm, sky } from "./common";

/** Kuala Lumpur: the Petronas Twin Towers and their skybridge, KL Tower, rainforest-green KLCC park and its lake. */
const P = {
  sky: ["#3f78c0", "#62a0d8", "#96c4e6", "#cfe2ea", "#f0eedc"],
  cloud: "#fbfaf4", cloudShade: "#d4e2ea", storm: "#c8d4e0",
  steel: "#c8d0dc", steelLight: "#eef2f6", steelDark: "#8a96a8", steelDeep: "#6a7688", glass: "#7a94b8",
  city: "#a8b4c4", cityDark: "#8a98ac", cityWin: "#dbe6ee",
  kltower: "#d8dce4", kltowerShade: "#a8b0bc", pod: "#9fb4c8",
  hill: "#4f8a4e", hillDark: "#3a6a3e",
  canopy: ["#2f7a3e", "#4f9a4a", "#1f5a30", "#6fb05a"],
  lake: "#3a8aa8", lakeLight: "#9fd8e4", lakeDark: "#2a6a8a",
  fountain: "#e8f6fa", path: "#d8c8a8",
  palm: ["#3f8a4a", "#5fa85a", "#2c6a3a"], trunk: "#8a6a4a", ring: "#6a4e36",
};

function farCity(c: PixelCanvas) {
  c.paint((x, y) => {
    const t = 62 + 5 * Math.sin(x / 21) + 2 * Math.sin(x / 7);
    return y >= t && y < 80 ? (leaf(x, y) < 0.2 ? P.hillDark : P.hill) : null;
  }, 0, 52, W - 1, 80);
  const r = rng(8);
  for (let x = 0; x < W; x += 4 + Math.floor(r() * 5)) {
    if (x > 82 && x < 142) continue;
    const t = 52 + Math.floor(r() * 22), w = 4 + Math.floor(r() * 4);
    c.rect(x, t, w, 80 - t, r() < 0.35 ? P.cityDark : P.city);
    for (let y = t + 2; y < 78; y += 3) for (let i = x + 1; i < x + w - 1; i += 2) c.set(i, y, P.cityWin);
  }
}

function klTower(c: PixelCanvas) {
  const x = 40, base = 74;
  c.rect(x, 30, 3, base - 30, P.kltower);
  c.set(x + 2, 40, P.kltowerShade);
  for (let y = 31; y < base; y++) c.set(x + 2, y, P.kltowerShade);
  // the pod: an inverted cone with a glass band
  for (let k = 0; k < 7; k++) c.hline(x - 5 + Math.floor(k * 0.6), x + 7 - Math.floor(k * 0.6), 24 + k, k === 2 || k === 3 ? P.pod : k > 4 ? P.kltowerShade : P.kltower);
  c.rect(x + 1, 6, 1, 18, P.kltowerShade);
  c.set(x + 1, 5, "#f2584a");
}

/** One Petronas tower: an eight-pointed-star plan, so it reads as stacked, setback, faceted tiers with pinnacle. */
function petronas(c: PixelCanvas, cx: number, top: number, base: number, flip: boolean) {
  const tiers: [number, number][] = [[base, 9], [44, 8], [34, 7], [28, 6], [23, 5], [19, 4], [16, 3]];
  for (let i = 0; i < tiers.length - 1; i++) {
    const [yb, half] = tiers[i]!, [yt] = tiers[i + 1]!;
    for (let y = yt; y < yb; y++) {
      for (let x = cx - half; x <= cx + half; x++) {
        const dx = x - cx;
        // vertical fluting of the facets; the side away from the sun is darker
        const facet = ((dx + 20) % 3) === 0;
        const shade = flip ? dx < -half / 3 : dx > half / 3;
        let col = shade ? (facet ? P.steelDeep : P.steelDark) : facet ? P.steelLight : P.steel;
        if (y % 3 === 0 && !facet) col = shade ? P.steelDeep : P.glass;
        c.set(x, y, col);
      }
    }
    c.hline(cx - half, cx + half, yt, P.steelLight); // setback ledge
  }
  // spire
  c.rect(cx, top, 1, 16 - top, P.steelLight);
  c.rect(cx - 1, 10, 3, 6, P.steel);
  c.set(cx + (flip ? -1 : 1), 12, P.steelDark);
}

function skybridge(c: PixelCanvas, xl: number, xr: number) {
  // the double-deck bridge at levels 41–42 and its inverted-V support legs
  c.rect(xl, 46, xr - xl, 3, P.steelDark);
  c.hline(xl, xr - 1, 46, P.steelLight);
  const mid = Math.round((xl + xr) / 2);
  c.line(xl, 60, mid, 49, P.steelDark);
  c.line(xr - 1, 60, mid, 49, P.steelDark);
}

function park(c: PixelCanvas) {
  // KLCC park: a dense rainforest canopy in clumps, a lake with the fountain, a path
  c.paint((x, y) => {
    const t = 80 + Math.sin(x / 6) * 1.5 + Math.sin(x / 17) * 2;
    if (y < t) return null;
    const l = leaf(x, y);
    return P.canopy[l < 0.2 ? 3 : l < 0.6 ? 0 : l < 0.85 ? 1 : 2]!;
  }, 0, 76, W - 1, 92);
  c.paint((x, y) => {
    const inLake = ((x - 112) / 70) ** 2 + ((y - 99) / 9) ** 2 <= 1;
    if (!inLake) return null;
    return y % 3 === 0 && bayer(x, y) < 0.3 ? P.lakeLight : bayer(x, y) < 0.1 ? P.lakeDark : P.lake;
  }, 40, 88, 184, H - 1);
  // twin towers reflected faintly in the lake
  for (let y = 92; y < 104; y += 2) for (const x of [100, 101, 123, 124]) c.set(x, y, P.steel);
  // fountain jets
  for (const fx of [84, 112, 140]) {
    for (let k = 0; k < 6; k++) c.set(fx, 96 - k, P.fountain);
    c.set(fx - 1, 91, P.fountain); c.set(fx + 1, 91, P.fountain); c.set(fx - 2, 93, P.fountain); c.set(fx + 2, 93, P.fountain);
  }
  // paths and foreground shrubs
  c.paint((x, y) => (((x - 112) / 74) ** 2 + ((y - 99) / 11) ** 2 <= 1 && ((x - 112) / 70) ** 2 + ((y - 99) / 9) ** 2 > 1 ? P.path : null), 30, 86, 194, H - 1);
  c.paint((x, y) => (((x - 112) / 74) ** 2 + ((y - 99) / 11) ** 2 > 1 && y > 92 ? P.canopy[leaf(x, y) < 0.3 ? 1 : 0]! : null), 0, 92, W - 1, H - 1);
}

export const kualaLumpurScene: PostcardScene = {
  cityId: "kuala-lumpur",
  accent: "#2a7a8a",
  windowFocus: [112, 40],
  description: "Pixel-art view of Kuala Lumpur: the faceted steel Petronas Twin Towers with their tiered setbacks, pinnacles and the skybridge between them, the KL Tower on a green hill, the city skyline, and the rainforest canopy of KLCC Park around a lake with fountains reflecting the towers.",
  draw(c) {
    sky(c, P.sky, 80);
    cloud(c, 150, 210, 16, P.cloud, P.cloudShade, 3);
    cloud(c, 10, 60, 12, P.cloud, P.cloudShade, 2);
    cloud(c, 170, 200, 34, P.storm, P.cloudShade);
    birds(c, 51, 140, 20, 190, 40, 4, "#3a4a5a");
    farCity(c);
    klTower(c);
    petronas(c, 100, 2, 80, false);
    petronas(c, 124, 2, 80, true);
    skybridge(c, 109, 116);
    park(c);
    palm(c, 14, 100, 22, 1, P.palm, P.trunk, P.ring);
    palm(c, 210, 100, 24, -1, P.palm, P.trunk, P.ring);
  },
  drawStamp(c, x, y, w, h) {
    c.gradient(y, y + h - 1, [P.sky[1]!, P.sky[3]!], x, x + w - 1);
    for (const tx of [x + 6, x + w - 7]) {
      c.rect(tx - 2, y + 6, 5, h - 6, P.steel);
      c.rect(tx - 1, y + 3, 3, 3, P.steel);
      c.rect(tx, y + 1, 1, 2, P.steelLight);
    }
    c.rect(x + 9, y + 10, w - 18, 1, P.steelDark);
  },
};
