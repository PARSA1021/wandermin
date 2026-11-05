import { bayer, type PixelCanvas } from "../pixel/canvas";
import type { PostcardScene } from "../template";
import { W, H, birds, cloud, sky, townhouses } from "./common";

/** Lisbon: Belém Tower on the Tagus, the red 25 de Abril bridge, hillside houses and a yellow tram on blue azulejos. */
const P = {
  sky: ["#4f88cc", "#74a6dc", "#a8c8e8", "#d8e6ee", "#f4efe0"],
  cloud: "#fbfaf4", cloudShade: "#d6e0ea",
  hill: "#b8b8a0", hillDark: "#9a9a84",
  bridge: "#c8423a", bridgeDark: "#9a2e28", christ: "#d8d4ca",
  river: "#3f88b0", riverLight: "#a8d8e8", riverDark: "#2f6a90",
  stone: "#ece2cc", stoneShade: "#c8b898", stoneDeep: "#a8946e", stoneLight: "#fbf4e2", cross: "#c8423a", slit: "#5a5040",
  tram: "#f2c12e", tramDark: "#c8941a", tramLight: "#fbe07a", tramWin: "#3a4a5a", tramWhite: "#f3ece0", tramRed: "#c8432f",
  rail: "#7a7a80", cobble: "#d8d0c0", cobbleDark: "#b8ae9a",
  tile: "#2f5fa8", tileLight: "#e8eef6", tileMid: "#7a9ad0",
};

function farHills(c: PixelCanvas) {
  // the south bank, with the Cristo Rei statue on its pedestal
  c.paint((x, y) => {
    const t = 58 + 3 * Math.sin(x / 19) + Math.sin(x / 5);
    return y >= t && y < 66 ? (bayer(x, y) < 0.15 ? P.hillDark : P.hill) : null;
  }, 0, 50, W - 1, 66);
  c.rect(160, 46, 3, 12, P.christ);
  c.hline(158, 164, 46, P.christ); c.set(161, 44, P.christ); c.set(161, 45, P.christ);
}

function bridge(c: PixelCanvas) {
  // the long red suspension bridge crossing the whole background
  const deck = 56;
  c.rect(0, deck, W, 2, P.bridge);
  c.hline(0, W - 1, deck + 2, P.bridgeDark);
  const towers = [70, 150];
  for (const tx of towers) {
    c.rect(tx - 2, 30, 2, deck - 30 + 10, P.bridge);
    c.rect(tx + 2, 30, 2, deck - 30 + 10, P.bridge);
    for (const by of [32, 42, 54]) c.hline(tx - 2, tx + 3, by, P.bridgeDark);
  }
  const [a, b] = towers as [number, number];
  for (let x = 0; x < W; x++) {
    let y: number;
    if (x < a) y = 31 + ((a - x) / a) * (deck - 33) - Math.sin(((a - x) / a) * Math.PI) * 4;
    else if (x > b) y = 31 + ((x - b) / (W - b)) * (deck - 33) - Math.sin(((x - b) / (W - b)) * Math.PI) * 4;
    else { const t = (x - a) / (b - a); y = 31 + 4 * (deck - 34) * t * (1 - t) * 0.95; }
    c.set(x, Math.round(y), P.bridgeDark);
    if (x % 3 === 0) for (let yy = Math.round(y) + 1; yy < deck; yy++) if (yy % 2) c.set(x, yy, P.bridge);
  }
}

function river(c: PixelCanvas) {
  c.paint((x, y) => (y % 3 === 0 && bayer(x, y) < 0.3 ? P.riverLight : bayer(x, y) < 0.08 ? P.riverDark : P.river), 0, 66, W - 1, 90);
  c.hline(0, W - 1, 66, P.riverDark);
  // a small sailboat
  c.rect(130, 76, 8, 1, P.stoneLight);
  for (let k = 0; k < 7; k++) c.hline(133, 133 + Math.floor(k / 2), 69 + k, P.stoneLight);
}

function belemTower(c: PixelCanvas) {
  // Manueline fortress tower standing in the river: bastion with battlements and sentry turrets, then the
  // four-storey tower with its loggia, rope mouldings, shields with red crosses and dome-capped watchtowers
  const cx = 52, water = 84;
  // reflection
  for (let y = water; y < 90; y++) for (let x = cx - 18; x <= cx + 22; x++) if ((y + x) % 3 === 0 && bayer(x, y) < 0.5) c.set(x, y, P.stoneShade);
  // bastion
  c.rect(cx - 18, 68, 41, water - 68, P.stone);
  c.rect(cx + 14, 68, 9, water - 68, P.stoneShade);
  for (let x = cx - 18; x <= cx + 22; x += 3) { c.rect(x, 66, 2, 2, P.stone); c.set(x + 1, 66, P.stoneShade); }
  for (let x = cx - 15; x < cx + 20; x += 5) c.rect(x, 74, 2, 3, P.slit);
  for (const tx of [cx - 18, cx + 21]) {
    c.rect(tx - 1, 60, 4, 8, P.stone);
    c.disc(tx + 1, 59, 2, P.stoneShade);
    c.set(tx + 1, 56, P.stoneDeep);
  }
  // tower body
  const tx0 = cx - 8, tx1 = cx + 8;
  c.rect(tx0, 24, tx1 - tx0 + 1, 42, P.stone);
  c.rect(tx1 - 3, 24, 4, 42, P.stoneShade);
  for (const ry of [36, 48]) for (let x = tx0; x <= tx1; x++) c.set(x, ry, x % 2 ? P.stoneDeep : P.stoneShade); // rope mouldings
  // loggia with arches
  c.rect(tx0 + 1, 38, tx1 - tx0 - 1, 8, P.stoneShade);
  for (let x = tx0 + 2; x < tx1 - 1; x += 4) { c.rect(x, 40, 2, 6, P.slit); c.set(x, 39, P.slit); }
  c.hline(tx0 - 1, tx1 + 1, 46, P.stoneLight);
  // windows and shields
  for (const wy of [28, 52, 58]) c.rect(cx - 1, wy, 2, 3, P.slit);
  c.rect(cx - 5, 30, 3, 4, P.stoneLight); c.set(cx - 4, 31, P.cross); c.hline(cx - 5, cx - 3, 32, P.cross);
  // battlements and corner turrets
  for (let x = tx0; x <= tx1; x += 3) c.rect(x, 21, 2, 3, P.stone);
  for (const px of [tx0, tx1]) {
    c.rect(px - 1, 16, 3, 7, P.stone);
    c.disc(px, 15, 1.6, P.stoneShade);
    c.set(px, 13, P.stoneDeep);
  }
  c.rect(cx - 2, 16, 5, 5, P.stone); c.disc(cx, 15, 2.2, P.stoneShade); c.set(cx, 12, P.stoneDeep);
}

function quay(c: PixelCanvas) {
  // Alfama-style houses climbing the right bank
  townhouses(c, 46, 110, W + 6, 90, {
    facades: ["#f2d27a", "#e88a6a", "#f3ece0", "#8ac0d8", "#e8b0a8", "#f6e8c8"],
    shade: "#c8b898", window: "#4a5a6a", sill: "#f3ece0", door: "#6a4a3a",
    roof: "gable", roofColor: "#c8643a", roofDark: "#9a4a2a",
    widths: [9, 13], heights: [14, 22], balcony: "#3a4a5a",
  });
}

function tramStreet(c: PixelCanvas) {
  // cobbled street with rails and a wall of blue-and-white azulejo tiles
  c.paint((x, y) => {
    if (y < 96) {
      const tx = x % 6, ty = y % 6;
      const motif = (tx === 2 || tx === 3) && (ty === 2 || ty === 3);
      const corner = (tx === 0 || ty === 0);
      return corner ? P.tileMid : motif ? P.tile : (tx + ty) % 4 === 1 ? P.tileMid : P.tileLight;
    }
    return ((x + (y % 2) * 2) % 4 === 0) ? P.cobbleDark : P.cobble;
  }, 0, 90, 104, H - 1);
  c.paint((x, y) => (((x + (y % 2) * 2) % 4 === 0) ? P.cobbleDark : P.cobble), 104, 96, W - 1, H - 1);
  c.hline(0, W - 1, 103, P.rail); c.hline(0, W - 1, 106, P.rail);
  // the yellow Remodelado tram no. 28 with its white roof, trolley pole and route sign
  const x0 = 120, y0 = 82;
  c.rect(x0, y0, 52, 20, P.tram);
  c.rect(x0, y0, 52, 3, P.tramWhite);
  c.rect(x0, y0 + 17, 52, 3, P.tramDark);
  c.hline(x0, x0 + 51, y0 + 10, P.tramDark);
  for (let wx = x0 + 3; wx < x0 + 48; wx += 7) c.rect(wx, y0 + 4, 5, 5, P.tramWin);
  c.rect(x0 + 46, y0 + 4, 4, 13, P.tramWin); // door
  c.rect(x0 + 3, y0 + 12, 30, 2, P.tramLight);
  c.rect(x0 + 18, y0 - 2, 14, 2, P.tramDark); // roof box
  c.rect(x0 + 20, y0 - 1, 4, 1, P.tramRed);
  c.line(x0 + 26, y0 - 2, x0 + 44, y0 - 18, P.rail);
  c.hline(0, W - 1, y0 - 19, P.rail); // overhead wire
  for (const wx of [x0 + 8, x0 + 40]) { c.disc(wx, y0 + 21, 2.2, P.rail); c.set(wx, y0 + 21, P.tramDark); }
}

export const lisbonScene: PostcardScene = {
  cityId: "lisbon",
  accent: "#2f5fa8",
  windowFocus: [60, 40],
  description: "Pixel-art view of Lisbon: the Manueline Belém Tower with its battlements, loggia and domed watchtowers standing in the Tagus, the red 25 de Abril suspension bridge and the Cristo Rei statue on the far bank, colourful houses climbing the hill, a sailboat, and the yellow number 28 tram on a cobbled street beside a wall of blue-and-white azulejo tiles.",
  draw(c) {
    sky(c, P.sky, 66);
    cloud(c, 10, 60, 10, P.cloud, P.cloudShade, 3);
    cloud(c, 120, 170, 16, P.cloud, P.cloudShade, 2);
    birds(c, 12, 80, 6, 140, 22, 6, "#4a5a6a");
    farHills(c);
    bridge(c);
    river(c);
    belemTower(c);
    quay(c);
    tramStreet(c);
  },
  drawStamp(c, x, y, w, h) {
    c.gradient(y, y + h - 1, [P.sky[1]!, P.sky[3]!], x, x + w - 1);
    const cx = x + Math.floor(w / 2);
    c.rect(cx - 3, y + 3, 7, h - 7, P.stone);
    c.rect(cx - 6, y + h - 8, 13, 5, P.stone);
    c.set(cx, y + 2, P.stoneDeep);
    c.rect(x, y + h - 3, w, 3, P.river);
  },
};
