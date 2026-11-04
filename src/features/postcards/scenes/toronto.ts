import { bayer, rng, type PixelCanvas } from "../pixel/canvas";
import type { PostcardScene } from "../template";
import { W, H, foliage, people, sky, water } from "./common";

/** Toronto at dusk from the islands: the CN Tower, the domed stadium, lit towers, a ferry on Lake Ontario. */
const P = {
  sky: ["#2f3f78", "#4d5f96", "#8a7fa8", "#d49a8a", "#f0c49a"],
  star: "#e9e3c8",
  tower: "#4f5a7a", towerShade: "#3d4766", towerLight: "#6a769a", lit: "#f2cf6a", litCool: "#bcd3e8",
  gold: "#d8a84a", goldDark: "#a8802e",
  cn: "#c9c3b8", cnShade: "#a29c92", cnDark: "#7a756c", pod: "#8a8478", beacon: "#e0503a",
  dome: "#e9e6dc", domeShade: "#c4c0b6",
  water: "#3f4f7a", waterLight: "#d49a8a", waterDark: "#2c3a60",
  island: "#3f5a46", islandLight: "#56765c", islandDark: "#2c4434", sand: "#c9b48e",
  ferry: "#f3ece0", ferryTrim: "#2f4f8f", ferryWindow: "#f2cf6a",
  coats: ["#2f3346", "#b8322a", "#3a5a9a", "#e2b84a", "#f3ead8"],
};

function skyline(c: PixelCanvas) {
  const r = rng(341), base = 92;
  for (let x = 0; x < W; x += 5 + Math.floor(r() * 5)) {
    if (x > 108 && x < 132) continue;
    const w = 5 + Math.floor(r() * 5);
    const t = x > 160 && x < 196 ? 60 + Math.floor(r() * 12) : 52 + Math.floor(r() * 26);
    const gold = r() < 0.12;
    c.rect(x, t, w, base - t, gold ? P.gold : r() < 0.5 ? P.tower : P.towerShade);
    c.rect(x + w - 1, t, 1, base - t, gold ? P.goldDark : P.towerShade);
    c.hline(x, x + w - 2, t, P.towerLight);
    for (let y = t + 2; y < base - 1; y += 2) for (let i = x + 1; i < x + w - 1; i += 2) if (r() < 0.45) c.set(i, y, r() < 0.75 ? P.lit : P.litCool);
  }
}

function cnTower(c: PixelCanvas, cx: number) {
  // tapering concrete shaft with its three-lobed buttress at the foot
  for (let y = 46; y < 92; y++) {
    const hw = 1.5 + ((y - 46) / 46) ** 1.6 * 5;
    for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) c.set(x, y, x > cx ? P.cnShade : x === Math.round(cx - hw) ? P.cnDark : P.cn);
  }
  c.rect(cx - 1, 24, 3, 22, P.cn);
  c.rect(cx + 1, 24, 1, 22, P.cnShade);
  // main pod: observation decks and the restaurant ring
  c.rect(cx - 7, 40, 15, 2, P.pod);
  c.rect(cx - 8, 42, 17, 4, P.cn);
  c.rect(cx + 5, 42, 4, 4, P.cnShade);
  for (let x = cx - 7; x <= cx + 7; x += 2) c.set(x, 43, P.lit);
  c.rect(cx - 6, 46, 13, 2, P.pod);
  c.hline(cx - 4, cx + 4, 48, P.cnDark);
  // SkyPod and antenna
  c.rect(cx - 3, 26, 7, 3, P.cn);
  c.hline(cx - 2, cx + 2, 27, P.lit);
  c.rect(cx, 4, 1, 20, P.cnDark);
  c.set(cx, 3, P.beacon);
  for (let y = 8; y < 24; y += 5) c.set(cx, y, P.beacon);
}

function stadium(c: PixelCanvas, cx: number) {
  c.rect(cx - 16, 84, 33, 8, P.tower);
  for (let x = cx - 15; x < cx + 16; x += 3) c.set(x, 87, P.lit);
  for (let y = 76; y < 84; y++) {
    const hw = Math.sqrt(Math.max(0, 1 - ((84 - y) / 8) ** 2)) * 16;
    c.hline(Math.round(cx - hw), Math.round(cx + hw), y, y < 79 ? P.dome : P.domeShade);
  }
  for (let x = cx - 12; x < cx + 13; x += 6) c.line(x, 84, cx + (x - cx) * 0.6, 77, P.domeShade);
}

function lakeAndIslands(c: PixelCanvas) {
  water(c, 92, P.water, P.waterLight, P.waterDark, 342);
  // long shimmering reflections of the lit towers
  for (let x = 0; x < W; x++) {
    const col = [80, 84, 88].map((y) => c.get(x, y)).find((v) => v === P.lit || v === P.gold || v === P.litCool);
    if (!col) continue;
    for (let y = 94; y < 104; y++) if (bayer(x, y) < 0.4 && (y % 2 === 0)) c.set(x, y, col);
  }
  // ferry crossing to the islands
  const fx = 150, fy = 99;
  for (let k = 0; k < 3; k++) c.hline(fx + k, fx + 34 - k, fy + k, k === 0 ? P.ferryTrim : P.ferry);
  c.rect(fx + 4, fy - 4, 24, 4, P.ferry);
  for (let x = fx + 5; x < fx + 27; x += 3) c.set(x, fy - 2, P.ferryWindow);
  c.hline(fx + 4, fx + 27, fy - 5, P.ferryTrim);
  // Toronto Island shore in the foreground: sand, willows, people watching the skyline
  c.rect(0, 103, W, H - 103, P.island);
  c.hline(0, W - 1, 103, P.sand);
  c.hline(0, W - 1, 104, P.sand);
  for (const [x, sd] of [[8, 1], [40, 2], [196, 3], [218, 4]] as const) foliage(c, 343 + sd, x, 98, 7, [P.island, P.islandLight, P.islandDark]);
  people(c, 344, 104, 60, 180, 10, P.coats);
}

export const torontoScene: PostcardScene = {
  cityId: "toronto",
  accent: "#b8322a",
  description: "Pixel-art view of Toronto at dusk from the islands: the CN Tower with its observation pod and red beacons, the domed stadium, lit and golden towers reflected in Lake Ontario, a ferry, and people on the island shore.",
  draw(c) {
    sky(c, P.sky, 80);
    const r = rng(345);
    for (let i = 0; i < 24; i++) c.set(Math.floor(r() * W), Math.floor(r() * 30), P.star);
    skyline(c);
    stadium(c, 152);
    cnTower(c, 120);
    lakeAndIslands(c);
  },
  drawStamp(c, x, y, w, h) {
    c.gradient(y, y + h - 1, [P.sky[0]!, P.sky[2]!, P.sky[4]!], x, x + w - 1);
    const cx = x + Math.floor(w / 2);
    c.rect(cx, y + 1, 1, 6, P.cnDark);
    c.rect(cx - 2, y + 7, 5, 2, P.cn);
    for (let k = 0; k < h - 9; k++) c.hline(cx - Math.floor(k / 6), cx + Math.floor(k / 6), y + 9 + k, P.cn);
    c.set(cx, y, P.beacon);
  },
};
