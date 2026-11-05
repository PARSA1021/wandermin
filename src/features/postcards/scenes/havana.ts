import { bayer, rng, type PixelCanvas } from "../pixel/canvas";
import type { PostcardScene } from "../template";
import { W, H, birds, cloud, palm, sky } from "./common";

/** Havana: El Capitolio's dome over the Paseo del Prado, pastel colonial arcades, and vintage American cars. */
const P = {
  sky: ["#3f84cc", "#66a2dc", "#9ac4e8", "#cfe2ee", "#f4f0e0"],
  cloud: "#fbfaf4", cloudShade: "#d2e0ea",
  stone: "#ece2cc", stoneShade: "#c8b898", stoneDeep: "#a8946e", stoneLight: "#fbf4e2", dome: "#e4dccb", domeShade: "#bfb39c",
  colonial: ["#f2b8a8", "#8ad0c8", "#f6d88a", "#b8d4f0", "#f3ece0", "#e89a7a", "#c8e0a0"],
  arcade: "#5a4a42", shutter: "#2f7a6a", balcony: "#3a3a40",
  street: "#8a8a90", streetLight: "#a8a8ae", kerb: "#d8d0c0", line: "#f2e8c8",
  cars: [
    { body: "#e86a9a", light: "#f6a8c4", dark: "#b0446e" },
    { body: "#3ab8d0", light: "#8ae0ec", dark: "#2a8aa0" },
    { body: "#f2c12e", light: "#fbe07a", dark: "#c8941a" },
    { body: "#c8322a", light: "#e8685a", dark: "#8a2018" },
  ],
  chrome: "#e8eef2", tyre: "#2a2a2e", windowCar: "#3a4a5a",
  palm: ["#3f8a4a", "#5fa85a", "#2c6a3a"], trunk: "#9a8a6a", ring: "#7a6a4a",
  flag: ["#2f4fa0", "#f3f0e6", "#c8322a"],
};

function capitolio(c: PixelCanvas) {
  const cx = 112, base = 78;
  // the long neoclassical wings
  c.rect(cx - 70, 54, 141, base - 54, P.stone);
  c.hline(cx - 70, cx + 70, 54, P.stoneLight);
  for (let x = cx - 68; x < cx + 70; x += 4) c.rect(x, 58, 2, base - 60, P.stoneShade);
  c.rect(cx - 70, 74, 141, 4, P.stoneShade);
  // central portico: columns and pediment, grand stairs
  c.rect(cx - 18, 46, 37, base - 46, P.stone);
  for (let x = cx - 16; x <= cx + 16; x += 4) { c.rect(x, 50, 2, 24, P.stoneLight); c.set(x + 1, 50, P.stoneShade); for (let y = 51; y < 74; y++) c.set(x + 1, y, P.stoneShade); }
  for (let k = 0; k < 6; k++) c.hline(cx - 18 + k * 3, cx + 18 - k * 3, 46 - k, k === 0 ? P.stoneShade : P.stone);
  for (let k = 0; k < 4; k++) c.hline(cx - 22 - k * 2, cx + 22 + k * 2, base + k, k % 2 ? P.stoneShade : P.stoneLight);
  // drum with columns, then the ribbed dome, lantern and spire
  c.rect(cx - 13, 30, 27, 12, P.stone);
  for (let x = cx - 12; x <= cx + 12; x += 3) c.rect(x, 31, 1, 10, P.stoneShade);
  c.hline(cx - 14, cx + 14, 29, P.stoneLight);
  c.hline(cx - 14, cx + 14, 42, P.stoneShade);
  for (let y = 12; y < 30; y++) {
    const t = (y - 12) / 18;
    const half = 12 * Math.sqrt(Math.max(0, 1 - (1 - t) * (1 - t)));
    for (let x = Math.round(cx - half); x <= Math.round(cx + half); x++) {
      const rib = Math.round((x - cx) / Math.max(1, half) * 4) !== Math.round((x - cx + 1) / Math.max(1, half) * 4);
      c.set(x, y, rib ? P.domeShade : x > cx + half * 0.4 ? P.domeShade : P.dome);
    }
  }
  c.rect(cx - 3, 6, 7, 6, P.stone); for (const x of [cx - 2, cx, cx + 2]) c.rect(x, 7, 1, 4, P.stoneShade);
  c.disc(cx, 5, 2.5, P.dome);
  c.rect(cx, 0, 1, 3, P.stoneDeep);
}

function colonialRow(c: PixelCanvas, x0: number, x1: number, seed: number) {
  // two-storey colonial houses with ground-floor arcades, tall shuttered doors and iron balconies
  const r = rng(seed);
  let x = x0;
  while (x < x1) {
    const w = 14 + Math.floor(r() * 6), h = 26 + Math.floor(r() * 8), top = 92 - h;
    const col = P.colonial[Math.floor(r() * P.colonial.length)]!;
    c.rect(x, top, w, h, col);
    for (let i = x; i < x + w; i++) for (let y = top; y < 92; y++) if (bayer(i, y) < 0.07) c.set(i, y, P.stoneDeep); // peeling paint
    c.hline(x, x + w - 1, top, P.stoneLight);
    c.hline(x, x + w - 1, top + 2, P.stoneShade);
    // upper floor: tall shutters and a little iron balcony
    for (let wx = x + 2; wx < x + w - 3; wx += 5) {
      c.rect(wx, top + 5, 3, 7, P.shutter);
      c.hline(wx - 1, wx + 3, top + 12, P.balcony);
      for (let b = wx - 1; b <= wx + 3; b += 2) c.set(b, top + 11, P.balcony);
    }
    // ground floor arcade
    for (let ax = x + 1; ax < x + w - 3; ax += 5) {
      c.rect(ax, 92 - 10, 4, 10, P.arcade);
      c.set(ax, 92 - 10, col); c.set(ax + 3, 92 - 10, col);
    }
    x += w;
  }
}

function car(c: PixelCanvas, x: number, y: number, k: number, dir: 1 | -1) {
  // a 1950s American sedan: long body, tail fins, chrome bumpers, whitewall tyres
  const col = P.cars[k % P.cars.length]!;
  const len = 26;
  const at = (i: number) => x + i * dir;
  for (let i = 0; i < len; i++) {
    c.set(at(i), y - 1, col.dark);
    c.set(at(i), y - 2, col.body);
    c.set(at(i), y - 3, col.body);
    c.set(at(i), y - 4, i > len - 4 ? col.light : col.body);
  }
  for (let i = 6; i < 18; i++) { c.set(at(i), y - 5, col.body); c.set(at(i), y - 6, col.body); c.set(at(i), y - 7, col.light); }
  for (let i = 8; i < 16; i++) c.set(at(i), y - 6, i === 12 ? col.body : P.windowCar);
  c.set(at(len - 1), y - 5, col.dark); c.set(at(len - 2), y - 5, col.body); // tail fin
  c.hline(Math.min(at(0), at(len - 1)), Math.max(at(0), at(len - 1)), y - 3, col.light);
  for (const i of [0, len - 1]) { c.set(at(i), y - 2, P.chrome); c.set(at(i), y - 1, P.chrome); }
  for (const i of [5, 20]) { c.disc(at(i), y, 2.2, P.tyre); c.set(at(i), y, P.chrome); }
}

function street(c: PixelCanvas) {
  c.rect(0, 92, W, 2, P.kerb);
  c.paint((x, y) => (bayer(x, y) < 0.15 ? P.streetLight : P.street), 0, 94, W - 1, H - 1);
  for (let x = 0; x < W; x += 12) c.hline(x, x + 6, 101, P.line);
  car(c, 10, 100, 0, 1);
  car(c, 92, 100, 1, 1);
  car(c, 210, 107, 2, -1);
  car(c, 140, 107, 3, -1);
}

export const havanaScene: PostcardScene = {
  cityId: "havana",
  accent: "#d0507a",
  windowFocus: [112, 30],
  description: "Pixel-art view of Havana: the neoclassical El Capitolio with its columned portico, grand stairs and ribbed dome, royal palms, pastel colonial houses with arcades, green shutters and iron balconies, and colourful 1950s American cars with tail fins and chrome cruising the street.",
  draw(c) {
    sky(c, P.sky, 78);
    cloud(c, 10, 60, 16, P.cloud, P.cloudShade, 3);
    cloud(c, 150, 200, 10, P.cloud, P.cloudShade, 2);
    birds(c, 3, 140, 18, 190, 34, 4, "#3a4a5a");
    capitolio(c);
    // Cuban flag on its mast
    c.rect(30, 22, 1, 40, P.balcony);
    for (let k = 0; k < 7; k++) c.hline(31, 44, 22 + k, P.flag[k % 2 === 0 ? 0 : 1]!);
    for (let k = 0; k < 7; k++) c.hline(31, 31 + Math.max(0, 6 - Math.abs(k - 3) * 2), 22 + k, P.flag[2]!);
    colonialRow(c, -4, 64, 21);
    colonialRow(c, 160, W + 4, 22);
    palm(c, 72, 92, 40, 0, P.palm, P.trunk, P.ring, 12);
    palm(c, 152, 92, 38, 0, P.palm, P.trunk, P.ring, 12);
    street(c);
  },
  drawStamp(c, x, y, w, h) {
    c.gradient(y, y + h - 1, [P.sky[1]!, P.sky[3]!], x, x + w - 1);
    const cx = x + Math.floor(w / 2), base = y + h - 4;
    c.rect(x + 2, base - 4, w - 4, 4, P.stone);
    c.disc(cx, base - 7, 4.5, P.dome);
    c.rect(cx, base - 14, 1, 3, P.stoneDeep);
    c.rect(x, base, w, 4, P.cars[0]!.body);
  },
};
