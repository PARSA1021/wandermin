import { bayer, rng, type PixelCanvas } from "../pixel/canvas";
import type { PostcardScene } from "../template";
import { W, H, birds, leaf, sky } from "./common";

/** Nairobi National Park: giraffes and acacias on the golden savanna with the city skyline right behind. */
const P = {
  sky: ["#4a7ab8", "#78a0cc", "#b8c8d0", "#ead8b0", "#f6e2b8"],
  sun: "#fbe8b8",
  city: "#8a90a4", cityDark: "#6f7690", cityWin: "#c8d0dc", kicc: "#b07a5a", kiccShade: "#8a5a40",
  hill: "#8a9a6a", hillDark: "#6f8256",
  grass: "#d8b866", grassLight: "#ead08a", grassDark: "#b8964a", grassDeep: "#9a7a3a",
  acacia: "#4f6a3a", acaciaLight: "#6f8a4a", acaciaDark: "#3a5230", bark: "#5a4a3a",
  giraffe: "#e8b464", giraffeSpot: "#9a5a2a", giraffeLight: "#f6d498", giraffeDark: "#6a3e1e", hoof: "#3a2a1e",
  zebra: "#f3efe6", stripe: "#2a2a2e",
  bird: "#3a3a48",
};

function skyline(c: PixelCanvas) {
  c.paint((x, y) => {
    const t = 62 + 3 * Math.sin(x / 19) + Math.sin(x / 7);
    return y >= t && y < 72 ? (bayer(x, y) < 0.2 ? P.hillDark : P.hill) : null;
  }, 0, 56, W - 1, 72);
  const r = rng(254);
  for (let x = 96; x < 200; x += 4 + Math.floor(r() * 4)) {
    const t = 40 + Math.floor(r() * 22), w = 4 + Math.floor(r() * 4);
    c.rect(x, t, w, 68 - t, r() < 0.4 ? P.cityDark : P.city);
    for (let y = t + 2; y < 66; y += 3) for (let i = x + 1; i < x + w - 1; i += 2) if (r() < 0.6) c.set(i, y, P.cityWin);
  }
  // KICC: the cylindrical tower with its saucer-shaped helipad crown, and the amphitheatre cone at its foot
  const kx = 144;
  c.rect(kx - 4, 30, 9, 38, P.kicc);
  c.rect(kx + 2, 30, 3, 38, P.kiccShade);
  for (let y = 32; y < 66; y += 3) c.hline(kx - 3, kx + 1, y, P.cityWin);
  c.hline(kx - 7, kx + 7, 29, P.kiccShade); c.hline(kx - 6, kx + 6, 28, P.kicc); c.hline(kx - 4, kx + 4, 27, P.kicc);
  for (let k = 0; k < 6; k++) c.hline(kx + 8 - k, kx + 8 + k, 62 + k, P.kicc);
  c.set(kx + 8, 61, P.kiccShade);
}

function savanna(c: PixelCanvas) {
  c.paint((x, y) => {
    const t = 68 + Math.sin(x / 23) * 1.5;
    if (y < t) return null;
    const d = y - t;
    const l = leaf(x, y);
    if (d < 3) return l < 0.3 ? P.hill : P.grassDark;
    return l < 0.2 ? P.grassLight : l > 0.85 ? P.grassDark : P.grass;
  }, 0, 64, W - 1, H - 1);
  // tall grass tufts in the foreground
  const r = rng(9);
  for (let i = 0; i < 70; i++) {
    const x = Math.floor(r() * W), y = 98 + Math.floor(r() * 10), h = 2 + Math.floor(r() * 4);
    for (let k = 0; k < h; k++) c.set(x + (k > 1 ? (i % 2 ? 1 : -1) : 0), y - k, k === h - 1 ? P.grassLight : P.grassDark);
  }
}

function acacia(c: PixelCanvas, x: number, base: number, h: number, span: number) {
  // umbrella thorn: forked trunk, flat layered crown
  c.line(x, base, x - 1, base - h + 3, P.bark);
  c.line(x - 1, base - h + 6, x - span / 2 + 2, base - h + 1, P.bark);
  c.line(x, base - h + 5, x + span / 2 - 2, base - h + 1, P.bark);
  for (let k = 0; k < 4; k++) {
    const half = span / 2 - Math.abs(k - 1.5) * 2;
    for (let i = Math.round(x - half); i <= Math.round(x + half); i++) {
      const yy = base - h - 1 + k;
      if (k === 0 && bayer(i, yy) < 0.4) continue;
      c.set(i, yy, k === 0 ? P.acaciaLight : k === 3 ? P.acaciaDark : leaf(i, yy) < 0.3 ? P.acaciaLight : P.acacia);
    }
  }
}

function giraffe(c: PixelCanvas, x: number, base: number, facing: 1 | -1) {
  // drawn on a small grid then mirrored: sturdy two-pixel legs, sloping back, long neck, ossicones, patch spots
  const at = (dx: number) => x + dx * facing;
  const px = (dx: number, y: number, col: string) => c.set(at(dx), y, col);
  const legTop = base - 16;
  // legs (front pair taller), with knees and dark hooves
  for (const [dx, extra] of [[0, 0], [3, 0], [10, 2], [13, 2]] as const) {
    for (let y = legTop - extra; y <= base; y++) { px(dx, y, P.giraffe); px(dx + 1, y, y > base - 2 ? P.hoof : P.giraffeLight); }
    px(dx, legTop + 7, P.giraffeDark);
  }
  // body: a slanted block, higher at the shoulders
  for (let i = -1; i < 16; i++) {
    const top = legTop - 7 - Math.round(i * 0.35), bottom = legTop - Math.round(i * 0.12);
    for (let y = top; y <= bottom; y++) px(i, y, y === top ? P.giraffeLight : P.giraffe);
  }
  // neck
  for (let k = 0; k < 20; k++) {
    const nx = 13 + Math.round(k * 0.4), ny = legTop - 12 - k;
    for (let w = 0; w < 3; w++) px(nx + w, ny, w === 0 ? P.giraffeDark : P.giraffe);
  }
  // head, muzzle, ossicones, ear
  const hx = 13 + 8, hy = legTop - 33;
  for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) px(hx + i - 1, hy + j, i > 3 ? P.giraffeLight : P.giraffe);
  px(hx + 4, hy + 2, P.giraffeDark); px(hx + 1, hy, P.hoof);
  px(hx, hy - 1, P.giraffeDark); px(hx, hy - 2, P.hoof); px(hx + 2, hy - 1, P.giraffeDark); px(hx + 2, hy - 2, P.hoof);
  px(hx - 2, hy + 1, P.giraffeDark);
  // spots
  for (let i = 0; i < 15; i += 3) for (let k = 0; k < 6; k += 3) { const y = legTop - 6 - Math.round(i * 0.3) + k; px(i, y, P.giraffeSpot); px(i + 1, y, P.giraffeSpot); px(i, y + 1, P.giraffeSpot); }
  for (let k = 2; k < 18; k += 4) { px(14 + Math.round(k * 0.4), legTop - 12 - k, P.giraffeSpot); px(15 + Math.round(k * 0.4), legTop - 12 - k, P.giraffeSpot); }
  // tail
  for (let k = 0; k < 6; k++) px(-2, legTop - 6 + k, P.giraffeDark);
}

function zebra(c: PixelCanvas, x: number, base: number) {
  c.rect(x, base - 9, 10, 5, P.zebra);
  for (let i = 0; i < 10; i += 2) c.rect(x + i, base - 9, 1, 5, P.stripe);
  for (const lx of [x + 1, x + 3, x + 7, x + 9]) { c.rect(lx, base - 4, 1, 4, P.zebra); c.set(lx, base - 2, P.stripe); }
  c.rect(x + 9, base - 12, 2, 4, P.zebra); c.rect(x + 10, base - 13, 3, 2, P.zebra);
  c.set(x + 9, base - 13, P.stripe); c.set(x + 12, base - 12, P.stripe);
}

export const nairobiScene: PostcardScene = {
  cityId: "nairobi",
  accent: "#b8642a",
  windowFocus: [140, 44],
  description: "Pixel-art view of Nairobi National Park: two spotted giraffes and grazing zebras among flat-topped acacia trees on the golden savanna, with the Nairobi skyline and the round KICC tower with its saucer crown rising just beyond the plains.",
  draw(c) {
    sky(c, P.sky, 68);
    c.disc(46, 54, 8, P.sun);
    birds(c, 17, 20, 10, 90, 30, 6, P.bird);
    skyline(c);
    savanna(c);
    acacia(c, 30, 80, 26, 34);
    acacia(c, 92, 72, 14, 18);
    acacia(c, 210, 84, 22, 30);
    zebra(c, 104, 88);
    zebra(c, 118, 90);
    giraffe(c, 176, 104, -1);
    giraffe(c, 54, 100, 1);
  },
  drawStamp(c, x, y, w, h) {
    c.gradient(y, y + h - 1, [P.sky[1]!, P.sky[4]!], x, x + w - 1);
    c.rect(x, y + h - 4, w, 4, P.grass);
    const cx = x + 5, base = y + h - 3;
    for (let k = 0; k < 4; k++) c.hline(x + w - 12, x + w - 3, y + 6 + (k === 3 ? 0 : 0), P.acacia);
    c.rect(x + w - 8, y + 6, 1, h - 9, P.bark);
    c.rect(cx, base - 5, 6, 3, P.giraffe);
    c.rect(cx + 5, base - 13, 2, 9, P.giraffe);
    c.rect(cx + 5, base - 14, 3, 2, P.giraffe);
    for (const lx of [cx, cx + 5]) c.rect(lx, base - 2, 1, 3, P.giraffe);
  },
};
