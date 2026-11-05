import { bayer, rng, type PixelCanvas } from "../pixel/canvas";
import type { PostcardScene } from "../template";
import { W, H, birds, cloud, leaf, palm, people, sky } from "./common";

/** Rio: Corcovado with Christ the Redeemer, Sugarloaf and its cable car over Guanabara Bay, Copacabana's wave promenade. */
const P = {
  sky: ["#2f6fb8", "#4f8fd0", "#7fb4e2", "#b8d8ee", "#e6f0ee"],
  cloud: "#fbfaf4", cloudShade: "#d4e2ee",
  haze: "#8fb0a8", hazeDark: "#7a9c94",
  forest: "#3f7a46", forestLight: "#5f9a52", forestDark: "#2c5a36", forestDeep: "#234a2e",
  granite: "#8f877a", graniteLight: "#b3aa98", graniteDark: "#6a6458", graniteStreak: "#7a7366",
  statue: "#f1eee6", statueShade: "#c9c4b6",
  city: "#efe9dc", cityShade: "#cfc6b4", cityWin: "#9fb4c4", cityRoof: "#c8a07a",
  water: "#2a7fa8", waterLight: "#8fd0e0", waterDark: "#1f6688",
  surf: "#f4f8f6", sand: "#f0d9a6", sandShade: "#dcc08a", sandLight: "#f8e8c4",
  walkBlack: "#2b2a2e", walkWhite: "#f2efe6", road: "#55585e",
  palm: ["#3f8a4a", "#5fa85a", "#2c6a3a"], trunk: "#8a6a4a",
  umbrellas: ["#e8483a", "#f2c14e", "#2f8f6a", "#3a78c8", "#f3f0e6"],
  coats: ["#e8483a", "#f2c14e", "#3a78c8", "#2f8f6a", "#f3f0e6", "#e88aa0"],
  cable: "#4a4a50", car: "#e8483a",
  sail: "#fbfaf4", hull: "#f3ece0",
};

/** Ridge line with leafy canopy texture and occasional bare-granite faces that taper downhill. */
function forestedHill(c: PixelCanvas, top: (x: number) => number, x0: number, x1: number, base: number, seed: number) {
  const r = rng(seed);
  const faces: [number, number][] = [];
  for (let i = 0; i < 4; i++) { const fx = x0 + Math.floor(r() * (x1 - x0)); faces.push([fx, 3 + Math.floor(r() * 4)]); }
  c.paint((x, y) => {
    if (x < x0 || x > x1) return null;
    const t = top(x);
    if (y < t || y > base) return null;
    const d = y - t;
    for (const [fx, fw] of faces) {
      const half = fw * (1 - (d - 3) / 12);
      if (d > 3 && d < 15 && Math.abs(x - fx + (d - 3) * 0.3) < half) return (x + d) % 3 === 0 ? P.graniteDark : P.granite;
    }
    if (d < 1) return P.forestDark;
    const l = leaf(x, y);
    if (l < 0.22) return P.forestLight;
    if (l > 0.84) return P.forestDeep;
    return d > 18 && l > 0.5 ? P.forestDark : P.forest;
  }, x0, 0, x1, base);
}

function corcovado(c: PixelCanvas) {
  // far haze range of the Tijuca massif
  c.paint((x, y) => {
    const t = 50 + 6 * Math.sin(x / 17) + 3 * Math.sin(x / 7);
    return y >= t && y < 72 ? (bayer(x, y) < 0.12 ? P.hazeDark : P.haze) : null;
  }, 0, 30, 140, 72);
  // the needle-like peak, steep on the bay side
  const peak = 46;
  forestedHill(c, (x) => {
    const dx = x - peak;
    const s = dx < 0 ? 1.15 : 0.8;
    return 22 + Math.pow(Math.abs(dx) * s, 1.35) * 0.55;
  }, 0, 112, 74, 41);
  // bare granite cliff under the summit, narrowing into the forest
  for (let y = 23; y < 38; y++) {
    const w = Math.max(0, 5 - (y - 23) * 0.33);
    for (let x = peak - 2; x < peak - 2 + w; x++) c.set(x, y, (x * 2 + y) % 5 === 0 ? P.graniteDark : x === peak - 2 ? P.graniteLight : P.granite);
  }
  // summit platform and the statue: pedestal, robe, outstretched arms, head
  c.rect(peak - 3, 21, 8, 2, P.graniteLight);
  c.rect(peak, 17, 2, 4, P.statueShade); // pedestal
  c.rect(peak, 9, 2, 8, P.statue); // robe
  c.set(peak + 1, 12, P.statueShade); c.set(peak + 1, 15, P.statueShade);
  c.hline(peak - 5, peak + 6, 10, P.statue); // arms
  c.set(peak - 5, 11, P.statueShade); c.set(peak + 6, 11, P.statueShade);
  c.rect(peak, 7, 2, 2, P.statue); // head
}

function sugarloaf(c: PixelCanvas) {
  // Morro da Urca: the lower, rounded, forested hill in front
  forestedHill(c, (x) => 58 + Math.pow(Math.abs(x - 140) / 14, 2) * 5, 118, 166, 76, 921);
  // Pão de Açúcar: a leaning granite dome, bare on top with vertical exfoliation streaks
  const cx = 182, half = 22, top = 30, base = 76;
  c.paint((x, y) => {
    const t = (x - cx) / half;
    if (Math.abs(t) > 1) return null;
    const lean = t < 0 ? 1.15 : 0.95;
    const yt = base - (base - top) * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(t * lean), 2.4)), 0.5);
    if (y < Math.round(yt) || y > base) return null;
    const d = y - yt;
    if (d < 1) return t < 0.1 ? P.graniteLight : P.granite;
    // vegetation clings to the lower slopes and the gully on the left
    const veg = y > base - 10 + Math.sin(x / 3) * 2 || (t < -0.55 && y > top + 18);
    if (veg) { const l = leaf(x, y); return l < 0.25 ? P.forestLight : l > 0.85 ? P.forestDark : P.forest; }
    const streak = (x * 7) % 5 === 0 || (x * 3 + 1) % 11 === 0;
    if (t > 0.35) return streak ? P.graniteDark : bayer(x, y) < 0.35 ? P.graniteDark : P.graniteStreak; // shaded side
    return streak ? P.graniteStreak : bayer(x, y) < 0.1 ? P.graniteLight : P.granite;
  }, cx - half - 2, top - 1, cx + half + 2, base);
  // cable car line from Urca to the summit, one red cabin in the middle
  const x0 = 146, y0 = 56, x1 = 170, y1 = 34;
  for (let x = x0; x <= x1; x++) {
    const t = (x - x0) / (x1 - x0);
    c.set(x, Math.round(y0 + (y1 - y0) * t + Math.sin(t * Math.PI) * 2), P.cable);
  }
  const mx = 158, my = Math.round(y0 + (y1 - y0) * 0.5 + 2);
  c.set(mx, my + 1, P.cable);
  c.rect(mx - 1, my + 2, 4, 3, P.car);
  c.set(mx, my + 3, P.cityWin); c.set(mx + 1, my + 3, P.cityWin);
  c.rect(168, 31, 6, 3, P.cityShade); // summit station
}

function botafogo(c: PixelCanvas) {
  // white apartment blocks along the shore at the foot of the hills
  const r = rng(77);
  for (let x = 4; x < 120; x += 5 + Math.floor(r() * 3)) {
    const h = 6 + Math.floor(r() * 10), w = 4 + Math.floor(r() * 3), t = 76 - h;
    c.rect(x, t, w, h, r() < 0.3 ? P.cityShade : P.city);
    c.rect(x + w - 1, t, 1, h, P.cityShade);
    for (let y = t + 2; y < 75; y += 2) for (let i = x + 1; i < x + w - 1; i += 2) c.set(i, y, P.cityWin);
    if (r() < 0.3) c.hline(x, x + w - 1, t, P.cityRoof);
  }
}

function bay(c: PixelCanvas) {
  const y0 = 76;
  c.rect(0, y0, W, 12, P.water);
  c.hline(0, W - 1, y0, P.waterDark);
  const r = rng(404);
  for (let i = 0; i < 30; i++) {
    const y = y0 + 2 + Math.floor(r() * 9), x = Math.floor(r() * W), len = 2 + Math.floor(r() * 5);
    c.hline(x, x + len, y, r() < 0.6 ? P.waterLight : P.waterDark);
  }
  // reflections of the dome and a couple of sailboats
  for (let y = y0 + 1; y < y0 + 7; y++) {
    const half = 14 - (y - y0) * 2;
    for (let x = 182 - half; x < 182 + half; x++) if ((y - y0) % 2 === 1 && bayer(x, y) < 0.5) c.set(x, y, P.waterDark);
  }
  for (const [x, y] of [[96, 84], [112, 81], [214, 83]] as const) {
    c.rect(x - 2, y, 6, 1, P.hull);
    for (let k = 0; k < 6; k++) c.hline(x, x + Math.floor(k / 2), y - 6 + k, P.sail);
    c.set(x, y - 7, P.cable);
  }
}

function copacabana(c: PixelCanvas) {
  // surf line, sand, beach life
  for (let x = 0; x < W; x++) {
    const s = 88 + Math.round(Math.sin(x / 9) * 0.8);
    c.set(x, s, P.surf);
    if (bayer(x, 0) < 0.5) c.set(x, s - 1, P.waterLight);
  }
  c.paint((x, y) => (y > 88 + Math.sin(x / 9) * 0.8 ? (bayer(x, y) < 0.1 ? P.sandLight : y > 95 ? P.sandShade : P.sand) : null), 0, 88, W - 1, 97);
  const r = rng(515);
  for (let i = 0; i < 9; i++) {
    const x = 6 + Math.floor(r() * 210), y = 92 + Math.floor(r() * 3), col = P.umbrellas[i % P.umbrellas.length]!;
    c.hline(x - 3, x + 3, y - 4, col); c.hline(x - 2, x + 2, y - 5, col);
    c.set(x - 3, y - 3, col); c.set(x + 3, y - 3, col);
    c.rect(x, y - 3, 1, 4, P.trunk);
  }
  people(c, 516, 96, 8, 214, 12, P.coats, "#c88f62");
  // Burle Marx's black-and-white wave mosaic on the promenade, then the avenue
  c.paint((x, y) => {
    const wave = Math.sin((x + 2) / 3.2) * 1.6;
    return ((y - 98 + wave + 40) % 6) < 3 ? P.walkBlack : P.walkWhite;
  }, 0, 98, W - 1, 104);
  c.hline(0, W - 1, 97, P.sandShade);
  c.rect(0, 105, W, H - 105, P.road);
  for (let x = 4; x < W; x += 10) c.hline(x, x + 4, 106, P.walkWhite);
}

export const rioDeJaneiroScene: PostcardScene = {
  cityId: "rio-de-janeiro",
  accent: "#1f8a5a",
  windowFocus: [60, 30],
  description: "Pixel-art view of Rio de Janeiro: Christ the Redeemer with outstretched arms on the forested Corcovado peak, the granite dome of Sugarloaf Mountain with its red cable car over Guanabara Bay, white apartment blocks along the shore, sailboats, and Copacabana beach with colourful umbrellas and the black-and-white wave mosaic of the promenade.",
  draw(c) {
    sky(c, P.sky, 74);
    cloud(c, 70, 128, 14, P.cloud, P.cloudShade, 3);
    cloud(c, 150, 196, 20, P.cloud, P.cloudShade);
    cloud(c, 8, 30, 30, P.cloud, P.cloudShade);
    birds(c, 612, 80, 24, 140, 40, 5, "#3a4a5a");
    corcovado(c);
    sugarloaf(c);
    botafogo(c);
    bay(c);
    copacabana(c);
    palm(c, 14, 97, 26, 1, P.palm, P.trunk, "#6a4e36");
    palm(c, 206, 97, 22, -1, P.palm, P.trunk, "#6a4e36");
  },
  drawStamp(c, x, y, w, h) {
    c.gradient(y, y + h - 1, [P.sky[1]!, P.sky[3]!], x, x + w - 1);
    const cx = x + Math.floor(w / 2);
    for (let k = 0; k < 9; k++) c.hline(cx - 2 - Math.floor(k * 0.9), cx + 2 + Math.floor(k * 0.9), y + 8 + k, k < 2 ? P.forestDark : P.forest);
    c.rect(cx, y + 3, 1, 5, P.statue);
    c.hline(cx - 3, cx + 3, y + 4, P.statue);
    c.rect(x, y + h - 2, w, 2, P.water);
  },
};
