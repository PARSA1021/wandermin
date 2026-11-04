import { rng, type PixelCanvas } from "../pixel/canvas";
import type { PostcardScene } from "../template";
import { cloud, foliage, reflection, ridge, sky, water, birds, people, rowboat } from "./common";

/** Bangkok: Wat Arun's porcelain-studded prang over the Chao Phraya, a long-tail boat and palms. */
const P = {
  sky: ["#3f6fa8", "#5b8cc4", "#87b0d8", "#bcd5e4", "#ece6cf"],
  cloud: "#f6f3ea", cloudShade: "#d6dfe8",
  shore: "#7c9a6c", shoreDark: "#5f7f56",
  stone: "#ebdec6", stoneShade: "#c2b091", stoneDeep: "#9c8a6e", spire: "#d9c08a",
  porcelain: ["#d0583a", "#3f8fa8", "#e2b84a", "#5aa06a", "#f2f0e8"],
  water: "#8f8a6a", waterLight: "#c7c3a0", waterDark: "#6d6a52",
  hull: "#4a3026", hullLight: "#6e4634", canopy: "#2f8a86", canopyDark: "#22625f", garland: "#e2b84a",
  palm: ["#3f8a4f", "#6db36a", "#2d6a3d", "#8ccf77"], trunk: "#7a5a40",
};

/** A khmer-style prang: stepped terraces, a corn-cob tower and a thin spire. */
function prang(c: PixelCanvas, cx: number, base: number, s: number, seed: number) {
  const r = rng(seed);
  const terraceTop = base - 16 * s;
  // terraces
  for (let t = 0; t < 3; t++) {
    const y1 = base - t * 5 * s, y0 = y1 - 5 * s, hw = (22 - t * 5) * s;
    c.rect(Math.round(cx - hw), Math.round(y0), Math.round(hw * 2) + 1, Math.round(5 * s), P.stone);
    c.rect(Math.round(cx + hw - 2 * s), Math.round(y0), Math.max(1, Math.round(2 * s)), Math.round(5 * s), P.stoneShade);
    c.hline(Math.round(cx - hw), Math.round(cx + hw), Math.round(y0), P.stoneDeep);
  }
  // corn-cob tower
  const top = terraceTop - 48 * s;
  for (let y = Math.round(top); y <= terraceTop; y++) {
    const t = (y - top) / (terraceTop - top);
    // corn-cob bulge: swells through the middle, pinches in just above the terraces
    const hw = (2.5 + 10 * Math.pow(Math.sin(t * Math.PI * 0.62), 1.4) - (t > 0.93 ? (t - 0.93) * 30 : 0)) * s;
    const band = Math.floor((y - top) / Math.max(2, 4 * s));
    for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) {
      const edge = (y - top) % Math.max(2, Math.round(4 * s)) === 0;
      const right = x > cx + hw * 0.45;
      let col = edge ? P.stoneDeep : right ? P.stoneShade : P.stone;
      if (!edge && (x + band * 2) % 3 === 0 && r() < 0.55) col = P.porcelain[Math.floor(r() * P.porcelain.length)]!;
      c.set(x, y, col);
    }
  }
  // spire with a small trident tip
  c.rect(Math.round(cx), Math.round(top - 14 * s), 1, Math.round(14 * s), P.spire);
  c.set(Math.round(cx) - 1, Math.round(top - 12 * s), P.spire);
  c.set(Math.round(cx) + 1, Math.round(top - 12 * s), P.spire);
}

/** Thai temple hall: stacked, overlapping gables in orange and green with curling chofa finials. */
function templeHall(c: PixelCanvas, cx: number, base: number) {
  c.rect(cx - 16, base - 9, 33, 9, "#f2ebdc");
  c.rect(cx + 12, base - 9, 5, 9, P.stoneShade);
  for (let x = cx - 14; x < cx + 14; x += 5) c.rect(x, base - 7, 2, 6, "#b98a3a");
  const layers: [number, number, string][] = [[base - 10, 22, "#d0712c"], [base - 15, 17, "#3f8a5a"], [base - 20, 12, "#d0712c"]];
  for (const [y, hw, col] of layers) {
    for (let k = 0; k < 5; k++) c.hline(cx - hw + k * 2, cx + hw - k * 2, y - k, k === 0 ? "#e2b84a" : col);
    c.set(cx - hw - 1, y - 2, "#e2b84a"); c.set(cx + hw + 1, y - 2, "#e2b84a");
  }
  // chofa finials curling up from the ridge ends
  for (const dx of [-8, 8]) { c.set(cx + dx, base - 25, "#e2b84a"); c.set(cx + dx + Math.sign(dx), base - 26, "#e2b84a"); c.set(cx + dx + Math.sign(dx), base - 27, "#e2b84a"); }
}

function longTail(c: PixelCanvas, x0: number, y: number) {
  for (let x = x0; x < x0 + 44; x++) {
    const lift = x > x0 + 36 ? Math.round((x - x0 - 36) * 0.6) : 0;
    c.set(x, y - lift, P.hullLight);
    c.set(x, y + 1 - lift, P.hull);
    if (x < x0 + 38) c.set(x, y + 2, P.hull);
  }
  for (let x = x0 + 40; x < x0 + 46; x++) c.set(x, y - 5 - (x - x0 - 40), P.hull); // high prow
  for (let k = 0; k < 4; k++) c.set(x0 + 44 + k, y - 9 - k, P.garland); // garland on the prow
  // canopy on four posts
  c.rect(x0 + 8, y - 7, 24, 2, P.canopy);
  c.hline(x0 + 8, x0 + 31, y - 5, P.canopyDark);
  for (const px of [x0 + 9, x0 + 30]) c.rect(px, y - 5, 1, 5, P.hullLight);
  // engine and long tail shaft
  c.rect(x0 - 3, y - 3, 4, 3, P.hull);
  c.line(x0 - 2, y, x0 - 14, y + 4, P.hullLight);
}

function palm(c: PixelCanvas, x: number, base: number, h: number, seed: number) {
  for (let y = base; y > base - h; y--) c.set(x + Math.round(Math.sin((base - y) / 9) * 2), y, P.trunk);
  const tx = x + Math.round(Math.sin(h / 9) * 2), ty = base - h;
  for (let k = 0; k < 7; k++) {
    const a = Math.PI + (k / 6) * Math.PI;
    for (let d = 1; d < 10; d++) c.set(tx + Math.round(Math.cos(a) * d), ty + Math.round(Math.sin(a) * d * 0.6 + d * d * 0.05), k % 2 ? P.palm[0]! : P.palm[2]!);
  }
  foliage(c, seed, tx, ty, 3, P.palm);
}

export const bangkokScene: PostcardScene = {
  cityId: "bangkok",
  accent: "#7a4592",
  description: "Pixel-art view of Bangkok: Wat Arun's central prang decorated with coloured porcelain, flanked by smaller prangs on the bank of the Chao Phraya, with a long-tail boat and palm trees.",
  draw(c) {
    sky(c, P.sky);
    cloud(c, 20, 76, 24, P.cloud, P.cloudShade);
    cloud(c, 160, 212, 52, P.cloud, P.cloudShade);
    cloud(c, 96, 124, 44, P.cloud, P.cloudShade);
    ridge(c, (x) => 86 + Math.sin(x / 7) + Math.sin(x / 2.5), P.shore, P.shoreDark);
    templeHall(c, 36, 88);
    prang(c, 82, 90, 0.5, 3);
    prang(c, 180, 90, 0.5, 4);
    prang(c, 128, 92, 1, 5);
    palm(c, 8, 90, 26, 51);
    palm(c, 210, 90, 22, 52);
    water(c, 93, P.water, P.waterLight, P.waterDark, 61);
    reflection(c, 128, 20, 95, P.stoneShade, 0.3);
    longTail(c, 40, 101);
    // a Chao Phraya express boat with its orange flag, flags by the temples, people on the bank, birds
    rowboat(c, 150, 100, 40, "#f3ece0", "#2f5a9a");
    c.rect(156, 94, 28, 6, "#f3ece0");
    for (let x = 158; x < 182; x += 3) c.rect(x, 95, 2, 2, "#5b6b7a");
    c.hline(155, 185, 93, "#c8432f");
    c.rect(186, 90, 1, 6, "#3d4560"); c.rect(187, 90, 3, 2, "#e07a3a");
    for (const fxp of [60, 104, 156]) {
      c.rect(fxp, 74, 1, 14, "#8a7a55");
      c.rect(fxp + 1, 74, 5, 1, "#c8432f"); c.rect(fxp + 1, 75, 5, 1, "#f3ece0"); c.rect(fxp + 1, 76, 5, 2, "#2f4f8f"); c.rect(fxp + 1, 78, 5, 1, "#f3ece0"); c.rect(fxp + 1, 79, 5, 1, "#c8432f");
    }
    people(c, 460, 89, 90, 200, 10, ["#e2b84a", "#f3ece0", "#c8432f", "#7a4592", "#2f3346"]);
    birds(c, 461, 20, 30, 70, 46, 4, "#3a4466");
  },
  drawStamp(c, x, y, w, h) {
    c.rect(x, y, w, h, "#f3e6c9");
    const cx = x + Math.floor(w / 2);
    for (let k = 0; k < 13; k++) {
      const hw = Math.round(1 + k * 0.45);
      c.hline(cx - hw, cx + hw, y + 3 + k, k % 3 === 0 ? P.stoneDeep : "#7a4592");
    }
    c.rect(cx, y, 1, 3, "#7a4592");
    c.hline(x + 2, x + w - 3, y + h - 2, "#7a4592");
  },
};

