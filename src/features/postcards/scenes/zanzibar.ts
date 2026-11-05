import { bayer, rng, type PixelCanvas } from "../pixel/canvas";
import type { PostcardScene } from "../template";
import { W, H, birds, cloud, palm, sky } from "./common";

/** Zanzibar: Stone Town's waterfront — coral-stone buildings with carved balconies, the Old Fort, dhows on turquoise water. */
const P = {
  sky: ["#3f8ad0", "#6aa8e0", "#9ccbea", "#d2e6ee", "#f4f0e2"],
  cloud: "#fbfaf4", cloudShade: "#d4e2ea",
  stone: "#e8dcc4", stoneShade: "#c8b898", stoneDeep: "#a89474", stoneLight: "#f8f0dc",
  white: "#f6f2ea", whiteShade: "#d8d2c6",
  balcony: "#2f7a7a", balconyDark: "#1f5a5a", shutter: "#3a8a6a", door: "#6a4a2a", doorStud: "#d8b060",
  fort: "#c8a078", fortShade: "#a07a58", fortDark: "#7a5a40",
  sea: "#2ab0b8", seaLight: "#8ae4e0", seaDeep: "#1f8aa0", seaDark: "#1a6a8a", shallow: "#7ad8d0",
  sand: "#f4e6c4", sandShade: "#e0cca0",
  hull: "#8a5a32", hullDark: "#5a3a20", hullLight: "#b07a48", sail: "#f6efe0", sailShade: "#d8ccb4", mast: "#4a3020",
  palm: ["#3f8a4a", "#5fa85a", "#2c6a3a"], trunk: "#8a6a4a", ring: "#6a4e36",
  kanga: ["#e8483a", "#f2c14e", "#2f8f6a", "#3a78c8", "#e88aa0"],
};

function stoneTown(c: PixelCanvas) {
  const base = 74;
  // Old Fort on the left: crenellated ochre walls and a round bastion
  c.rect(0, 52, 46, base - 52, P.fort);
  c.rect(38, 52, 8, base - 52, P.fortShade);
  for (let x = 0; x < 46; x += 4) c.rect(x, 49, 2, 3, P.fort);
  c.rect(8, 40, 14, 12, P.fort); c.rect(18, 40, 4, 12, P.fortShade);
  for (let x = 8; x < 22; x += 3) c.rect(x, 37, 2, 3, P.fort);
  for (let x = 4; x < 44; x += 7) c.rect(x, 60, 2, 4, P.fortDark);
  c.rect(26, 64, 6, 10, P.fortDark); c.hline(27, 30, 63, P.fortDark);
  // the waterfront row: tall coral-stone and whitewashed houses with long carved verandas
  const r = rng(77);
  let x = 48;
  while (x < W) {
    const w = 18 + Math.floor(r() * 10), h = 26 + Math.floor(r() * 12), top = base - h;
    const white = r() < 0.45;
    c.rect(x, top, w, h, white ? P.white : P.stone);
    c.rect(x + w - 3, top, 3, h, white ? P.whiteShade : P.stoneShade);
    // weathering streaks on the coral stone
    if (!white) for (let i = x; i < x + w - 3; i++) for (let y = top; y < base; y++) if (bayer(i, y) < 0.08) c.set(i, y, P.stoneDeep);
    c.hline(x, x + w - 1, top, white ? P.stoneLight : P.stoneLight);
    // rows of windows with green shutters
    for (let y = top + 4; y < base - 14; y += 8) for (let wx = x + 3; wx < x + w - 4; wx += 5) { c.rect(wx, y, 2, 4, P.balconyDark); c.set(wx - 1, y, P.shutter); c.set(wx + 2, y, P.shutter); }
    // a long carved wooden veranda on the first floor
    if (r() < 0.7) {
      const vy = base - 14;
      c.rect(x, vy - 6, w - 3, 6, P.balcony);
      c.hline(x, x + w - 4, vy - 7, P.balconyDark);
      for (let i = x + 1; i < x + w - 4; i += 2) c.rect(i, vy - 5, 1, 5, P.balconyDark);
      c.hline(x, x + w - 4, vy - 2, P.balconyDark);
    }
    // carved Zanzibari door with brass studs
    const dx = x + Math.floor(w / 2) - 2;
    c.rect(dx, base - 8, 5, 8, P.door);
    c.hline(dx, dx + 4, base - 9, P.door); c.set(dx + 2, base - 10, P.door);
    for (const [ix, iy] of [[1, 2], [3, 2], [1, 5], [3, 5]] as const) c.set(dx + ix, base - 8 + iy, P.doorStud);
    x += w;
  }
  // House of Wonders-like clock tower peeking above
  c.rect(124, 26, 8, 14, P.white); c.rect(129, 26, 3, 14, P.whiteShade);
  c.disc(127, 30, 2, P.stoneDeep); c.set(127, 30, P.white);
  c.hline(123, 132, 25, P.balcony);
  // the shore
  c.rect(0, base, W, 3, P.sand);
  c.hline(0, W - 1, base + 2, P.sandShade);
}

function sea(c: PixelCanvas) {
  c.paint((x, y) => {
    const d = y - 77;
    const band = d < 3 ? P.shallow : d < 9 ? P.sea : d < 20 ? P.seaDeep : P.seaDark;
    if (y % 3 === 0 && bayer(x, y) < 0.25) return P.seaLight;
    return band;
  }, 0, 77, W - 1, H - 1);
}

function dhow(c: PixelCanvas, x: number, y: number, len: number, flip: boolean) {
  // planked wooden hull with a raised stern, a raked mast and the big lateen sail
  const dir = flip ? -1 : 1;
  for (let k = 0; k < 4; k++) {
    for (let i = 0; i < len - k * 2; i++) c.set(x + (k + i) * dir, y + k, k === 0 ? P.hullLight : k % 2 ? P.hull : P.hullDark);
  }
  for (let k = 1; k < 4; k++) c.set(x + (len - 1) * dir, y - k, P.hull); // stern post
  c.set(x - dir, y - 1, P.hull); // prow
  const mx = x + Math.round(len * 0.45) * dir;
  c.line(mx, y, mx + 2 * dir, y - 22, P.mast);
  // lateen: a long yard slanted from low at the bow to high astern, triangular sail below it
  const ax = mx - Math.round(len * 0.5) * dir, ay = y - 6, bx = mx + Math.round(len * 0.4) * dir, by = y - 26;
  c.line(ax, ay, bx, by, P.mast);
  for (let t = 0; t <= 1; t += 0.02) {
    const px = Math.round(ax + (bx - ax) * t), py = Math.round(ay + (by - ay) * t);
    for (let yy = py + 1; yy < y - 1 - Math.round((1 - t) * 3); yy++) {
      if (Math.abs(px - mx) < Math.abs(bx - mx) * (1 - (yy - py) / (y - py)) + 2 || t < 0.55) c.set(px, yy, (px + yy) % 7 === 0 ? P.sailShade : P.sail);
    }
  }
  for (let i = 0; i < len; i++) if (bayer(x + i * dir, y + 5) < 0.4) c.set(x + i * dir, y + 5, P.seaDark);
}

export const zanzibarScene: PostcardScene = {
  cityId: "zanzibar",
  accent: "#1f9aa0",
  windowFocus: [150, 50],
  description: "Pixel-art view of Zanzibar's Stone Town waterfront: coral-stone and whitewashed houses with long carved green wooden verandas, shuttered windows and studded Zanzibari doors, the crenellated ochre Old Fort, a clock tower, palms, a sandy shore and wooden dhows with white lateen sails on bands of turquoise water.",
  draw(c) {
    sky(c, P.sky, 74);
    cloud(c, 14, 64, 12, P.cloud, P.cloudShade, 3);
    cloud(c, 140, 180, 8, P.cloud, P.cloudShade);
    birds(c, 51, 60, 16, 110, 30, 5, "#3a4a5a");
    stoneTown(c);
    palm(c, 50, 76, 30, -1, P.palm, P.trunk, P.ring);
    palm(c, 212, 76, 26, 1, P.palm, P.trunk, P.ring);
    sea(c);
    dhow(c, 30, 92, 30, false);
    dhow(c, 170, 98, 36, true);
    dhow(c, 110, 84, 18, false);
    // women in bright kangas on the shore
    for (let i = 0; i < 6; i++) { const x = 64 + i * 22; c.rect(x, 71, 2, 5, P.kanga[i % P.kanga.length]!); c.set(x, 70, "#6a4a32"); c.set(x + 1, 70, P.kanga[(i + 2) % P.kanga.length]!); }
  },
  drawStamp(c, x, y, w, h) {
    c.gradient(y, y + h - 1, [P.sky[1]!, P.sky[3]!], x, x + w - 1);
    c.rect(x, y + h - 5, w, 5, P.sea);
    const mx = x + Math.floor(w / 2);
    c.hline(mx - 6, mx + 6, y + h - 6, P.hull);
    c.line(mx - 7, y + h - 9, mx + 5, y + 2, P.mast);
    for (let k = 0; k < 10; k++) c.hline(mx - 5 + Math.floor(k * 0.5), mx + Math.min(4, k), y + 4 + k, P.sail);
  },
};
