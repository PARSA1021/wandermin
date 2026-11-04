import { bayer, rng, type PixelCanvas } from "../pixel/canvas";
import type { PostcardScene } from "../template";
import { W, H, birds, cloud, lamp, people, ridge, sky, townhouses, water, type TownhouseStyle } from "./common";

/** Prague: Charles Bridge with its statues and gothic tower, the Castle and St Vitus on the hill, red roofs, the Vltava. */
const P = {
  sky: ["#5a76a6", "#7f97c0", "#b0bfd2", "#e3d3bc", "#f1d6ab"],
  cloud: "#f6efe2", cloudShade: "#dccfc4",
  hill: "#7f9a74", hillDark: "#67835e", hillLight: "#94ae86",
  castle: "#e6dcc6", castleShade: "#c4b89e", castleRoof: "#b05a3e", window: "#4a4a5a",
  gothic: "#8a8478", gothicShade: "#6a655b", gothicDark: "#4f4b44", copper: "#5f9a86", copperDark: "#47786a", gold: "#d8b04a",
  bridge: "#7a7064", bridgeShade: "#5c544a", bridgeLight: "#958a7c", statue: "#3d3a38",
  water: "#5f7f86", waterLight: "#b9c8c4", waterDark: "#4a666e",
  coats: ["#2f3346", "#8f2f2f", "#3a5a9a", "#e2b84a", "#f3ead8", "#4f7a5a"],
};

const MALA_STRANA: TownhouseStyle = {
  facades: ["#e9d6b0", "#e7c3a3", "#efe2c8", "#d9c7a6", "#e8b48a", "#f0d9a0"],
  shade: "#b9a080", window: "#4a4a5a", sill: "#f6efe0",
  roof: "gable", roofColor: "#b05a3e", roofDark: "#8a4430", door: "#5a3a2a",
  widths: [10, 13], heights: [10, 15], floorH: 5,
};

function castleHill(c: PixelCanvas) {
  ridge(c, (x) => (x < 168 ? 58 + ((x - 70) / 90) ** 2 * 18 + Math.sin(x / 5) : 200), P.hill, P.hillDark, P.hillLight, 0.15);
  // long castle palace along the crest
  c.rect(18, 50, 104, 12, P.castle);
  c.rect(18, 50, 104, 1, P.castleShade);
  for (let x = 20; x < 120; x += 3) { c.set(x, 53, P.window); c.set(x, 57, P.window); }
  for (let k = 0; k < 3; k++) c.hline(18 + k, 121 - k, 49 - k, P.castleRoof);
  // St Vitus: nave, apse pinnacles, the great south tower with its copper helm, twin west spires
  c.rect(60, 36, 46, 14, P.gothic);
  c.rect(60, 36, 46, 1, P.gothicDark);
  for (let x = 62; x < 104; x += 4) { c.rect(x, 39, 2, 8, P.gothicDark); c.set(x, 38, P.gothicShade); }
  for (let x = 62; x < 106; x += 4) { c.rect(x, 31, 1, 5, P.gothicShade); c.set(x, 30, P.gothicShade); } // flying buttress pinnacles
  for (let k = 0; k < 5; k++) c.hline(62 + k, 104 - k, 35 - k, P.gothicDark);
  // great tower
  c.rect(92, 18, 9, 32, P.gothic);
  c.rect(99, 18, 2, 32, P.gothicShade);
  c.disc(96, 26, 2, P.gold);
  for (let y = 6; y < 18; y++) {
    const hw = y < 10 ? 1 : y < 14 ? 3 : 5;
    c.hline(96 - hw, 96 + hw, y, y % 3 ? P.copper : P.copperDark);
  }
  c.set(96, 4, P.gold); c.set(96, 5, P.gold);
  // west spires
  for (const sx of [64, 72]) {
    c.rect(sx, 24, 5, 26, P.gothic);
    c.rect(sx + 4, 24, 1, 26, P.gothicShade);
    for (let y = 8; y < 24; y++) c.hline(sx + 2 - Math.floor((y - 8) / 6), sx + 2 + Math.floor((y - 8) / 6), y, P.gothicDark);
    c.set(sx + 2, 7, P.gold);
  }
}

function stNicholas(c: PixelCanvas, cx: number) {
  c.rect(cx - 10, 66, 20, 14, P.castle);
  c.rect(cx - 6, 58, 12, 8, P.castle);
  for (let y = 48; y < 58; y++) {
    const hw = Math.sqrt(Math.max(0, 1 - ((58 - y) / 10) ** 2)) * 8;
    c.hline(Math.round(cx - hw), Math.round(cx + hw), y, y < 52 ? P.copper : bayer(cx, y) < 0.5 ? P.copper : P.copperDark);
  }
  c.rect(cx - 1, 43, 3, 5, P.castle);
  c.set(cx, 41, P.gold); c.set(cx, 42, P.gold);
  for (let x = cx - 4; x <= cx + 4; x += 2) c.set(x, 61, P.window);
  // belfry beside the dome
  c.rect(cx + 12, 52, 7, 28, P.castle);
  c.rect(cx + 17, 52, 2, 28, P.castleShade);
  for (let y = 44; y < 52; y++) c.hline(cx + 15 - Math.floor((52 - y) / 3), cx + 15 + Math.floor((52 - y) / 3), y, P.copper);
}

function charlesBridge(c: PixelCanvas) {
  const deck = 88;
  c.rect(0, deck, 196, 4, P.bridge);
  c.hline(0, 195, deck, P.bridgeLight);
  c.hline(0, 195, deck - 2, P.bridgeShade);
  for (let x = 0; x < 196; x += 2) c.set(x, deck - 1, P.bridgeShade);
  // arches with cutwater piers
  for (let a = 0; a < 7; a++) {
    const ax = 12 + a * 28;
    for (let x = ax - 11; x <= ax + 11; x++) {
      const crown = deck + 4 + Math.round(((x - ax) / 11) ** 2 * 8);
      for (let y = deck + 4; y < crown && y < H; y++) c.set(x, y, bayer(x, y) < 0.2 ? P.bridgeShade : P.bridge);
      c.set(x, crown, P.bridgeShade);
    }
    c.polygon([[ax + 12, deck + 4], [ax + 16, deck + 4], [ax + 17, H], [ax + 11, H]], P.bridgeShade);
  }
  // baroque statues on the parapet, each with a gilded halo
  for (let x = 8; x < 190; x += 14) {
    c.rect(x, deck - 5, 3, 3, P.statue);
    c.rect(x + 1, deck - 9, 1, 4, P.statue);
    c.rect(x, deck - 8, 3, 2, P.statue);
    c.set(x + 1, deck - 10, P.statue);
    c.set(x, deck - 11, P.gold); c.set(x + 1, deck - 12, P.gold); c.set(x + 2, deck - 11, P.gold);
  }
  for (let x = 15; x < 190; x += 28) lamp(c, x, deck - 1, 7, P.statue, "#f2cf6a");
  people(c, 181, deck - 1, 2, 186, 16, P.coats);
}

function bridgeTower(c: PixelCanvas, x: number) {
  const w = 22, top = 52, deck = 88;
  c.rect(x, top, w, H - top, P.gothic);
  c.rect(x + w - 4, top, 4, H - top, P.gothicShade);
  // gate arch at deck level
  c.rect(x + 6, deck - 12, 9, 16, P.gothicDark);
  c.set(x + 6, deck - 12, P.gothic); c.set(x + 14, deck - 12, P.gothic);
  // sculpted gallery and coats of arms
  c.hline(x, x + w - 1, top + 10, P.gothicDark);
  for (let k = 0; k < 4; k++) c.rect(x + 3 + k * 5, top + 4, 2, 5, P.gothicDark);
  c.set(x + 10, top + 12, P.gold); c.set(x + 11, top + 12, P.gold);
  // steep slate roof with corner turrets
  for (let y = 38; y < top; y++) {
    const hw = ((y - 38) / (top - 38)) * (w / 2);
    c.hline(Math.round(x + w / 2 - hw), Math.round(x + w / 2 + hw), y, (y + x) % 3 ? P.gothicDark : P.statue);
  }
  for (const tx of [x - 1, x + w - 2]) { c.rect(tx, top - 6, 3, 6, P.gothic); for (let k = 0; k < 4; k++) c.hline(tx + 1 - (k > 2 ? 0 : 0), tx + 1, top - 7 - k, P.gothicDark); }
  c.set(x + w / 2, 36, P.gold); c.set(x + w / 2, 37, P.gold);
}

export const pragueScene: PostcardScene = {
  cityId: "prague",
  accent: "#8f2f2f",
  description: "Pixel-art view of Prague in golden afternoon light: Charles Bridge over the Vltava with its row of haloed baroque statues, lamps and strollers, the gothic bridge tower, red Malá Strana roofs, St Nicholas' green dome, and Prague Castle with St Vitus Cathedral on the hill.",
  draw(c) {
    sky(c, P.sky);
    cloud(c, 120, 176, 22, P.cloud, P.cloudShade);
    cloud(c, 6, 40, 30, P.cloud, P.cloudShade);
    birds(c, 182, 110, 12, 180, 30, 6, "#5a5068");
    castleHill(c);
    townhouses(c, 183, -4, 132, 86, MALA_STRANA);
    stNicholas(c, 148);
    townhouses(c, 184, 168, W + 6, 86, MALA_STRANA);
    water(c, 90, P.water, P.waterLight, P.waterDark, 185);
    for (let x = 0; x < W; x++) for (let y = 100; y < H; y++) if (bayer(x, y) < 0.15 && (y & 1)) c.set(x, y, P.castleRoof);
    charlesBridge(c);
    bridgeTower(c, 196);
    const r = rng(186);
    for (let i = 0; i < 3; i++) { const x = 30 + Math.floor(r() * 140); c.hline(x, x + 8, 104 + i, P.waterLight); }
  },
  drawStamp(c, x, y, w, h) {
    c.rect(x, y, w, h, "#f3e6c9");
    const cx = x + Math.floor(w / 2);
    c.rect(cx - 7, y + h - 6, 15, 6, P.gothic);
    c.rect(cx - 1, y + 5, 3, h - 11, P.gothic);
    for (let k = 0; k < 5; k++) c.hline(cx - Math.floor(k / 2), cx + Math.floor(k / 2), y + k, P.copper);
    c.rect(cx - 7, y + h - 9, 3, 3, P.gothicDark); c.rect(cx + 5, y + h - 9, 3, 3, P.gothicDark);
    c.hline(x, x + w - 1, y + h - 1, "#8f2f2f");
  },
};
