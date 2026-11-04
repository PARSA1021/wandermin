import { bayer, rng, type PixelCanvas } from "../pixel/canvas";
import type { PostcardScene } from "../template";
import { W, H, birds, cloud, ridge, sky, townhouses, water, type TownhouseStyle } from "./common";

/** Istanbul: Hagia Sophia's dome and minarets above the Bosphorus, the Blue Mosque in the haze, Galata Tower, ferries and gulls. */
const P = {
  sky: ["#4f6aa6", "#7a86b6", "#c2a6b8", "#ecc0a0", "#f6d6a8"],
  cloud: "#f6e6dc", cloudShade: "#d8bcc0",
  haze: "#a99cb4", hazeDark: "#968aa4",
  wall: "#d99a7a", wallShade: "#b87a5a", wallLight: "#eab494", window: "#4a3a46",
  lead: "#7a8090", leadLight: "#9aa0ae", leadDark: "#5f6474", gold: "#d8b04a",
  minaret: "#efe6d6", minaretShade: "#cbbfac",
  hill: "#8a9a7a", hillDark: "#738468",
  galata: "#c9b8a0", galataShade: "#a89880", galataCone: "#5f6474",
  water: "#4f7aa0", waterLight: "#f0c4a0", waterDark: "#3b6286",
  ferry: "#f3ece0", ferryDark: "#2f3a63", funnel: "#2b2b33", gull: "#f6f4ee",
};

const OLD_TOWN: TownhouseStyle = {
  facades: ["#e9d6b8", "#e7c3a3", "#d9c7a6", "#efe2c8", "#e0b090"],
  shade: "#b9a080", window: "#4a3a46", sill: "#f6efe0",
  roof: "gable", roofColor: "#b05a3e", roofDark: "#8a4430", door: "#4a3a2a",
  widths: [10, 13], heights: [10, 14], floorH: 5,
};

function blueMosque(c: PixelCanvas, cx: number) {
  // cascading domes and six slender minarets, softened by the haze
  for (const [dx, dy, r] of [[0, 52, 9], [-11, 58, 5], [11, 58, 5], [-18, 62, 3], [18, 62, 3]] as const)
    for (let y = dy - r; y <= dy; y++) {
      const hw = Math.sqrt(Math.max(0, r * r - (dy - y) ** 2));
      c.hline(Math.round(cx + dx - hw), Math.round(cx + dx + hw), y, P.haze);
    }
  c.rect(cx - 22, 62, 45, 12, P.haze);
  for (const mx of [-30, -24, 24, 30, -14, 14]) {
    const top = Math.abs(mx) > 20 ? 34 : 40;
    c.rect(cx + mx, top, 1, 74 - top, P.hazeDark);
    c.set(cx + mx, top - 2, P.hazeDark); c.set(cx + mx, top - 1, P.hazeDark);
  }
}

function minaret(c: PixelCanvas, x: number, top: number, base: number) {
  c.rect(x - 1, top + 6, 3, base - top - 6, P.minaret);
  c.rect(x + 1, top + 6, 1, base - top - 6, P.minaretShade);
  for (const gy of [top + 12, top + 22]) c.hline(x - 2, x + 2, gy, P.minaretShade); // balconies
  for (let y = top; y < top + 6; y++) c.hline(x - Math.floor((y - top) / 3), x + Math.floor((y - top) / 3), y, P.leadDark);
  c.set(x, top - 1, P.gold); c.set(x, top - 2, P.gold);
}

function hagiaSophia(c: PixelCanvas, cx: number) {
  const base = 86;
  // massive body and buttresses
  c.rect(cx - 30, 62, 61, base - 62, P.wall);
  c.rect(cx + 24, 62, 7, base - 62, P.wallShade);
  for (const bx of [cx - 30, cx - 20, cx + 16, cx + 26]) { c.rect(bx, 56, 5, base - 56, P.wall); c.rect(bx + 4, 56, 1, base - 56, P.wallShade); }
  for (let x = cx - 26; x < cx + 24; x += 5) { c.rect(x, 66, 2, 4, P.window); c.set(x, 66, P.wall); c.rect(x, 74, 2, 5, P.window); }
  c.hline(cx - 30, cx + 30, 62, P.wallLight);
  // semi-domes stepping down to each side
  for (const [dx, r, y0] of [[-16, 9, 62], [16, 9, 62], [-26, 5, 64], [26, 5, 64]] as const)
    for (let y = y0 - r; y <= y0; y++) {
      const hw = Math.sqrt(Math.max(0, r * r - (y0 - y) ** 2));
      c.hline(Math.round(cx + dx - hw), Math.round(cx + dx + hw), y, y < y0 - r / 2 ? P.leadLight : P.lead);
    }
  // drum with its ring of forty windows
  c.rect(cx - 14, 46, 29, 8, P.wall);
  c.rect(cx + 11, 46, 4, 8, P.wallShade);
  for (let x = cx - 13; x < cx + 13; x += 2) c.set(x, 49, P.window);
  // the great shallow dome
  for (let y = 32; y < 46; y++) {
    const hw = Math.sqrt(Math.max(0, 1 - ((46 - y) / 14) ** 2)) * 16;
    for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++)
      c.set(x, y, x < cx - hw * 0.3 ? P.leadLight : x > cx + hw * 0.5 ? P.leadDark : bayer(x, y) < 0.2 ? P.leadLight : P.lead);
  }
  c.rect(cx, 28, 1, 4, P.gold);
  c.set(cx - 1, 27, P.gold); c.set(cx + 1, 27, P.gold);
  // four minarets at the corners
  minaret(c, cx - 38, 20, base);
  minaret(c, cx + 38, 24, base);
  minaret(c, cx - 34, 34, base);
  minaret(c, cx + 34, 30, base);
}

function galata(c: PixelCanvas, x: number) {
  ridge(c, (px) => (px > 150 ? 76 - Math.max(0, 10 - Math.abs(px - 210) * 0.25) + Math.sin(px / 4) : 200), P.hill, P.hillDark);
  townhouses(c, 401, 150, W + 6, 84, OLD_TOWN);
  c.rect(x - 4, 52, 9, 26, P.galata);
  c.rect(x + 3, 52, 2, 26, P.galataShade);
  for (let y = 56; y < 76; y += 5) c.set(x, y, P.window);
  c.hline(x - 5, x + 5, 52, P.galataShade);
  for (let k = 0; k < 4; k++) c.set(x - 3 + k * 2, 54, P.window);
  for (let y = 42; y < 52; y++) c.hline(x - Math.floor((y - 42) / 2.2), x + Math.floor((y - 42) / 2.2), y, P.galataCone);
  c.set(x, 41, P.gold);
}

function ferry(c: PixelCanvas, x0: number, y: number) {
  for (let k = 0; k < 3; k++) c.hline(x0 + k, x0 + 38 - k, y + k, k === 0 ? P.ferry : P.ferryDark);
  c.rect(x0 + 4, y - 5, 30, 5, P.ferry);
  for (let x = x0 + 5; x < x0 + 33; x += 3) c.rect(x, y - 4, 2, 2, "#6f86a0");
  c.hline(x0 + 4, x0 + 33, y - 6, P.ferryDark);
  c.rect(x0 + 18, y - 11, 3, 5, P.funnel);
  c.hline(x0 + 18, x0 + 20, y - 9, P.ferry);
  for (let k = 0; k < 5; k++) c.set(x0 + 19 - k, y - 12 - k, k % 2 ? "#d9d6d0" : "#efece6");
  for (let k = 0; k < 10; k++) c.set(x0 - k * 2, y + 3, P.waterLight);
}

export const istanbulScene: PostcardScene = {
  cityId: "istanbul",
  accent: "#c03a3a",
  description: "Pixel-art view of Istanbul in rosy late light: Hagia Sophia with its great lead dome, ring of windows, buttresses and four minarets, the Blue Mosque's cascading domes in the haze, Galata Tower on the far hill, a Bosphorus ferry and gulls.",
  draw(c) {
    sky(c, P.sky);
    cloud(c, 16, 60, 18, P.cloud, P.cloudShade, 3);
    cloud(c, 120, 160, 12, P.cloud, P.cloudShade);
    blueMosque(c, 34);
    galata(c, 210);
    hagiaSophia(c, 100);
    water(c, 88, P.water, P.waterLight, P.waterDark, 402);
    for (let x = 60; x < 140; x++) for (let y = 90; y < H; y++) if (bayer(x, y) < 0.18 && (y & 1)) c.set(x, y, P.wallShade);
    ferry(c, 140, 98);
    const r = rng(403);
    for (let i = 0; i < 3; i++) { const bx = 20 + Math.floor(r() * 90); c.hline(bx, bx + 9, 102 + i * 2, P.ferryDark); c.hline(bx + 1, bx + 8, 101 + i * 2, "#c8432f"); }
    birds(c, 404, 60, 50, 180, 80, 8, P.gull);
  },
  drawStamp(c, x, y, w, h) {
    c.rect(x, y, w, h, "#c03a3a");
    const cx = x + w / 2 - 2, cy = y + h / 2;
    c.disc(cx, cy, 5.5, "#f6f4ee");
    c.disc(cx + 1.8, cy, 4.5, "#c03a3a");
    const pts: [number, number][] = [];
    for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + (k * Math.PI) / 5, rad = k % 2 ? 1.1 : 2.6; pts.push([cx + 6.5 + Math.cos(a) * rad, cy + Math.sin(a) * rad]); }
    c.polygon(pts, "#f6f4ee");
  },
};
