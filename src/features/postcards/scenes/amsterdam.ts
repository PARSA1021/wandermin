import { bayer, rng, type PixelCanvas } from "../pixel/canvas";
import type { PostcardScene } from "../template";
import { W, H, birds, cloud, foliage, people, sky, townhouses, water, type RoofStyle, type TownhouseStyle } from "./common";

/** Amsterdam: gabled canal houses, an arched bridge strung with lights and lined with bicycles, a houseboat and tulips. */
const P = {
  sky: ["#6f8fb8", "#8ca8c8", "#b4c6d6", "#dbe0dc", "#efe7d4"],
  cloud: "#f6f4ee", cloudShade: "#d4dbe3", cloudDeep: "#bcc7d4",
  elm: ["#5f8a4f", "#86b06a", "#43683f", "#a3c47e"], trunk: "#5a4636",
  brick: "#7a3e2e", brickDark: "#5a2e24", bridge: "#8a4a38", bridgeLight: "#a8604a", rail: "#2b2b33", bulb: "#f7e2a0",
  bike: "#2b2b33", bikeRed: "#c8432f", bikeBlue: "#3a5a9a",
  water: "#5f7f8a", waterLight: "#a8c2c8", waterDark: "#4a6670",
  boatHull: "#2f4a3a", boatCabin: "#e9dfc7", boatRoof: "#6e3a2e", boatWindow: "#3d4560",
  tulipR: "#d6402e", tulipY: "#f2c14e", tulipP: "#e77fa0", leaf: "#4f8a4f", planter: "#6e4c3a",
};

const CANAL = (roof: RoofStyle): TownhouseStyle => ({
  facades: ["#7a3e2e", "#5a3a32", "#8f5a3e", "#3f3a3a", "#b0704a", "#e8dcc4", "#6e4a3a"],
  shade: "#3d2a24", window: "#2f3346", sill: "#f3ead8",
  roof, roofColor: "#5a3a32", roofDark: "#3d2a24", door: "#2f4a3a",
  widths: [9, 12], heights: [26, 33], floorH: 6,
});

function canalHouses(c: PixelCanvas, x0: number, x1: number, seed: number) {
  const styles: RoofStyle[] = ["stepped", "bell", "gable", "stepped", "bell"];
  let x = x0, i = 0;
  while (x < x1) {
    const span = 20 + (i % 2) * 4;
    townhouses(c, seed + i, x, Math.min(x + span, x1), 94, CANAL(styles[i % styles.length]!));
    x += span;
    i++;
  }
}

function elm(c: PixelCanvas, x: number, base: number, r: number, seed: number) {
  c.rect(x, base - 12, 2, 12, P.trunk);
  foliage(c, seed, x + 1, base - 12 - r * 0.6, r, P.elm);
}

function bicycle(c: PixelCanvas, x: number, y: number, frame: string) {
  for (const wx of [x, x + 6]) {
    c.set(wx - 1, y, P.bike); c.set(wx + 1, y, P.bike); c.set(wx, y - 1, P.bike); c.set(wx, y + 1, P.bike);
  }
  c.line(x, y, x + 3, y - 2, frame);
  c.line(x + 3, y - 2, x + 6, y, frame);
  c.line(x + 3, y - 2, x + 5, y - 3, frame);
  c.set(x + 2, y - 3, P.bike); c.set(x + 5, y - 4, P.bike);
}

function bridge(c: PixelCanvas, cx: number) {
  const half = 30, deck = 92;
  for (let x = cx - half; x <= cx + half; x++) {
    const t = (x - cx) / (half - 6);
    const under = Math.abs(t) < 1 ? Math.round(deck + 12 - 9 * Math.sqrt(1 - t * t)) : H;
    for (let y = deck; y < Math.min(under, H); y++) c.set(x, y, y < deck + 2 ? P.bridgeLight : bayer(x, y) < 0.15 ? P.brickDark : P.bridge);
    c.rect(x, deck - 3, 1, 1, P.rail);
    if (x % 3 === 0) { c.set(x, deck - 2, P.rail); c.set(x, deck - 1, P.rail); }
    // the famous string of bulbs following the arch
    if (Math.abs(t) < 1 && x % 3 === 0) c.set(x, under - 1, P.bulb);
  }
  bicycle(c, cx - 24, deck - 3, P.bikeRed);
  bicycle(c, cx - 14, deck - 3, P.bike);
  bicycle(c, cx + 4, deck - 3, P.bikeBlue);
  bicycle(c, cx + 14, deck - 3, P.bikeRed);
}

function houseboat(c: PixelCanvas, x0: number, y: number) {
  c.rect(x0, y, 44, 4, P.boatHull);
  c.rect(x0 + 3, y - 7, 36, 7, P.boatCabin);
  for (let x = x0 + 5; x < x0 + 37; x += 5) c.rect(x, y - 5, 3, 3, P.boatWindow);
  c.hline(x0 + 2, x0 + 40, y - 8, P.boatRoof);
  c.hline(x0 + 4, x0 + 38, y - 9, P.boatRoof);
  // pots of flowers on the roof
  for (let x = x0 + 6; x < x0 + 38; x += 6) { c.set(x, y - 10, P.planter); c.set(x, y - 11, [P.tulipR, P.tulipY, P.tulipP][(x / 6) % 3 | 0]!); }
}

function tulips(c: PixelCanvas) {
  const r = rng(161);
  c.rect(0, 104, 64, 4, P.planter);
  c.hline(0, 63, 104, "#8a6a4a");
  for (let x = 1; x < 63; x += 2) {
    const h = 3 + Math.floor(r() * 3);
    for (let k = 1; k <= h; k++) c.set(x, 104 - k, P.leaf);
    const col = [P.tulipR, P.tulipY, P.tulipP][Math.floor(r() * 3)]!;
    c.set(x, 103 - h, col); c.set(x + 1, 103 - h, col); c.set(x, 102 - h, col);
  }
}

export const amsterdamScene: PostcardScene = {
  cityId: "amsterdam",
  accent: "#d0702c",
  description: "Pixel-art view of Amsterdam: narrow brick canal houses with stepped, bell and spout gables and hoist beams, elms along the water, an arched bridge strung with lights and lined with bicycles, a houseboat with flowers and a planter of tulips.",
  draw(c) {
    sky(c, P.sky);
    cloud(c, 18, 80, 24, P.cloud, P.cloudShade, 3);
    c.hline(30, 70, 25, P.cloudDeep);
    cloud(c, 120, 170, 14, P.cloud, P.cloudShade, 3);
    birds(c, 162, 90, 10, 160, 30, 5, "#55607a");
    canalHouses(c, -2, W + 4, 170);
    for (const [x, sd] of [[18, 1], [62, 2], [150, 3], [196, 4]] as const) elm(c, x, 94, 10, 180 + sd);
    people(c, 163, 93, 0, 220, 10, ["#2f3346", "#d0702c", "#3a5a9a", "#e2b84a", "#c8432f"]);
    water(c, 95, P.water, P.waterLight, P.waterDark, 165);
    for (let x = 0; x < W; x++) {
      const col = c.get(x, 86);
      if (!col) continue;
      for (let y = 97; y < H; y++) if (bayer(x, y) < 0.22 && (y & 1)) c.set(x, y, col);
    }
    bridge(c, 112);
    houseboat(c, 168, 101);
    tulips(c);
  },
  drawStamp(c, x, y, w, h) {
    c.rect(x, y, w, h, "#f3e6c9");
    const cx = x + Math.floor(w / 2);
    c.rect(cx, y + 9, 1, h - 9, P.leaf);
    c.set(cx - 1, y + 13, P.leaf); c.set(cx - 2, y + 12, P.leaf); c.set(cx + 1, y + 14, P.leaf); c.set(cx + 2, y + 13, P.leaf);
    c.rect(cx - 3, y + 3, 7, 6, P.tulipR);
    c.set(cx - 3, y + 2, P.tulipR); c.set(cx, y + 2, P.tulipR); c.set(cx + 3, y + 2, P.tulipR);
    c.rect(cx + 1, y + 4, 2, 4, "#a83224");
  },
};
