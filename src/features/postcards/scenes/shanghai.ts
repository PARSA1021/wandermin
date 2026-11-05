import { bayer, rng, type PixelCanvas } from "../pixel/canvas";
import type { PostcardScene } from "../template";
import { W, H, lamp, people, sky, windows } from "./common";

/** Shanghai at blue hour: the Pudong skyline across the Huangpu from the Bund — Oriental Pearl, Jin Mao, SWFC, Shanghai Tower. */
const P = {
  sky: ["#1f2a5a", "#2f3f7a", "#4f5f9a", "#8a7fae", "#d89aa0", "#f2c08e"],
  star: "#f3ead8",
  far: "#3f4a7a", farLit: "#c8b88a",
  glass: "#4a5f94", glassLight: "#7a90c4", glassDark: "#334575", lit: "#f7d88a", litCool: "#bfe0f2", unlit: "#2c3866",
  pearl: "#e85a8a", pearlLight: "#f6a0c0", pearlDark: "#b03a66", pearlFrame: "#d8dce8", pearlFrameShade: "#9aa0b8",
  jinmao: "#5a6a8a", jinmaoLight: "#8a9aba",
  river: "#2a3a6a", riverLight: "#f2c08e", riverDark: "#1f2c56",
  boat: "#f3ead8", boatShade: "#c8bca8", boatLit: "#f7d88a", boatRed: "#c8432f",
  bund: "#d8c4a0", bundShade: "#a8946e", bundLit: "#f6dc9a", bundDark: "#8a7656", dome: "#7a9a8a",
  promenade: "#5a5a6a", rail: "#8a8a9a",
  coats: ["#f3ead8", "#c8432f", "#2f6fb0", "#f2c14e", "#2f3346"],
};

function farSkyline(c: PixelCanvas) {
  const r = rng(63);
  for (let x = 0; x < W; x += 3 + Math.floor(r() * 4)) {
    const t = 50 + Math.floor(r() * 18), w = 3 + Math.floor(r() * 4);
    c.rect(x, t, w, 66 - t, P.far);
    for (let y = t + 2; y < 65; y += 3) if (r() < 0.5) c.set(x + 1, y, P.farLit);
  }
}

function tower(c: PixelCanvas, x: number, top: number, w: number, base: number, seed: number) {
  c.rect(x, top, w, base - top, P.glass);
  c.rect(x + w - 2, top, 2, base - top, P.glassDark);
  c.rect(x, top, 1, base - top, P.glassLight);
  windows(c, seed, x + 1, top + 2, w - 3, base - top - 3, P.litCool, P.unlit, 0.35, 2, 3);
}

function shanghaiTower(c: PixelCanvas) {
  // the twisting tallest tower: tapering, with a spiralling notch and a slanted crown
  const cx = 152, top = 4, base = 68;
  for (let y = top; y < base; y++) {
    const t = (y - top) / (base - top);
    const half = 2.5 + t * 5;
    const twist = Math.sin(t * Math.PI * 1.6) * 1.2;
    for (let x = Math.round(cx - half + twist); x <= Math.round(cx + half + twist); x++) {
      const notch = Math.round(cx + twist + half * 0.6) === x;
      c.set(x, y, notch ? P.glassDark : x > cx + twist ? P.glassDark : (y % 4 === 0 ? P.glassLight : P.glass));
    }
    if (y % 4 === 2) c.set(Math.round(cx - half * 0.3 + twist), y, P.litCool);
  }
  c.set(cx + 2, top - 1, P.glassLight); c.set(cx + 3, top - 2, "#f2584a");
}

function swfc(c: PixelCanvas) {
  // Shanghai World Financial Center: a tall blade with the trapezoid "bottle opener" hole at the top
  const x0 = 168, x1 = 180, top = 12, base = 68;
  for (let y = top; y < base; y++) {
    const t = (y - top) / (base - top);
    const l = Math.round(x0 + (1 - t) * 3), r = Math.round(x1 - (1 - t) * 1);
    c.hline(l, r, y, y % 3 ? P.glass : P.glassLight);
    c.set(r, y, P.glassDark);
  }
  c.rect(172, 14, 5, 5, P.sky[1]!); // the aperture
  c.hline(171, 177, 13, P.glassLight);
}

function jinMao(c: PixelCanvas) {
  // tiered pagoda-like tower with stepped setbacks and a spire
  const cx = 136, base = 68;
  let y = base, half = 6;
  while (half >= 1) {
    const h = Math.max(3, Math.round(half * 1.8));
    c.rect(cx - half, y - h, half * 2 + 1, h, P.jinmao);
    c.set(cx + half, y - h, P.jinmaoLight);
    c.hline(cx - half, cx + half, y - h, P.jinmaoLight);
    for (let yy = y - h + 2; yy < y; yy += 2) c.set(cx - half + 1, yy, P.lit);
    y -= h; half -= 1;
  }
  c.rect(cx, y - 8, 1, 8, P.jinmaoLight);
}

function orientalPearl(c: PixelCanvas) {
  // three slanted legs and three columns carrying the two big pink spheres, the small upper pod and the spire
  const cx = 92, base = 70;
  for (const [dx, top] of [[-9, 50], [9, 50]] as const) c.line(cx + dx, base, cx + Math.sign(dx) * 2, top, P.pearlFrameShade, 2);
  for (const dx of [-3, 0, 3]) c.rect(cx + dx, 14, 1, base - 14, P.pearlFrame);
  const sphere = (cy: number, r: number) => {
    c.disc(cx, cy, r, P.pearl);
    c.disc(cx - r * 0.35, cy - r * 0.35, r * 0.45, P.pearlLight);
    for (let x = Math.round(cx - r); x <= cx + r; x++) for (let y = Math.round(cy - r); y <= cy + r; y++) {
      if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r && x > cx + r * 0.35 && bayer(x, y) < 0.6) c.set(x, y, P.pearlDark);
    }
    c.hline(Math.round(cx - r + 1), Math.round(cx + r - 1), Math.round(cy), P.pearlFrame); // light ring
  };
  sphere(54, 8.5);
  for (const sy of [36, 40]) c.disc(cx, sy, 1.6, P.pearl);
  sphere(28, 5.5);
  c.disc(cx, 17, 2.2, P.pearl);
  c.rect(cx, 2, 1, 13, P.pearlFrame);
  c.set(cx, 1, "#f2584a");
}

function river(c: PixelCanvas) {
  c.paint((x, y) => (y % 3 === 0 && bayer(x, y) < 0.3 ? P.riverDark : P.river), 0, 70, W - 1, 88);
  c.hline(0, W - 1, 70, P.riverDark);
  // skyline reflected as broken coloured streaks
  const r = rng(91);
  for (let i = 0; i < 80; i++) {
    const x = Math.floor(r() * W), y = 72 + Math.floor(r() * 15);
    const near = Math.abs(x - 92) < 9 ? P.pearlLight : Math.abs(x - 152) < 8 ? P.litCool : r() < 0.6 ? P.lit : P.riverLight;
    c.hline(x, x + Math.floor(r() * 3), y, near);
  }
  // a lit cruise boat
  const bx = 30, by = 82;
  c.rect(bx, by, 40, 3, P.boatShade);
  c.rect(bx + 4, by - 3, 30, 3, P.boat);
  c.rect(bx + 10, by - 5, 18, 2, P.boat);
  for (let x = bx + 5; x < bx + 34; x += 2) c.set(x, by - 2, P.boatLit);
  c.hline(bx + 2, bx + 38, by + 1, P.boatRed);
  c.rect(170, 84, 14, 2, P.boatShade); c.rect(173, 82, 6, 2, P.boat); c.set(175, 83, P.boatLit);
}

function bund(c: PixelCanvas) {
  // the promenade and railings in the foreground, with heritage façades lit gold at the very bottom
  c.rect(0, 89, W, 3, P.rail);
  for (let x = 0; x < W; x += 4) c.rect(x, 89, 1, 4, P.promenade);
  c.rect(0, 93, W, H - 93, P.promenade);
  for (let x = 0; x < W; x += 6) c.set(x, 96, P.rail);
  people(c, 707, 101, 6, 218, 16, P.coats, "#e0b08a");
  for (const x of [22, 70, 118, 166, 214]) lamp(c, x, 104, 14, "#2f3346", P.lit);
}

export const shanghaiScene: PostcardScene = {
  cityId: "shanghai",
  accent: "#c8325a",
  postmarkInk: "#f3ead8",
  windowFocus: [120, 40],
  description: "Pixel-art view of Shanghai's Pudong skyline at blue hour from the Bund: the pink spheres of the Oriental Pearl Tower, the tiered Jin Mao Tower, the twisting Shanghai Tower and the World Financial Center with its open top, lit windows reflected in the Huangpu River, a cruise boat, and people and lamps along the Bund promenade.",
  draw(c) {
    sky(c, P.sky, 70);
    const r = rng(11);
    for (let i = 0; i < 20; i++) { const x = Math.floor(r() * W), y = Math.floor(r() * 22); if (bayer(x, y) < 0.4) c.set(x, y, P.star); }
    farSkyline(c);
    tower(c, 110, 34, 9, 70, 1);
    tower(c, 186, 28, 10, 70, 2);
    tower(c, 200, 40, 8, 70, 3);
    tower(c, 58, 42, 8, 70, 4);
    tower(c, 120, 46, 7, 70, 5);
    jinMao(c);
    swfc(c);
    shanghaiTower(c);
    orientalPearl(c);
    river(c);
    bund(c);
  },
  drawStamp(c, x, y, w, h) {
    c.gradient(y, y + h - 1, [P.sky[1]!, P.sky[3]!, P.sky[4]!], x, x + w - 1);
    const cx = x + Math.floor(w / 2);
    c.rect(cx, y + 1, 1, h - 3, P.pearlFrame);
    c.disc(cx, y + h - 8, 3, P.pearl);
    c.disc(cx, y + 6, 2, P.pearl);
    c.rect(x, y + h - 3, w, 3, P.river);
  },
};
