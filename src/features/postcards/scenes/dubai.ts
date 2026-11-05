import { bayer, rng, type PixelCanvas } from "../pixel/canvas";
import type { PostcardScene } from "../template";
import { W, H, birds, palm, sky, windows } from "./common";

/** Dubai at golden hour: Burj Khalifa's stepped needle over Downtown, the fountain lake, the desert and a dhow. */
const P = {
  sky: ["#4a78b8", "#7aa0cc", "#c8c0b8", "#f0c89a", "#f8dcae"],
  sun: "#fbe6b8", haze: "#e8c8a0",
  glass: "#8aa4c4", glassLight: "#dbe8f2", glassDark: "#5a7498", glassWarm: "#f2d0a0",
  tower: "#b8bcc4", towerDark: "#9aa0ac", towerWin: "#e6eef4", hazeGlass: "#a8b4c4",
  dune: "#e8b878", duneShade: "#c8945a", duneLight: "#f4d4a0",
  lake: "#3a7ab0", lakeLight: "#f6d6a8", lakeDark: "#2a5f90", jet: "#f4fbfc",
  promenade: "#d8c4a4", promenadeShade: "#b8a080",
  souk: "#d8a870", soukShade: "#b88850", soukDark: "#8a6238", wind: "#c89a64",
  dhow: "#8a5a32", dhowDark: "#5a3a20", sail: "#f3ead8",
  palm: ["#4f8a4a", "#6fa85a", "#3a6a3a"], trunk: "#8a6a44", ring: "#6a4e30",
  coats: ["#f3f0e6", "#2f3346", "#c8432f", "#f2c14e", "#3a78c8"],
};

function dunes(c: PixelCanvas) {
  c.paint((x, y) => {
    const t = 70 + 4 * Math.sin(x / 26 + 2) + 2 * Math.sin(x / 9);
    if (y < t || y > 80) return null;
    const ripple = Math.round(y + Math.sin(x / 4)) % 3 === 0;
    return y - t < 1 ? P.duneLight : ripple ? P.duneShade : P.dune;
  }, 0, 60, W - 1, 80);
}

function downtown(c: PixelCanvas) {
  const r = rng(71);
  for (let x = 0; x < W; x += 5 + Math.floor(r() * 4)) {
    if (x > 92 && x < 132) continue;
    const t = 38 + Math.floor(r() * 34), w = 5 + Math.floor(r() * 5);
    const col = r() < 0.4 ? P.hazeGlass : P.tower;
    c.rect(x, t, w, 80 - t, col);
    c.rect(x + w - 2, t, 2, 80 - t, P.towerDark);
    // desert haze softens the skyline so the Burj stands out
    for (let y = t; y < 80; y++) for (let i = x; i < x + w; i++) if (bayer(i, y) < 0.25) c.set(i, y, P.haze);
    windows(c, Math.floor(r() * 999), x + 1, t + 2, w - 3, 76 - t, P.glassWarm, col, 0.25, 2, 2);
    if (r() < 0.25) c.rect(x + Math.floor(w / 2), t - 4, 1, 4, P.towerDark);
  }
  // the twisting Cayan-like and Emirates-towers-like silhouettes for variety
  for (const [x, t] of [[30, 26], [190, 30]] as const) {
    for (let y = t; y < 80; y++) {
      const half = 3 + Math.round(Math.sin((y - t) / 8) * 1);
      c.hline(x - half, x + half, y, y % 3 ? P.glass : P.glassLight);
      c.set(x + half, y, P.glassDark);
    }
    c.line(x - 3, t, x + 3, t - 6, P.glassDark);
  }
}

function burjKhalifa(c: PixelCanvas) {
  // Y-shaped plan → a cluster of setback wings spiralling up to a long spire
  const cx = 112, base = 80;
  const wings: [number, number, number][] = [
    // [dx, top, halfWidth]
    [-8, 62, 3], [8, 58, 3], [-6, 50, 3], [6, 44, 3], [-4, 36, 2], [4, 30, 2], [-2, 24, 2], [2, 20, 2],
  ];
  for (const [dx, top, hw] of wings) {
    for (let y = top; y < base; y++) for (let x = cx + dx - hw; x <= cx + dx + hw; x++) {
      const shade = dx > 0;
      c.set(x, y, (y % 3 === 0) ? (shade ? P.glass : P.glassLight) : shade ? P.glass : P.glassLight);
    }
    c.hline(cx + dx - hw, cx + dx + hw, top, P.glassLight);
  }
  // core shaft
  for (let y = 10; y < base; y++) {
    const hw = y < 20 ? 1 : 2 + Math.floor((y - 20) / 22);
    for (let x = cx - hw; x <= cx + hw; x++) c.set(x, y, x > cx ? P.glass : (y % 4 === 0 ? P.glassWarm : P.glassLight));
  }
  // the spire, narrowing to a point
  c.rect(cx, 0, 1, 12, P.glassLight);
  c.set(cx + 1, 6, P.glassDark); c.set(cx + 1, 9, P.glassDark);
  // sunlight catching the west face
  for (let y = 24; y < base; y += 2) if (bayer(cx - 1, y) < 0.5) c.set(cx - 2, y, P.glassWarm);
}

function fountainLake(c: PixelCanvas) {
  c.paint((x, y) => {
    const glow = Math.abs(x - 112) < 6 && y % 2 === 0;
    if (glow) return P.lakeLight;
    return y % 3 === 0 && bayer(x, y) < 0.3 ? P.lakeDark : P.lake;
  }, 0, 80, W - 1, 94);
  c.hline(0, W - 1, 80, P.promenadeShade);
  // the Dubai Fountain: a row of tall jets with spray
  // the Dubai Fountain: plumes that widen into spray, mist along the water line
  for (let k = 0; k < 7; k++) {
    const x = 76 + k * 12, h = 9 + Math.round(Math.sin(k * 0.9) * 3 + 3);
    for (let j = 0; j < h; j++) {
      const spread = Math.floor((j / h) * 2.5);
      for (let d = -spread; d <= spread; d++) if (d === 0 || bayer(x + d, 92 - j) < 0.55) c.set(x + d, 92 - j, P.jet);
    }
    for (const d of [-3, -2, 2, 3]) if (bayer(x + d, 92 - h) < 0.6) c.set(x + d, 92 - h + 2, P.jet);
  }
  for (let x = 70; x < 156; x++) if (bayer(x, 93) < 0.5) c.set(x, 92, P.jet);
}

function souk(c: PixelCanvas) {
  // Souk Al Bahar promenade: sand-coloured walls, arches and a wind tower (barjeel)
  c.rect(0, 94, W, H - 94, P.promenade);
  c.hline(0, W - 1, 94, P.promenadeShade);
  c.rect(160, 82, 64, 12, P.souk);
  c.hline(160, 223, 82, P.soukShade);
  for (let x = 164; x < 222; x += 7) { c.rect(x, 86, 4, 8, P.soukDark); c.set(x + 1, 85, P.soukDark); c.set(x + 2, 85, P.soukDark); }
  c.rect(198, 70, 9, 12, P.wind);
  for (let x = 199; x < 206; x += 2) c.rect(x, 72, 1, 6, P.soukDark);
  c.hline(197, 207, 70, P.soukShade);
  // a wooden dhow moored at the left
  const bx = 12, by = 92;
  for (let k = 0; k < 4; k++) c.hline(bx + k, bx + 30 - k * 2, by + k - 3, k === 0 ? P.dhow : P.dhowDark);
  c.rect(bx + 14, by - 22, 1, 19, P.dhowDark);
  for (let k = 0; k < 16; k++) c.hline(bx + 15, bx + 15 + Math.floor(k * 0.9), by - 21 + k, P.sail);
  const r = rng(5);
  for (let i = 0; i < 12; i++) { const x = 40 + Math.floor(r() * 110); c.rect(x, 98, 1, 3, P.coats[i % P.coats.length]!); c.set(x, 97, "#c89070"); }
}

export const dubaiScene: PostcardScene = {
  cityId: "dubai",
  accent: "#b8823a",
  windowFocus: [112, 40],
  description: "Pixel-art view of Downtown Dubai at golden hour: Burj Khalifa's stepped, spiralling setbacks rising to its long spire above the skyline, desert dunes on the horizon, the Dubai Fountain's jets dancing on the lake, the arched Souk Al Bahar with its wind tower, a wooden dhow, palms and people on the promenade.",
  draw(c) {
    sky(c, P.sky, 72);
    c.disc(40, 60, 10, P.sun);
    c.paint((x, y) => (bayer(x, y) < 0.2 ? P.haze : null), 0, 60, W - 1, 72);
    birds(c, 9, 140, 18, 200, 32, 4, "#6a5a6a");
    dunes(c);
    downtown(c);
    burjKhalifa(c);
    fountainLake(c);
    souk(c);
    palm(c, 150, 100, 20, -1, P.palm, P.trunk, P.ring);
    palm(c, 60, 102, 18, 1, P.palm, P.trunk, P.ring);
  },
  drawStamp(c, x, y, w, h) {
    c.gradient(y, y + h - 1, [P.sky[1]!, P.sky[3]!, P.sky[4]!], x, x + w - 1);
    const cx = x + Math.floor(w / 2), base = y + h - 3;
    for (let k = 0; k < h - 3; k++) { const hw = Math.max(0, Math.floor((k / (h - 3)) * 4)); c.hline(cx - hw, cx + hw, y + k, P.glass); }
    c.rect(x, base, w, 3, P.dune);
  },
};
