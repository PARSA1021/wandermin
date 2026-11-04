import { bayer, rng, type PixelCanvas } from "../pixel/canvas";
import type { PostcardScene } from "../template";
import { W, H, birds, cloud, rowboat, sky, water } from "./common";

/** New York: the Statue of Liberty in the harbour before the Manhattan skyline, the Staten Island Ferry, gulls. */
const P = {
  sky: ["#3f6aa8", "#5d88c0", "#8fb0d6", "#c9d8e4", "#f0e6cf"],
  cloud: "#f8f5ee", cloudShade: "#d6dfe8",
  tower: "#8f9bb0", towerShade: "#76839a", towerLight: "#b3bdcc", window: "#d9e2ea", windowWarm: "#f2dca0",
  art: "#c9cfd6", artShade: "#9aa3ae", glass: "#7f9bb8", glassLight: "#b5cbe0",
  copper: "#6fae9a", copperShade: "#4f8a78", copperLight: "#9fcfbd", flame: "#f2c14e", flameCore: "#fbe9a0",
  pedestal: "#d2c7b0", pedestalShade: "#aa9f88", fort: "#b9ae96", grass: "#6f9a64",
  water: "#4f7fa0", waterLight: "#a3c3d8", waterDark: "#3b6584",
  ferry: "#e07a2c", ferryDark: "#a8561e", ferryWindow: "#3d4560", white: "#f3ece0",
};

function skyline(c: PixelCanvas) {
  const r = rng(301);
  const base = 90;
  // generic Midtown and Downtown towers, lit windows
  for (let x = 74; x < W; x += 5 + Math.floor(r() * 5)) {
    const w = 5 + Math.floor(r() * 5);
    const t = x > 164 && x < 196 ? 56 + Math.floor(r() * 10) : 50 + Math.floor(r() * 24);
    c.rect(x, t, w, base - t, r() < 0.5 ? P.tower : P.towerShade);
    c.rect(x + w - 1, t, 1, base - t, P.towerShade);
    c.hline(x, x + w - 2, t, P.towerLight);
    for (let y = t + 2; y < base - 1; y += 2) for (let i = x + 1; i < x + w - 1; i += 2) if (r() < 0.4) c.set(i, y, r() < 0.15 ? P.windowWarm : P.window);
  }
  // One World Trade Center: a tapering glass prism with a long spire
  const wx = 96;
  for (let y = 26; y < base; y++) {
    const hw = 2 + (y - 26) * 0.07;
    for (let x = Math.round(wx - hw); x <= Math.round(wx + hw); x++) c.set(x, y, x > wx ? P.glass : (x + y) % 4 === 0 ? P.glassLight : P.glass);
  }
  c.rect(wx, 12, 1, 14, P.artShade);
  // Chrysler Building: terraced sunburst crown and needle
  const cx = 130;
  c.rect(cx - 4, 50, 9, base - 50, P.art);
  c.rect(cx + 3, 50, 2, base - 50, P.artShade);
  for (let y = 52; y < base; y += 3) c.hline(cx - 3, cx + 2, y, P.window);
  for (let k = 0; k < 5; k++) {
    const y = 49 - k * 3, hw = 4 - k * 0.8;
    c.hline(Math.round(cx - hw), Math.round(cx + hw), y, P.art);
    for (let x = Math.round(cx - hw) + 1; x < cx + hw; x += 2) c.set(x, y - 1, P.ferryWindow); // triangular windows
    c.hline(Math.round(cx - hw), Math.round(cx + hw), y - 2, P.artShade);
  }
  c.rect(cx, 26, 1, 10, P.art);
  // Empire State Building: setbacks, mast
  const ex = 156;
  const tiers: [number, number][] = [[64, 9], [54, 7], [46, 5], [40, 3]];
  c.rect(ex - 11, 70, 23, base - 70, P.tower);
  for (const [t, hw] of tiers) { c.rect(ex - hw, t, hw * 2 + 1, 70 - t, P.art); c.rect(ex + hw - 1, t, 2, 70 - t, P.artShade); }
  for (let y = 48; y < base; y += 3) for (let x = ex - 8; x <= ex + 8; x += 2) if (c.get(x, y) === P.art || c.get(x, y) === P.tower) c.set(x, y, P.window);
  c.rect(ex - 1, 34, 3, 6, P.art);
  c.rect(ex, 20, 1, 14, P.artShade);
  c.set(ex, 19, "#e0603a");
}

function liberty(c: PixelCanvas, x: number) {
  // star fort and grassy island
  c.paint((px, py) => (Math.abs(px - x) < 30 - (py - 94) * 0 && py >= 92 ? (py === 92 ? P.fort : P.grass) : null), x - 30, 92, x + 30, 95);
  c.polygon([[x - 20, 92], [x - 14, 84], [x + 14, 84], [x + 20, 92]], P.fort);
  for (let px = x - 13; px <= x + 13; px += 3) c.set(px, 88, P.pedestalShade);
  // pedestal
  c.rect(x - 8, 62, 17, 22, P.pedestal);
  c.rect(x + 5, 62, 4, 22, P.pedestalShade);
  c.hline(x - 9, x + 9, 62, P.pedestalShade);
  for (let y = 66; y < 82; y += 5) c.rect(x - 2, y, 3, 3, P.pedestalShade);
  // robed figure
  for (let y = 34; y < 62; y++) {
    const hw = 2 + (y - 34) * 0.16;
    for (let px = Math.round(x - hw); px <= Math.round(x + hw); px++) {
      const fold = (px - x + y) % 4 === 0;
      c.set(px, y, px > x + hw * 0.3 ? P.copperShade : fold ? P.copperLight : P.copper);
    }
  }
  c.disc(x, 31, 2.3, P.copper);
  c.set(x - 1, 31, P.copperLight);
  for (const [dx, dy] of [[-3, -1], [-2, -3], [0, -4], [2, -3], [3, -1]] as const) c.set(x + dx, 31 + dy, P.copperLight); // crown rays
  // raised right arm and torch
  c.line(x + 2, 36, x + 5, 22, P.copper, 2);
  c.rect(x + 4, 19, 3, 3, P.copperShade);
  c.set(x + 5, 17, P.flame); c.set(x + 5, 16, P.flameCore); c.set(x + 4, 18, P.flame); c.set(x + 6, 18, P.flame);
  // tablet in the left arm
  c.rect(x - 5, 40, 3, 5, P.copperLight);
  c.set(x - 4, 41, P.copperShade);
}

function ferry(c: PixelCanvas, x0: number, y: number) {
  for (let k = 0; k < 4; k++) c.hline(x0 + k, x0 + 52 - k, y + k, k < 2 ? P.ferry : P.ferryDark);
  c.rect(x0 + 4, y - 5, 44, 5, P.ferry);
  c.rect(x0 + 8, y - 9, 36, 4, P.ferry);
  for (let x = x0 + 5; x < x0 + 47; x += 3) c.rect(x, y - 4, 2, 2, P.ferryWindow);
  for (let x = x0 + 9; x < x0 + 43; x += 3) c.set(x, y - 8, P.ferryWindow);
  c.hline(x0 + 8, x0 + 43, y - 10, P.white);
  c.rect(x0 + 24, y - 14, 4, 4, P.white);
  c.rect(x0 + 24, y - 15, 4, 1, P.ferryDark);
  // wake
  for (let k = 0; k < 14; k++) c.set(x0 - k * 2, y + 3 + (k % 2), P.waterLight);
}

export const newYorkScene: PostcardScene = {
  cityId: "new-york",
  accent: "#4f8a78",
  description: "Pixel-art view of New York harbour: the copper-green Statue of Liberty raising her torch on her star-fort island, the Manhattan skyline with One World Trade Center, the Chrysler crown and the Empire State Building, the orange Staten Island Ferry and gulls.",
  draw(c) {
    sky(c, P.sky);
    cloud(c, 80, 130, 18, P.cloud, P.cloudShade, 3);
    cloud(c, 150, 200, 48, P.cloud, P.cloudShade);
    skyline(c);
    water(c, 90, P.water, P.waterLight, P.waterDark, 302);
    for (let x = 74; x < W; x++) for (let y = 92; y < H; y++) if (bayer(x, y) < 0.16 && (y & 1)) c.set(x, y, P.windowWarm);
    liberty(c, 40);
    ferry(c, 128, 100);
    rowboat(c, 96, 104, 12, P.white, "#c8432f");
    c.rect(101, 96, 1, 8, P.tower);
    c.polygon([[102, 96], [102, 103], [107, 103]], P.white);
    birds(c, 303, 10, 10, 120, 40, 7, "#55607a");
  },
  drawStamp(c, x, y, w, h) {
    c.rect(x, y, w, h, "#f3e6c9");
    const cx = x + Math.floor(w / 2) - 1;
    c.rect(cx - 2, y + h - 5, 6, 5, P.pedestal);
    c.rect(cx - 1, y + 6, 3, h - 11, P.copper);
    c.disc(cx, y + 5, 1.5, P.copper);
    c.line(cx + 1, y + 8, cx + 3, y + 2, P.copper);
    c.set(cx + 3, y + 1, P.flame);
  },
};
