import { bayer, rng, type PixelCanvas } from "../pixel/canvas";
import type { PostcardScene } from "../template";
import { foliage, reflection, sky, water, birds, people, lamp, rowboat } from "./common";

/** Singapore: Marina Bay Sands and its SkyPark, Gardens by the Bay supertrees, the Merlion fountain. */
const P = {
  sky: ["#3f78b0", "#5b95c8", "#8cb8db", "#c4dbe7", "#ecebd6"],
  cumulus: "#f8f6ef", cumulusShade: "#d9e2ea", cumulusDeep: "#bccbd9",
  city: "#8fa7b8", cityDark: "#7690a4", window: "#cfdbe3",
  mbs: "#d3dbe0", mbsShade: "#9fadb7", mbsGlass: "#7f95a6", deck: "#e9eee9", deckGreen: "#6aa36f",
  trunk: "#6f5f80", trunkLight: "#8c7ba0", canopy: "#5aa06a", canopyLight: "#86c27a", canopyPurple: "#9a6aa8",
  merlion: "#f1ece0", merlionShade: "#c9c2b3", spout: "#d7eef2",
  water: "#4f8fa7", waterLight: "#9fd0dc", waterDark: "#3b7389",
  palm: ["#3f8a4f", "#6db36a", "#2d6a3d", "#8ccf77"],
};

function cumulus(c: PixelCanvas, cx: number, cy: number, s: number) {
  const parts: [number, number, number][] = [[0, 0, 7], [-8, 3, 5], [8, 2, 6], [-3, -4, 5], [4, -5, 4]];
  for (const [dx, dy, r] of parts) c.disc(cx + dx * s, cy + dy * s, r * s, P.cumulus);
  c.paint((x, y) => (c.get(x, y) === P.cumulus && y > cy + 2 * s ? (bayer(x, y) < 0.5 ? P.cumulusShade : P.cumulusDeep) : null), cx - 16 * s, cy, cx + 16 * s, cy + 8 * s);
}

function city(c: PixelCanvas) {
  const r = rng(37);
  const blocks: [number, number, number][] = [[156, 8, 62], [165, 6, 56], [172, 9, 66], [182, 7, 52], [190, 10, 60], [201, 7, 68], [209, 9, 58], [219, 6, 64]];
  for (const [x, w, t] of blocks) {
    c.rect(x, t, w, 92 - t, P.city);
    c.rect(x + w - 2, t, 2, 92 - t, P.cityDark);
    for (let y = t + 2; y < 90; y += 3) for (let i = x + 1; i < x + w - 2; i += 2) if (r() < 0.5) c.set(i, y, P.window);
  }
}

function marinaBaySands(c: PixelCanvas) {
  const towers = [92, 112, 132];
  for (const tx of towers) {
    for (let y = 40; y < 93; y++) {
      // each tower is two leaning legs joined near the top
      const spread = Math.max(0, (y - 46) * 0.06);
      const l0 = Math.round(tx - spread), l1 = Math.round(tx + 9 + spread * 0.4);
      for (let x = l0; x <= l1; x++) {
        const shade = x > l1 - 3;
        c.set(x, y, shade ? P.mbsShade : (y % 3 === 0 ? P.mbsGlass : P.mbs));
      }
    }
  }
  // SkyPark boat across the three towers, cantilevered to the right
  c.rect(86, 35, 70, 4, P.deck);
  c.hline(86, 156, 34, P.deckGreen);
  c.hline(86, 156, 39, P.mbsShade);
  c.rect(150, 36, 7, 2, P.mbsShade);
  for (let x = 90; x < 150; x += 5) c.set(x, 33, P.deckGreen);
}

function supertrees(c: PixelCanvas) {
  const trees: [number, number, number][] = [[14, 48, 12], [34, 58, 9], [52, 52, 11], [68, 64, 7]];
  for (const [x, top, r] of trees) {
    for (let y = top; y < 94; y++) {
      const hw = 1 + Math.max(0, (y - top) / (94 - top)) * 1.8 + (y > 88 ? 1 : 0);
      for (let xx = Math.round(x - hw); xx <= Math.round(x + hw); xx++) c.set(xx, y, (xx + y) % 3 === 0 ? P.trunkLight : P.trunk);
    }
    // funnel canopy, wide at the top
    for (let k = 0; k < 6; k++) {
      const hw = r - k * (r / 7);
      for (let xx = Math.round(x - hw); xx <= Math.round(x + hw); xx++) {
        const col = (xx + k) % 4 === 0 ? P.canopyPurple : k === 0 ? P.canopyLight : P.canopy;
        c.set(xx, top - 5 + k, col);
      }
    }
  }
  // skyway between the tall trees
  c.line(14, 64, 52, 66, P.trunkLight);
}

function merlion(c: PixelCanvas, x: number) {
  // plinth
  c.rect(x - 7, 90, 16, 6, P.merlionShade);
  c.rect(x - 7, 90, 16, 1, P.merlion);
  // fish body curling up, lion head and mane
  c.polygon([[x - 5, 90], [x - 2, 76], [x + 3, 74], [x + 6, 78], [x + 5, 90]], P.merlion);
  c.polygon([[x + 2, 90], [x + 6, 80], [x + 6, 90]], P.merlionShade);
  for (let y = 78; y < 90; y += 2) c.hline(x - 3, x + 3, y, P.merlionShade); // scales
  c.disc(x - 2, 72, 4, P.merlion);
  c.disc(x - 1, 71, 2, P.merlionShade);
  c.set(x - 5, 72, P.merlionShade);
  // water jet arcing into the bay
  for (let k = 0; k < 26; k++) {
    const px = x - 6 - k, py = 72 + Math.round(k * k * 0.035);
    c.set(px, py, P.spout);
    if (k % 2) c.set(px, py + 1, P.waterLight);
  }
}

export const singaporeScene: PostcardScene = {
  cityId: "singapore",
  accent: "#c8382f",
  description: "Pixel-art view of Singapore: Marina Bay Sands with its SkyPark across three towers, Gardens by the Bay supertrees, tropical clouds, and the Merlion fountain spouting into the bay.",
  draw(c) {
    sky(c, P.sky);
    cumulus(c, 46, 22, 1.1);
    cumulus(c, 178, 30, 0.9);
    cumulus(c, 118, 16, 0.6);
    city(c);
    marinaBaySands(c);
    supertrees(c);
    water(c, 94, P.water, P.waterLight, P.waterDark, 47);
    reflection(c, 112, 26, 96, P.mbsShade, 0.3);
    merlion(c, 196);
    foliage(c, 81, 214, 90, 9, P.palm);
    foliage(c, 82, 80, 94, 7, P.palm);
    // bumboat on the bay, people and lamps along the promenade, birds
    rowboat(c, 26, 103, 26, "#c8382f", "#e2b84a", "#f3ead8");
    c.rect(32, 98, 14, 2, "#f3ead8");
    c.rect(32, 100, 1, 3, "#6e4c3a"); c.rect(45, 100, 1, 3, "#6e4c3a");
    for (let x = 140; x < 188; x += 12) lamp(c, x, 93, 6, "#3d4560", "#f2cf6a");
    people(c, 450, 93, 132, 190, 9, ["#2f3346", "#c8382f", "#3a5a9a", "#e2b84a", "#f3ead8"]);
    birds(c, 451, 70, 40, 140, 56, 4, "#3a4466");
  },
  drawStamp(c, x, y, w, h) {
    c.rect(x, y, w, h, "#c8382f");
    c.rect(x, y + Math.floor(h / 2), w, Math.ceil(h / 2), "#f3e6c9");
    c.disc(x + 6, y + 5, 3.4, "#f3e6c9");
    c.disc(x + 7.4, y + 5, 3, "#c8382f");
    for (const [dx, dy] of [[12, 3], [15, 4], [14, 7], [10, 7], [9, 4]] as const) c.set(x + dx, y + dy, "#f3e6c9");
  },
};
