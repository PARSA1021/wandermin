import { bayer, rng, type PixelCanvas } from "../pixel/canvas";
import type { PostcardScene } from "../template";
import { W, H, leaf, sky } from "./common";

/** Reykjavík on a winter night: the northern lights over Hallgrímskirkja, coloured tin-roofed houses, snowy Esja. */
const P = {
  sky: ["#0c1430", "#14214a", "#1c2f5e", "#24406e", "#2f527a"],
  star: "#eef2f6",
  aurora: ["#3af0a0", "#5ae8b0", "#8af0c8", "#2ab890", "#a87af0"],
  esja: "#5a6a8a", esjaSnow: "#d8e2f0", esjaShade: "#4a5878",
  sea: "#1a2a4a", seaLight: "#3ab89a", seaDark: "#122038",
  church: "#d8dce2", churchShade: "#a8b0bc", churchDeep: "#8890a0", churchLit: "#f7d88a",
  snow: "#eef2f8", snowShade: "#b8c4d8", snowDeep: "#8a9ab8",
  lit: "#f7d88a", litWarm: "#f2b05a",
  houses: ["#c8432f", "#f2c14e", "#3a78c8", "#2f8f6a", "#f3ece0", "#8a4ab0", "#e8862a"],
  roofs: ["#3a3a48", "#c8432f", "#2f5a8a", "#4a6a4a"],
  lamp: "#f7d88a",
};

function aurora(c: PixelCanvas) {
  // two curtains of light: bright lower edge, rays fading upwards, slight purple fringe at the top
  const curtains = [
    { y: (x: number) => 30 + Math.sin(x / 22) * 8 + Math.sin(x / 7) * 2, len: 22, phase: 0 },
    { y: (x: number) => 20 + Math.sin(x / 30 + 2) * 6 + Math.sin(x / 11) * 2, len: 16, phase: 3 },
  ];
  for (const cu of curtains) {
    for (let x = 0; x < W; x++) {
      const base = Math.round(cu.y(x));
      const ray = 0.6 + 0.4 * Math.sin((x + cu.phase) / 3) * Math.sin((x + cu.phase) / 13);
      const len = Math.round(cu.len * ray);
      for (let k = 0; k < len; k++) {
        const y = base - k, t = k / len;
        if (y < 0) break;
        if (bayer(x, y) > 1 - t * 0.9 + 0.1) continue; // thinning dither towards the top
        c.set(x, y, t < 0.12 ? P.aurora[2]! : t < 0.5 ? P.aurora[0]! : t < 0.85 ? P.aurora[3]! : P.aurora[4]!);
      }
    }
  }
}

function esja(c: PixelCanvas) {
  // the flat-topped mountain across the bay, snow in its gullies
  c.paint((x, y) => {
    // long flat-topped massif across the bay: snowy summit plateau, snow thinning down the dark slopes
    const t = 50 + Math.sin(x / 23) * 1.5 + (x < 40 ? (40 - x) * 0.25 : 0) + (x > 190 ? (x - 190) * 0.2 : 0);
    if (y < t || y > 64) return null;
    const d = y - t;
    if (d < 2) return P.esjaSnow;
    const snowShare = Math.max(0, 0.75 - d * 0.09);
    return leaf(x, y * 2) < snowShare ? P.esjaSnow : leaf(x, y) < 0.15 ? P.esjaShade : P.esja;
  }, 0, 44, W - 1, 64);
  c.paint((x, y) => (y % 3 === 0 && bayer(x, y) < 0.15 ? P.seaLight : P.sea), 0, 64, W - 1, 70);
}

function hallgrimskirkja(c: PixelCanvas) {
  // the tower's stepped wings imitate basalt columns, rising to a steep central spire, nave behind
  const cx = 112, base = 86;
  const steps: [number, number][] = [[24, 72], [20, 66], [16, 58], [12, 50], [8, 40], [5, 30]];
  for (const [half, top] of steps) {
    for (let x = cx - half; x <= cx + half; x++) {
      for (let y = top; y < base; y++) {
        const col = (Math.abs(x - cx) % 2 === 0) ? P.church : P.churchShade;
        c.set(x, y, x > cx + half - 2 ? P.churchDeep : col);
      }
    }
    c.hline(cx - half, cx + half, top, P.snow); // snow on each step
  }
  // spire and clock
  for (let k = 0; k < 16; k++) c.hline(cx - Math.max(0, 4 - Math.floor(k / 4)), cx + Math.max(0, 4 - Math.floor(k / 4)), 30 - k, k % 2 ? P.church : P.churchShade);
  c.rect(cx, 8, 1, 6, P.church);
  c.set(cx, 7, P.church); c.hline(cx - 1, cx + 1, 9, P.church);
  c.disc(cx, 36, 2, P.churchLit);
  // lit door and tall windows
  c.rect(cx - 2, base - 10, 5, 10, P.churchLit);
  for (const wx of [cx - 10, cx + 10]) c.rect(wx, base - 18, 1, 8, P.churchLit);
  // nave going back on the right
  c.rect(cx + 24, 74, 30, base - 74, P.churchShade);
  c.hline(cx + 24, cx + 53, 74, P.snow);
  for (let x = cx + 28; x < cx + 52; x += 5) c.rect(x, 78, 1, 5, P.churchLit);
}

function houses(c: PixelCanvas) {
  // corrugated-iron houses in bright colours with snowy roofs, stepping down the hill
  const r = rng(404);
  for (let row = 0; row < 2; row++) {
    const base = 92 + row * 10;
    for (let x = -4 - row * 5; x < W; x += 13 + Math.floor(r() * 4)) {
      if (row === 0 && x > 80 && x < 170) continue;
      const w = 11 + Math.floor(r() * 3), h = 8 + Math.floor(r() * 4);
      const col = P.houses[Math.floor(r() * P.houses.length)]!;
      c.rect(x, base - h, w, h, col);
      for (let i = x; i < x + w; i += 2) for (let y = base - h; y < base; y++) if (bayer(i, y) < 0.3) c.set(i, y, P.snowDeep); // corrugation
      // gabled roof with snow
      const half = Math.ceil(w / 2) + 1, mid = x + Math.floor(w / 2);
      for (let k = 0; k < 5; k++) c.hline(mid - half + k, mid + half - k, base - h - 1 - k, k < 2 ? P.roofs[Math.floor(r() * P.roofs.length)]! : P.snow);
      for (let k = 0; k < 4; k++) c.hline(mid - half + k + 1, mid + half - k - 1, base - h - 2 - k, P.snow);
      c.rect(x + 2, base - h + 2, 3, 3, r() < 0.7 ? P.lit : P.litWarm);
      c.rect(x + w - 5, base - h + 2, 3, 3, r() < 0.5 ? P.lit : P.snowDeep);
    }
  }
}

function snowyStreet(c: PixelCanvas) {
  c.paint((x, y) => (bayer(x, y) < 0.12 ? P.snowShade : P.snow), 0, 102, W - 1, H - 1);
  for (const x of [20, 70, 160, 208]) {
    c.rect(x, 90, 1, 13, P.churchDeep);
    c.rect(x - 1, 89, 3, 2, P.lamp);
    for (let k = 1; k < 4; k++) if (bayer(x, 90 + k) < 0.5) { c.set(x - k, 91 + k, P.lamp); c.set(x + k, 91 + k, P.lamp); }
  }
  // falling snow
  const r = rng(99);
  for (let i = 0; i < 40; i++) c.set(Math.floor(r() * W), 40 + Math.floor(r() * 60), P.snow);
}

export const reykjavikScene: PostcardScene = {
  cityId: "reykjavik",
  accent: "#2ab890",
  postmarkInk: "#eef2f6",
  windowFocus: [112, 30],
  description: "Pixel-art view of Reykjavík on a winter night: green and violet curtains of the northern lights over the stepped, basalt-column tower of Hallgrímskirkja with its lit door and clock, the snowy flat-topped Esja mountain across the bay, brightly coloured corrugated-iron houses with snow-covered roofs and glowing windows, street lamps and falling snow.",
  draw(c) {
    sky(c, P.sky, 64);
    const r = rng(7);
    for (let i = 0; i < 60; i++) { const x = Math.floor(r() * W), y = Math.floor(r() * 50); if (bayer(x, y) < 0.35) c.set(x, y, P.star); }
    aurora(c);
    esja(c);
    houses(c);
    hallgrimskirkja(c);
    snowyStreet(c);
  },
  drawStamp(c, x, y, w, h) {
    c.gradient(y, y + h - 1, [P.sky[0]!, P.sky[3]!], x, x + w - 1);
    for (let i = x; i < x + w; i++) for (let k = 0; k < 4; k++) c.set(i, y + 5 + Math.round(Math.sin((i - x) / 3)) + k, k < 2 ? P.aurora[0]! : P.aurora[3]!);
    const cx = x + Math.floor(w / 2), base = y + h - 2;
    for (const [hw, t] of [[6, 4], [4, 7], [2, 10]] as const) c.rect(cx - hw, base - t, hw * 2 + 1, t, P.church);
    c.rect(cx, base - 14, 1, 4, P.church);
  },
};
