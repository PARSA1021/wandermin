import { bayer, rng, type PixelCanvas } from "../pixel/canvas";
import type { PostcardScene } from "../template";
import { W, H, birds, palm, sky } from "./common";

/** Marrakech at dusk: the Koutoubia minaret, snowy Atlas behind, red ramparts, Jemaa el-Fnaa stalls, lanterns and smoke. */
const P = {
  sky: ["#3f4f8a", "#7a6aa0", "#d08a8a", "#f2a670", "#f8cc8a"],
  atlas: "#8a7aa0", atlasSnow: "#f3eef4", atlasShade: "#6f6288",
  minaret: "#c8865a", minaretShade: "#a0643c", minaretLight: "#e0a070", tile: "#2f8f7a", merlon: "#d89a6a", ball: "#e8c060",
  wall: "#c8704a", wallShade: "#a05434", wallDark: "#7a3e26", wallLight: "#e08a5e",
  palm: ["#4f7a44", "#6f9a58", "#3a5a34"], trunk: "#7a5a40", ring: "#5a4030",
  square: "#d0a078", squareShade: "#b08460",
  tent: ["#f3ead8", "#e8c060", "#c8432f", "#2f8f7a"], stall: "#5a3a28",
  lantern: "#f7c84a", lanternGlow: "#fbe7a0", lanternRed: "#e8583a",
  smoke: "#d8ccd8", orange: "#f2902a", coats: ["#f3ead8", "#c8432f", "#2f8f7a", "#e8c060", "#3a4a8a", "#7a3a8a"],
};

function atlas(c: PixelCanvas) {
  c.paint((x, y) => {
    const t = 46 + Math.sin(x / 13) * 5 + Math.sin(x / 5) * 1.5 + Math.abs(Math.sin(x / 31)) * 6;
    if (y < t || y > 70) return null;
    const d = y - t;
    if (d < 3 + Math.sin(x / 3)) return bayer(x, y) < 0.7 ? P.atlasSnow : P.atlas;
    return bayer(x, y) < 0.1 ? P.atlasShade : P.atlas;
  }, 0, 36, W - 1, 70);
}

function koutoubia(c: PixelCanvas) {
  // square tower with carved panels and a turquoise tile band, crenellated top, lantern pavilion and golden orbs
  const cx = 70, base = 84, half = 9, top = 22;
  c.rect(cx - half, top, half * 2 + 1, base - top, P.minaret);
  c.rect(cx + half - 3, top, 4, base - top, P.minaretShade);
  // decorative panels: lobed blind arches with the sebka net pattern
  for (const py of [32, 50, 66]) {
    c.rect(cx - 5, py, 8, 10, P.minaretShade);
    for (let x = cx - 4; x < cx + 3; x++) for (let y = py + 1; y < py + 9; y++) if ((x + y) % 3 === 0) c.set(x, y, P.minaretLight);
    c.hline(cx - 4, cx + 2, py, P.minaretLight);
    c.set(cx - 1, py - 1, P.minaretLight);
  }
  c.rect(cx - 1, 76, 3, 5, P.wallDark);
  c.hline(cx - half, cx + half, top + 3, P.tile);
  c.hline(cx - half, cx + half, top + 4, P.tile);
  for (let x = cx - half; x <= cx + half; x += 3) c.rect(x, top - 3, 2, 3, P.merlon);
  // the lantern
  c.rect(cx - 3, top - 12, 7, 9, P.minaret);
  c.rect(cx + 2, top - 12, 2, 9, P.minaretShade);
  c.hline(cx - 3, cx + 3, top - 9, P.tile);
  c.rect(cx - 1, top - 7, 2, 3, P.minaretShade);
  for (let x = cx - 3; x <= cx + 3; x += 2) c.set(x, top - 13, P.merlon);
  c.disc(cx, top - 15, 1.6, P.ball);
  c.set(cx, top - 17, P.ball);
  c.set(cx, top - 19, P.ball);
  c.rect(cx, top - 21, 1, 2, P.minaretShade);
}

function ramparts(c: PixelCanvas) {
  c.rect(0, 74, W, 12, P.wall);
  c.hline(0, W - 1, 74, P.wallLight);
  for (let x = 0; x < W; x += 5) c.rect(x, 71, 3, 3, P.wall);
  for (let x = 4; x < W; x += 22) { c.rect(x, 66, 9, 20, P.wall); c.rect(x + 7, 66, 2, 20, P.wallShade); for (let k = 0; k < 9; k += 3) c.rect(x + k, 64, 2, 2, P.wall); }
  for (let x = 2; x < W; x += 3) for (let y = 76; y < 86; y += 4) if (bayer(x, y) < 0.3) c.set(x, y, P.wallShade);
  // a horseshoe gate
  const gx = 150;
  c.rect(gx - 6, 72, 13, 14, P.wallLight);
  for (let y = 75; y < 86; y++) { const t = Math.max(0, (79 - y) / 4); const hw = Math.round(4 * Math.sqrt(Math.max(0, 1 - t * t))) + (y < 78 ? 1 : 0); c.hline(gx - hw, gx + hw, y, P.wallDark); }
}

function square(c: PixelCanvas) {
  c.paint((x, y) => (bayer(x, y) < 0.15 ? P.squareShade : P.square), 0, 86, W - 1, H - 1);
  const r = rng(616);
  // food stalls with awnings, smoke rising from the grills
  for (let i = 0; i < 6; i++) {
    const x = 6 + i * 36 + Math.floor(r() * 6), y = 94;
    const col = P.tent[i % P.tent.length]!;
    for (let k = 0; k < 4; k++) c.hline(x - 1 + k, x + 20 - k, y - 4 + k, k % 2 ? col : P.tent[0]!);
    c.rect(x + 1, y, 18, 6, P.stall);
    for (let gx = x + 3; gx < x + 18; gx += 3) c.set(gx, y + 1, P.lanternRed);
    c.rect(x, y - 1, 1, 8, P.stall); c.rect(x + 19, y - 1, 1, 8, P.stall);
    for (let k = 0; k < 10; k++) {
      const sx = x + 10 + Math.round(Math.sin(k / 2 + i) * 2), sy = y - 6 - k * 2;
      if (bayer(sx, sy) < 0.6) { c.set(sx, sy, P.smoke); c.set(sx + 1, sy - 1, P.smoke); }
    }
  }
  // orange-juice cart and pyramids of oranges
  for (const ox of [104, 108, 112]) c.set(ox, 101, P.orange);
  c.set(106, 100, P.orange); c.set(110, 100, P.orange); c.set(108, 99, P.orange);
  // hanging brass lanterns on strings
  for (let x = 0; x < W; x += 2) c.set(x, 88 + Math.round(Math.sin((x % 56) / 56 * Math.PI) * 3), P.stall);
  for (let x = 6; x < W; x += 14) {
    const y = 89 + Math.round(Math.sin((x % 56) / 56 * Math.PI) * 3);
    c.rect(x, y, 2, 3, x % 28 === 6 ? P.lanternRed : P.lantern);
    c.set(x, y + 3, P.lanternGlow);
  }
  // crowd
  for (let i = 0; i < 18; i++) {
    const x = 4 + Math.floor(r() * 216), y = 102 + Math.floor(r() * 4);
    const col = P.coats[Math.floor(r() * P.coats.length)]!;
    c.rect(x, y - 4, 2, 5, col); c.set(x, y - 5, "#b07a52");
    if (r() < 0.4) c.hline(x - 1, x + 2, y - 6, col); // hood or fez
  }
}

export const marrakechScene: PostcardScene = {
  cityId: "marrakech",
  accent: "#c8582a",
  windowFocus: [70, 40],
  description: "Pixel-art view of Marrakech at dusk: the sandstone Koutoubia minaret with carved panels, a turquoise tile band and golden orbs on its lantern, the snow-capped Atlas Mountains behind, the red ramparts with a horseshoe gate, palms, and Jemaa el-Fnaa square with food stalls under striped awnings, grill smoke, hanging brass lanterns, oranges and a busy crowd.",
  draw(c) {
    sky(c, P.sky, 70);
    birds(c, 81, 110, 14, 200, 34, 7, "#4a3a5a");
    c.disc(196, 18, 3, "#fbe8c0");
    atlas(c);
    ramparts(c);
    palm(c, 30, 74, 26, 1, P.palm, P.trunk, P.ring);
    palm(c, 118, 74, 30, -1, P.palm, P.trunk, P.ring);
    palm(c, 198, 74, 24, 1, P.palm, P.trunk, P.ring);
    koutoubia(c);
    square(c);
  },
  drawStamp(c, x, y, w, h) {
    c.gradient(y, y + h - 1, [P.sky[1]!, P.sky[3]!], x, x + w - 1);
    const cx = x + Math.floor(w / 2), base = y + h - 2;
    c.rect(cx - 3, y + 5, 7, base - y - 5, P.minaret);
    c.rect(cx - 1, y + 2, 3, 3, P.minaret);
    c.set(cx, y + 1, P.ball);
    c.hline(cx - 3, cx + 3, y + 7, P.tile);
    c.rect(x, base - 2, w, 4, P.wall);
  },
};
