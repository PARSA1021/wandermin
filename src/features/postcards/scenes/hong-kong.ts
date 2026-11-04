import { bayer, rng, type PixelCanvas } from "../pixel/canvas";
import type { PostcardScene } from "../template";
import { W, H, ridge, sky } from "./common";

/** Hong Kong at blue hour: Victoria Peak, the lit harbour skyline, neon reflections and a red-sailed junk. */
const P = {
  sky: ["#1f2648", "#2b3561", "#3e4a7b", "#5d5f8c", "#8a7391"],
  star: "#e9e3c8", starDim: "#9d9ab8",
  peak: "#2c3656", peakCrest: "#3b466a", peakLight: "#344062",
  tower: "#3e4a6e", towerDark: "#2c3552", towerLight: "#55628a",
  lit: "#f2cf6a", litDim: "#c8a65a", litCool: "#bcd3e8",
  neon1: "#e0607e", neon2: "#5fc2c9", neon3: "#f09a4a",
  water: "#232c4c", waterLight: "#3c4876", waterDark: "#1a2038",
  hull: "#4a2a22", hullLight: "#6b3d2c", sail: "#c0442e", sailDark: "#8e2f22", batten: "#e07a4a",
};

function backdrop(c: PixelCanvas) {
  sky(c, P.sky, 80);
  const r = rng(23);
  for (let i = 0; i < 40; i++) {
    const x = Math.floor(r() * W), y = Math.floor(r() * 44);
    c.set(x, y, r() < 0.3 ? P.star : P.starDim);
  }
  c.disc(52, 18, 4, "#efe6c6"); // moon
  c.disc(54, 17, 3.2, P.sky[0]!);
  ridge(c, (x) => 52 - Math.max(0, 14 - Math.abs(x - 120) * 0.22) + 2 * Math.sin(x / 9) + Math.sin(x / 3), P.peak, P.peakCrest, P.peakLight, 0.2);
  // lights scattered up the Peak
  for (let i = 0; i < 46; i++) {
    const x = Math.floor(r() * W), y = Math.floor(50 + r() * 26);
    if (c.get(x, y) !== P.peak && c.get(x, y) !== P.peakLight) continue;
    c.set(x, y, r() < 0.6 ? P.litDim : P.litCool);
  }
}

function skyline(c: PixelCanvas) {
  const r = rng(29);
  const base = 90;
  const towers: [number, number, number][] = [
    [0, 9, 70], [10, 7, 62], [18, 10, 66], [30, 8, 56], [39, 6, 64], [46, 9, 60], [62, 8, 58], [71, 7, 68], [79, 9, 54],
    [128, 9, 52], [138, 7, 60], [146, 10, 48], [157, 8, 58], [166, 9, 64], [176, 7, 56], [184, 10, 62], [195, 8, 68], [204, 9, 60], [214, 10, 66],
  ];
  for (const [x, w, t] of towers) {
    c.rect(x, t, w, base - t, P.tower);
    c.rect(x + w - 2, t, 2, base - t, P.towerDark);
    c.hline(x, x + w - 3, t, P.towerLight);
    for (let y = t + 2; y < base - 1; y += 2) for (let i = x + 1; i < x + w - 2; i += 2) if (r() < 0.45) c.set(i, y, r() < 0.8 ? P.lit : P.litCool);
  }
  // Two IFC-like tapering tower
  const ix = 100;
  for (let y = 22; y < base; y++) {
    const hw = y < 30 ? 2 + (y - 22) * 0.4 : 5 + (y - 30) * 0.03;
    c.hline(Math.round(ix - hw), Math.round(ix + hw), y, y % 6 === 0 ? P.towerLight : P.tower);
  }
  for (let y = 32; y < base - 2; y += 3) for (let x = ix - 4; x <= ix + 4; x += 2) if (r() < 0.6) c.set(x, y, P.litCool);
  for (const dx of [-3, 3]) c.rect(ix + dx, 18, 1, 5, P.towerLight);
  // Bank-of-China-like tower: stacked triangular facets
  const bx = 116;
  for (let y = 26; y < base; y++) {
    const hw = 3 + (y - 26) * 0.08;
    for (let x = Math.round(bx - hw); x <= Math.round(bx + hw); x++) {
      const facet = ((y - 26) % 14) < (x - bx + hw) * 1.6; // X-bracing reads as diagonals
      c.set(x, y, facet ? P.towerLight : P.tower);
    }
  }
  c.rect(bx, 18, 1, 8, P.towerLight);
  // neon signs on the shorefront
  const neon = [P.neon1, P.neon2, P.neon3];
  for (let x = 4; x < W; x += 13) c.rect(x, 84 + (x % 3), 3, 2, neon[(x / 13) % 3 | 0]!);
}

function harbour(c: PixelCanvas) {
  c.rect(0, 91, W, H - 91, P.water);
  c.hline(0, W - 1, 91, P.waterDark);
  // light reflections: broken vertical streaks under lit columns
  for (let x = 0; x < W; x++) {
    const src = [...Array(12)].map((_, k) => c.get(x, 88 - k * 3)).find((col) => col === P.lit || col === P.litCool || col === P.neon1 || col === P.neon2 || col === P.neon3);
    if (!src) continue;
    for (let y = 93; y < H; y++) if (bayer(x, y) < 0.45 - (y - 93) * 0.025 && (y % 2 === 0)) c.set(x, y, src);
  }
  const r = rng(31);
  for (let i = 0; i < 26; i++) c.hline(Math.floor(r() * W), Math.floor(r() * W) % W, 93 + Math.floor(r() * 14), P.waterLight);
}

function junk(c: PixelCanvas, x0: number) {
  // hull
  for (let k = 0; k < 5; k++) c.hline(x0 + k * 1, x0 + 34 - k * 2, 98 + k, k === 0 ? P.hullLight : P.hull);
  c.rect(x0 + 28, 94, 7, 4, P.hull);
  // three battened sails
  const sail = (sx: number, top: number, w: number, h: number) => {
    for (let y = 0; y < h; y++) {
      const hw = w * (0.55 + 0.45 * (y / h));
      for (let x = 0; x < hw; x++) c.set(sx + x, top + y, x > hw - 3 ? P.sailDark : P.sail);
      if (y % 4 === 0) c.hline(sx, sx + Math.round(hw) - 1, top + y, P.batten);
    }
    c.rect(sx - 1, top - 2, 1, h + 4, P.hull);
  };
  sail(x0 + 6, 72, 11, 25);
  sail(x0 + 18, 78, 9, 19);
  sail(x0 + 1, 84, 5, 13);
  // reflection
  for (let y = 104; y < H; y++) for (let x = x0 + 2; x < x0 + 30; x++) if (bayer(x, y) < 0.3 && (y & 1)) c.set(x, y, P.sailDark);
}

export const hongKongScene: PostcardScene = {
  cityId: "hong-kong",
  accent: "#c0442e",
  postmarkInk: "#e9dcb8",
  description: "Pixel-art view of Hong Kong at blue hour: lit skyscrapers along Victoria Harbour under Victoria Peak, neon reflections on the water and a red-sailed junk boat.",
  draw(c) {
    backdrop(c);
    skyline(c);
    harbour(c);
    junk(c, 154);
    // Star Ferry crossing, a sampan, vertical neon signs on the waterfront
    const fx = 40, fy = 101;
    c.rect(fx, fy, 40, 3, "#2f6a4a");
    c.hline(fx + 1, fx + 38, fy + 3, "#22503a");
    c.rect(fx + 3, fy - 4, 34, 4, "#e9e6dc");
    c.rect(fx + 6, fy - 7, 28, 3, "#e9e6dc");
    c.hline(fx + 3, fx + 36, fy - 4, "#2f6a4a");
    c.hline(fx + 6, fx + 33, fy - 8, "#2f6a4a");
    for (let x = fx + 4; x < fx + 36; x += 3) c.set(x, fy - 2, "#f2cf6a");
    for (let x = fx + 7; x < fx + 33; x += 3) c.set(x, fy - 6, "#f2cf6a");
    c.rect(fx + 18, fy - 11, 2, 3, "#2f6a4a");
    for (let k = 0; k < 3; k++) c.hline(120 + k, 136 - k, 104 + k, k === 0 ? "#6b3d2c" : "#4a2a22");
    c.polygon([[124, 104], [128, 98], [132, 104]], "#3b2a26");
    for (const [x, col] of [[8, "#e0607e"], [36, "#5fc2c9"], [68, "#f09a4a"], [140, "#e0607e"], [172, "#5fc2c9"], [206, "#f09a4a"]] as const) {
      c.rect(x, 70, 3, 12, col);
      for (let y = 71; y < 81; y += 2) c.set(x + 1, y, "#fff4d6");
    }
  },
  drawStamp(c, x, y, w, h) {
    c.rect(x, y, w, h, "#2b3561");
    for (let i = 0; i < 5; i++) c.set(x + 2 + i * 4, y + 2 + (i % 2), P.star);
    const sx = x + 6;
    for (let k = 0; k < 11; k++) c.hline(sx, sx + Math.round(4 + k * 0.6), y + 4 + k, k % 3 === 0 ? P.batten : P.sail);
    c.rect(sx - 1, y + 3, 1, 13, P.hullLight);
    c.hline(x + 3, x + w - 4, y + h - 2, P.hullLight);
    c.hline(x + 4, x + w - 5, y + h - 1, P.hull);
  },
};
