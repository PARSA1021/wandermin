import { bayer, rng, type PixelCanvas } from "../pixel/canvas";
import type { PostcardScene } from "../template";
import { W, birds, people, sky, townhouses, water, type TownhouseStyle } from "./common";

/** Cape Town: flat-topped Table Mountain under its tablecloth cloud, Lion's Head, the cable car, the harbour, Bo-Kaap houses. */
const P = {
  sky: ["#3f74b5", "#5d92cc", "#8ab4dc", "#c2d8e6", "#efe8d2"],
  cloth: "#f8f6f0", clothShade: "#d6dee6",
  rock: "#8a8676", rockShade: "#6f6b5e", rockLight: "#a8a492", rockDeep: "#57544a", fynbos: "#6f8a5a", fynbosDark: "#5a7448",
  lion: "#7f7a66", lionShade: "#66624f",
  city: "#d9d2c0", cityShade: "#b9b2a0", window: "#5a6a7a",
  water: "#2f78a8", waterLight: "#9fd0e4", waterDark: "#235f8a",
  cable: "#3d4560", car: "#c8432f",
  boatRed: "#c8432f", boatBlue: "#2f5a9a", boatWhite: "#f3ece0",
  coats: ["#2f3346", "#c8432f", "#3a8a5a", "#e2b84a", "#f3ead8"],
};

const BO_KAAP: TownhouseStyle = {
  facades: ["#e8608a", "#a6d65a", "#3fc0c0", "#f2c14e", "#9a6ad6", "#e07a3a", "#5aa0e0"],
  shade: "#6a5a6a", window: "#2f3346", sill: "#f8f4ec",
  roof: "flat", roofColor: "#f3ece0", roofDark: "#d9d2c0", door: "#3d3346",
  widths: [14, 17], heights: [15, 18], floorH: 5,
};

function mountain(c: PixelCanvas) {
  // Table Mountain: steep cliffs, a perfectly flat top, Devil's Peak on the left
  const top = (x: number) => {
    if (x < 30) return 44 - (x / 30) * 10 + Math.max(0, 8 - Math.abs(x - 14) * 0.9) * -1;
    if (x < 150) return 34;
    if (x < 166) return 34 + (x - 150) * 2.2;
    return 200;
  };
  c.paint((x, y) => {
    const t = top(x);
    if (y < t) return null;
    if (y > 70) return bayer(x, y) < 0.4 ? P.fynbosDark : P.fynbos;
    // irregular vertical buttresses and gullies, and the sandstone layering
    const g = Math.sin(x * 0.45) + Math.sin(x * 0.17 + 1) * 0.8;
    const gully = g > 1.1 && y < 66 && bayer(x, y) < 0.55 + (g - 1.1);
    const band = (y - 34) % 9 === 0 && Math.sin(x / 5) > -0.3;
    return gully ? P.rockShade : band ? P.rockShade : y > 58 ? (bayer(x, y) < 0.5 ? P.fynbos : P.rockShade) : bayer(x, y) < 0.15 ? P.rockLight : P.rock;
  }, 0, 20, W - 1, 82);
  // Lion's Head and Signal Hill on the right
  c.paint((x, y) => {
    const t = 48 + Math.abs(x - 186) * 0.75 - (x > 186 ? 0 : 0) + Math.sin(x / 2) * 0.6;
    if (y < t || x < 160) return null;
    return y > 66 ? P.fynbos : x > 188 ? P.lionShade : P.lion;
  }, 160, 44, W - 1, 82);
  // the tablecloth: cloud draped over the flat top and spilling down
  const r = rng(391);
  for (let x = 34; x < 152; x++) {
    const drip = Math.round(3 + Math.abs(Math.sin(x / 7)) * 5 + r() * 2);
    for (let y = 29; y < 34 + drip; y++) c.set(x, y, y > 33 + drip - 2 ? P.clothShade : P.cloth);
  }
  for (let x = 36; x < 150; x += 3) c.set(x, 28, P.cloth);
}

function cableCar(c: PixelCanvas) {
  c.line(160, 82, 120, 34, P.cable);
  c.rect(138, 56, 5, 4, P.car);
  c.hline(138, 142, 56, P.boatWhite);
  c.set(140, 55, P.cable);
}

function cityAndHarbour(c: PixelCanvas) {
  const rr = rng(392);
  for (let x = 0; x < W; x += 5 + Math.floor(rr() * 4)) {
    const t = 72 + Math.floor(rr() * 10), w = 4 + Math.floor(rr() * 4);
    c.rect(x, t, w, 88 - t, rr() < 0.5 ? P.city : P.cityShade);
    for (let y = t + 2; y < 86; y += 3) for (let i = x + 1; i < x + w - 1; i += 2) if (rr() < 0.4) c.set(i, y, P.window);
  }
  water(c, 88, P.water, P.waterLight, P.waterDark, 393);
  for (const [bx, col] of [[96, P.boatRed], [130, P.boatBlue], [170, P.boatRed]] as const) {
    for (let k = 0; k < 3; k++) c.hline(bx + k, bx + 16 - k, 92 + k, k === 0 ? P.boatWhite : col);
    c.rect(bx + 5, 88, 6, 4, P.boatWhite);
    c.rect(bx + 7, 84, 1, 4, P.cable);
  }
}

export const capeTownScene: PostcardScene = {
  cityId: "cape-town",
  accent: "#3a8a5a",
  description: "Pixel-art view of Cape Town: flat-topped Table Mountain with its cliffs and fynbos under the white tablecloth cloud, Devil's Peak and Lion's Head, the cable car, the harbour with fishing boats, and the brightly painted Bo-Kaap houses in front.",
  draw(c) {
    sky(c, P.sky);
    birds(c, 394, 170, 50, 220, 60, 4, "#3a4466");
    mountain(c);
    cableCar(c);
    cityAndHarbour(c);
    townhouses(c, 395, -4, W + 6, 108, BO_KAAP);
    people(c, 396, 107, 0, 220, 12, P.coats);
  },
  drawStamp(c, x, y, w, h) {
    c.rect(x, y, w, h, P.sky[2]!);
    c.rect(x + 1, y + 7, w - 3, h - 7, P.rock);
    c.hline(x + 1, x + w - 3, y + 7, P.cloth);
    c.hline(x + 2, x + w - 4, y + 6, P.cloth);
    c.rect(x, y + h - 4, w, 4, P.water);
  },
};
