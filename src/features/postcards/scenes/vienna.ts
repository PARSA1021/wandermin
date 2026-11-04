import { bayer, rng, type PixelCanvas } from "../pixel/canvas";
import type { PostcardScene } from "../template";
import { W, H, birds, cloud, foliage, people, ridge, sky } from "./common";

/** Vienna: Schönbrunn Palace in its imperial yellow, the parterre garden and fountain, the Gloriette on its hill. */
const P = {
  sky: ["#5d7db0", "#7f9cc6", "#aec2d8", "#dfe2dc", "#f0e9d4"],
  cloud: "#f8f5ee", cloudShade: "#d9dfe6",
  hill: "#7fa070", hillDark: "#67885c", hillLight: "#93b282", forest: "#4f7a52", forestLight: "#679466", forestDark: "#3c6040",
  glor: "#efe8d8", glorShade: "#cfc6b2", glorDark: "#6a6458",
  yellow: "#e6c25a", yellowShade: "#c9a240", yellowLight: "#f2d78a", frame: "#f3ead8", window: "#3d4a52",
  roof: "#7a8a7f", roofDark: "#5e6d63", chimney: "#c9a240",
  gravel: "#ddd2b6", gravelDither: "#c8bc9c", hedge: "#3d6b4f", hedgeLight: "#558a64", hedgeDark: "#2c4f3a",
  bedRed: "#c8432f", bedWhite: "#f3ead8", bedPink: "#e98aa0",
  water: "#7fb0c4", waterLight: "#c8e4ec", statue: "#dcd6c8",
  horse: "#4a3a30", carriage: "#2b2b33", wheel: "#c9a240",
  coats: ["#2f3346", "#c8432f", "#3a5a9a", "#e2b84a", "#f3ead8", "#3d6b4f"],
};

function gloriette(c: PixelCanvas, cx: number) {
  ridge(c, (x) => 46 + ((x - cx) / 70) ** 2 * 26 + Math.sin(x / 4), P.hill, P.hillDark, P.hillLight, 0.12);
  // woods on the slopes
  const r = rng(201);
  for (let i = 0; i < 26; i++) {
    const x = Math.floor(r() * W), y = 56 + Math.floor(r() * 14);
    if (Math.abs(x - cx) < 34) continue;
    foliage(c, 210 + i, x, y, 4 + r() * 2, [P.forest, P.forestLight, P.forestDark]);
  }
  // colonnade with a raised centre bearing the eagle trophy
  const w = 30, y0 = 34, y1 = 46;
  c.rect(cx - w, y0, w * 2 + 1, y1 - y0, P.glor);
  for (let x = cx - w + 2; x < cx + w; x += 4) c.rect(x, y0 + 3, 2, y1 - y0 - 3, P.glorDark);
  c.hline(cx - w, cx + w, y0, P.glorShade);
  c.hline(cx - w - 1, cx + w + 1, y0 - 1, P.glor);
  c.rect(cx - 8, y0 - 6, 17, 6, P.glor);
  for (let x = cx - 6; x < cx + 7; x += 4) c.rect(x, y0 - 4, 2, 4, P.glorDark);
  c.rect(cx - 2, y0 - 9, 5, 3, P.glorShade);
  c.set(cx, y0 - 10, P.yellowShade);
  c.set(cx - 1, y0 - 11, P.yellowShade); c.set(cx + 1, y0 - 11, P.yellowShade);
}

function palace(c: PixelCanvas) {
  const x0 = 10, x1 = 214, top = 58, base = 84;
  // roof with chimneys
  for (let k = 0; k < 6; k++) c.hline(x0 + k, x1 - k, top - 6 + k, k === 0 ? P.roofDark : P.roof);
  for (let x = x0 + 8; x < x1 - 8; x += 11) { c.rect(x, top - 9, 2, 3, P.chimney); c.set(x, top - 10, P.roofDark); }
  // facade: three floors of white-framed windows between pilasters
  c.rect(x0, top, x1 - x0, base - top, P.yellow);
  c.hline(x0, x1 - 1, top, P.yellowLight);
  c.hline(x0, x1 - 1, top + 9, P.yellowShade);
  c.hline(x0, x1 - 1, top + 17, P.yellowShade);
  for (let x = x0 + 2; x < x1 - 2; x += 5) {
    for (const [wy, wh] of [[top + 2, 5], [top + 11, 4], [top + 19, 4]] as const) {
      c.rect(x, wy, 3, wh + 1, P.frame);
      c.rect(x + 1, wy + 1, 1, wh - 1, P.window);
    }
    c.rect(x + 4, top + 1, 1, base - top - 1, P.yellowShade); // pilaster shadow
  }
  // central risalit, a little taller, with pediment, balcony and the double staircase
  const cx = 112;
  c.rect(cx - 22, top - 4, 45, base - top + 4, P.yellow);
  c.rect(cx + 20, top - 4, 3, base - top + 4, P.yellowShade);
  for (let x = cx - 20; x < cx + 20; x += 5) {
    c.rect(x, top - 1, 3, 7, P.frame); c.rect(x + 1, top, 1, 5, P.window); c.set(x + 1, top - 1, P.frame);
    c.rect(x, top + 11, 3, 5, P.frame); c.rect(x + 1, top + 12, 1, 3, P.window);
  }
  for (let k = 0; k < 6; k++) c.hline(cx - 22 + k * 3, cx + 22 - k * 3, top - 5 - k, k === 0 ? P.roofDark : P.yellowLight);
  c.set(cx, top - 12, P.yellowShade); c.set(cx, top - 13, P.window);
  c.hline(cx - 14, cx + 14, top + 9, P.window); // balcony railing
  for (let k = 0; k < 7; k++) {
    c.hline(cx - 26 + k * 2, cx - 16 + k, base - 7 + k, P.frame);
    c.hline(cx + 16 - k, cx + 26 - k * 2, base - 7 + k, P.frame);
  }
  c.rect(cx - 4, base - 8, 9, 8, P.window);
  c.hline(x0, x1 - 1, base, P.yellowShade);
}

function garden(c: PixelCanvas) {
  c.paint((x, y) => (bayer(x, y) < 0.18 ? P.gravelDither : P.gravel), 0, 85, W - 1, H - 1);
  // parterre flower beds in scroll patterns, framed by low box hedges
  const bed = (x0: number, x1: number) => {
    for (let x = x0; x <= x1; x++) for (let y = 92; y <= 104; y++) {
      const edge = x === x0 || x === x1 || y === 92 || y === 104;
      const scroll = Math.round(98 + Math.sin((x - x0) / 3) * 3) === y || Math.round(98 - Math.sin((x - x0) / 3) * 3) === y;
      c.set(x, y, edge ? P.hedge : scroll ? P.hedgeLight : (x + y) % 5 === 0 ? P.bedWhite : (x - x0) % 8 < 4 ? P.bedRed : P.bedPink);
    }
  };
  bed(8, 54); bed(64, 96); bed(128, 160); bed(170, 216);
  // trimmed cone hedges along the paths
  for (let x = 4; x < W; x += 14) {
    if (x > 100 && x < 124) continue;
    for (let k = 0; k < 7; k++) c.hline(x - Math.floor(k / 2), x + Math.floor(k / 2), 84 + k, k < 2 ? P.hedgeLight : bayer(x, k) < 0.5 ? P.hedge : P.hedgeDark);
  }
  // fountain
  const fx = 112;
  for (let y = 100; y <= 106; y++) {
    const hw = Math.sqrt(Math.max(0, 1 - ((y - 103) / 3.5) ** 2)) * 12;
    c.hline(Math.round(fx - hw), Math.round(fx + hw), y, y === 100 || y === 106 ? P.statue : bayer(fx, y) < 0.5 ? P.waterLight : P.water);
  }
  c.rect(fx - 1, 92, 3, 9, P.statue);
  c.rect(fx - 3, 90, 7, 2, P.statue);
  for (let k = 0; k < 6; k++) { c.set(fx - 4 - k, 90 + Math.round(k * k * 0.25), P.waterLight); c.set(fx + 4 + k, 90 + Math.round(k * k * 0.25), P.waterLight); }
  c.set(fx, 88, P.statue); c.set(fx, 89, P.statue);
}

function fiaker(c: PixelCanvas, x: number, y: number) {
  // two horses and a black open carriage with gold wheels
  for (const hx of [x, x + 6]) {
    c.rect(hx, y - 4, 5, 2, P.horse);
    c.set(hx + 5, y - 5, P.horse); c.set(hx + 5, y - 6, P.horse); c.set(hx + 6, y - 6, P.horse);
    for (const lx of [hx, hx + 4]) { c.set(lx, y - 2, P.horse); c.set(lx, y - 1, P.horse); }
  }
  c.rect(x - 12, y - 6, 11, 4, P.carriage);
  c.rect(x - 12, y - 9, 3, 3, P.carriage);
  c.set(x - 4, y - 8, "#e3b48f"); c.rect(x - 4, y - 7, 1, 1, P.carriage); // driver
  for (const wx of [x - 10, x - 3]) { c.disc(wx, y - 1, 1.6, P.wheel); c.set(wx, y - 1, P.carriage); }
}

export const viennaScene: PostcardScene = {
  cityId: "vienna",
  accent: "#3d6b4f",
  description: "Pixel-art view of Vienna: the imperial-yellow Schönbrunn Palace with white-framed windows, chimneys and its double staircase, a parterre of scrolled flower beds, cone hedges and a fountain, a fiaker carriage, and the Gloriette colonnade on the wooded hill beyond.",
  draw(c) {
    sky(c, P.sky);
    cloud(c, 20, 70, 20, P.cloud, P.cloudShade, 3);
    cloud(c, 150, 186, 46, P.cloud, P.cloudShade);
    birds(c, 202, 40, 12, 90, 28, 4, "#4a5a7a");
    gloriette(c, 112);
    palace(c);
    garden(c);
    people(c, 203, 90, 2, 220, 14, P.coats);
    fiaker(c, 40, 91);
  },
  drawStamp(c, x, y, w, h) {
    // red–white–red bands
    c.rect(x, y, w, h, "#c8432f");
    c.rect(x, y + Math.floor(h / 3), w, Math.ceil(h / 3), "#f3e6c9");
    c.disc(x + w / 2 - 0.5, y + 9, 2.2, P.yellowShade);
  },
};
