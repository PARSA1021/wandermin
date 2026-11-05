import { bayer, rng, type PixelCanvas } from "../pixel/canvas";
import type { PostcardScene } from "../template";
import { W, H, birds, cloud, leaf, palm, sky } from "./common";

/** Honolulu: Diamond Head crater above Waikiki — hotels, surfers on the swell, an outrigger canoe, palms, a rainbow. */
const P = {
  sky: ["#3a86d0", "#62a6e0", "#96c8ec", "#cde4f0", "#f2f2e4"],
  cloud: "#fbfaf4", cloudShade: "#d0e0ec",
  rainbow: ["#e8584a", "#f2a64a", "#f2d84a", "#6ac86a", "#5aa0e0", "#8a6ad0"],
  crater: "#8a8a5a", craterLight: "#aaa874", craterDark: "#6a6a44", craterRidge: "#5a5a3a", craterGreen: "#6a8a4a",
  hotel: "#f3ece0", hotelShade: "#d0c6b4", hotelPink: "#f2b4b0", hotelWin: "#7aa4c4", balcony: "#c8bca8",
  sea: "#2a9ac0", seaLight: "#9ae0ea", seaDeep: "#1f7aa8", reef: "#4ab8b8", foam: "#f6fbfa",
  sand: "#f2dcae", sandShade: "#dcc08a",
  board: ["#f2c14e", "#e8483a", "#f3f0e6", "#3a78c8"],
  canoe: "#a8643a", canoeDark: "#7a4428", outrigger: "#5a3a20",
  palm: ["#3f8a4a", "#5fa85a", "#2c6a3a"], trunk: "#8a6a4a", ring: "#6a4e36",
  umbrella: ["#e8483a", "#f2c14e", "#2f8f6a", "#3a78c8"], skin: "#c8906a",
};

function rainbow(c: PixelCanvas) {
  const cx = 60, cy = 70, r0 = 52;
  for (let k = 0; k < P.rainbow.length; k++) {
    const r = r0 - k;
    for (let a = Math.PI * 1.05; a < Math.PI * 1.55; a += 0.004) {
      const x = Math.round(cx + Math.cos(a) * r), y = Math.round(cy + Math.sin(a) * r);
      if (bayer(x, y) < 0.55) c.set(x, y, P.rainbow[k]!);
    }
  }
}

function diamondHead(c: PixelCanvas) {
  // the tuff cone's long profile, with the steep summit at the right and radial erosion ridges
  c.paint((x, y) => {
    const t = x < 170 ? 44 + Math.pow((170 - x) / 120, 1.4) * 22 : 40 + Math.pow((x - 170) / 54, 1.5) * 18;
    const peak = x > 160 && x < 182 ? -6 + Math.abs(x - 172) * 0.5 : 0;
    const top = t + Math.min(0, peak) + Math.sin(x / 3) * 0.5;
    if (y < top || y > 70) return null;
    const d = y - top;
    const ridge = Math.round(x * 0.6 + d * (x < 170 ? -0.6 : 0.6)) % 7 === 0;
    if (d < 1) return P.craterLight;
    if (ridge) return P.craterRidge;
    if (y > 64) return leaf(x, y) < 0.4 ? P.craterGreen : P.crater;
    return x > 176 ? (leaf(x, y) < 0.3 ? P.crater : P.craterDark) : leaf(x, y) < 0.2 ? P.craterLight : P.crater;
  }, 40, 30, W - 1, 70);
}

function hotels(c: PixelCanvas) {
  const r = rng(88);
  for (let x = 0; x < 150; x += 8 + Math.floor(r() * 5)) {
    const t = 42 + Math.floor(r() * 22), w = 7 + Math.floor(r() * 5);
    const col = r() < 0.2 ? P.hotelPink : P.hotel;
    c.rect(x, t, w, 76 - t, col);
    c.rect(x + w - 2, t, 2, 76 - t, P.hotelShade);
    for (let y = t + 2; y < 74; y += 2) { c.hline(x + 1, x + w - 3, y, P.balcony); for (let i = x + 1; i < x + w - 2; i += 2) c.set(i, y + 1, P.hotelWin); }
  }
  // the Royal Hawaiian, pink and Moorish, low by the beach
  c.rect(100, 66, 30, 10, P.hotelPink);
  for (let x = 102; x < 128; x += 4) { c.rect(x, 69, 2, 5, P.hotelShade); c.set(x, 68, P.hotelShade); }
  c.rect(112, 60, 6, 6, P.hotelPink); c.hline(111, 118, 59, P.hotelShade);
}

function ocean(c: PixelCanvas) {
  c.paint((x, y) => {
    const d = y - 80;
    if (y % 3 === 0 && bayer(x, y) < 0.2) return P.seaLight;
    return d < 4 ? P.seaDeep : leaf(x, y) < 0.15 && d > 4 ? P.reef : P.sea;
  }, 0, 76, W - 1, 96);
  // rolling swells breaking into white lines
  for (const [y0, x0, x1] of [[82, 40, 140], [87, 0, 90], [90, 120, 224]] as const) {
    for (let x = x0; x < x1; x++) {
      const y = y0 + Math.round(Math.sin(x / 5) * 0.6);
      c.set(x, y, P.foam);
      if (bayer(x, y) < 0.5) c.set(x, y + 1, P.seaLight);
    }
  }
  // surfers riding the waves
  for (const [x, y, k] of [[70, 81, 0], [106, 86, 1], [176, 89, 2]] as const) {
    c.hline(x - 3, x + 3, y, P.board[k]!);
    c.rect(x, y - 4, 1, 4, P.skin);
    c.set(x - 1, y - 3, P.skin); c.set(x + 1, y - 3, P.skin);
    c.set(x, y - 5, "#3a2a20");
  }
  // an outrigger canoe with paddlers
  const cx = 30, cy = 92;
  c.hline(cx, cx + 24, cy, P.canoe); c.hline(cx + 1, cx + 23, cy + 1, P.canoeDark);
  c.set(cx - 1, cy - 1, P.canoe); c.set(cx + 25, cy - 1, P.canoe);
  c.line(cx + 6, cy, cx + 8, cy + 4, P.outrigger); c.line(cx + 16, cy, cx + 18, cy + 4, P.outrigger);
  c.hline(cx + 6, cx + 20, cy + 4, P.outrigger);
  for (let p = 0; p < 4; p++) { const px = cx + 4 + p * 5; c.rect(px, cy - 3, 1, 3, P.skin); c.set(px, cy - 4, "#3a2a20"); c.line(px + 1, cy - 2, px + 3, cy + 2, P.outrigger); }
}

function waikikiBeach(c: PixelCanvas) {
  c.paint((x, y) => (bayer(x, y) < 0.12 ? P.sandShade : P.sand), 0, 96, W - 1, H - 1);
  for (let x = 0; x < W; x++) if (bayer(x, 96) < 0.6) c.set(x, 96, P.foam);
  const r = rng(77);
  for (let i = 0; i < 7; i++) {
    const x = 20 + i * 28 + Math.floor(r() * 8), col = P.umbrella[i % P.umbrella.length]!;
    c.hline(x - 3, x + 3, 98, col); c.hline(x - 2, x + 2, 97, col); c.rect(x, 99, 1, 5, P.trunk);
  }
  for (let i = 0; i < 10; i++) { const x = 8 + Math.floor(r() * 208); c.rect(x, 101, 2, 4, P.umbrella[i % 4]!); c.set(x, 100, P.skin); }
  for (let i = 0; i < 4; i++) { const x = 10 + i * 50; c.rect(x, 102, 2, 8, P.board[i % 4]!); } // boards stuck in the sand
}

export const honoluluScene: PostcardScene = {
  cityId: "honolulu",
  accent: "#1f8ab0",
  windowFocus: [170, 48],
  description: "Pixel-art view of Honolulu: the ridged tuff crater of Diamond Head rising above Waikiki's hotels and the pink Royal Hawaiian, a rainbow over the hills, surfers riding long swells, an outrigger canoe with paddlers, palms, umbrellas and surfboards stuck in the sand.",
  draw(c) {
    sky(c, P.sky, 70);
    cloud(c, 100, 150, 12, P.cloud, P.cloudShade, 3);
    cloud(c, 160, 200, 22, P.cloud, P.cloudShade);
    rainbow(c);
    birds(c, 6, 120, 16, 160, 28, 4, "#3a4a5a");
    diamondHead(c);
    hotels(c);
    ocean(c);
    waikikiBeach(c);
    palm(c, 152, 98, 34, -1, P.palm, P.trunk, P.ring, 12);
    palm(c, 206, 98, 30, 1, P.palm, P.trunk, P.ring, 12);
    palm(c, 190, 98, 22, -1, P.palm, P.trunk, P.ring);
  },
  drawStamp(c, x, y, w, h) {
    c.gradient(y, y + h - 1, [P.sky[1]!, P.sky[3]!], x, x + w - 1);
    for (let i = x; i < x + w; i++) {
      const t = Math.round(y + 8 + Math.pow(Math.abs(i - x - w * 0.7) / (w * 0.7), 1.4) * 4);
      for (let yy = t; yy < y + h - 4; yy++) c.set(i, yy, P.crater);
    }
    c.rect(x, y + h - 4, w, 4, P.sea);
  },
};
