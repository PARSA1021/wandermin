import { bayer, rng, type PixelCanvas } from "../pixel/canvas";
import type { PostcardScene } from "../template";
import { W, H, cloud, foliage, ridge, roof, sky, birds, people, stoneLantern, lanternString } from "./common";

/** Kyoto in autumn: five-storey pagoda, Higashiyama hills at dusk, a vermilion torii and maples. */
const P = {
  sky: ["#56689a", "#7a87b2", "#b2aec4", "#e3c2a8", "#f1d4ab"],
  sun: "#f6e2b8", cloud: "#f3e3cf", cloudShade: "#d9c2bc",
  hillFar: "#8f90ad", hillFarCrest: "#7c7d9c", hillNear: "#7b6f75", hillNearCrest: "#665b63", autumnDither: "#a0715a",
  roofTown: "#4a4a5a", roofTownLight: "#62627a", plasterTown: "#e8dcc4", lattice: "#7a4a35", latticeDark: "#5a3426",
  tile: "#3c4152", eave: "#262a37", tileLine: "#585e75",
  wood: "#9a4a32", woodDark: "#6e3322", plaster: "#eee3cc", spire: "#8a7a55", ring: "#b59a5a",
  torii: "#d0452e", toriiShade: "#9b3122", kasagi: "#2b2b33",
  path: "#cbbfa7", pathDither: "#b3a68c",
  maple: ["#c9472c", "#ec8a3c", "#8f2a1f", "#f4c25a", "#e25f30"],
};

function backdrop(c: PixelCanvas) {
  sky(c, P.sky);
  c.disc(178, 60, 10, P.sun);
  cloud(c, 120, 170, 30, P.cloud, P.cloudShade);
  cloud(c, 18, 58, 40, P.cloud, P.cloudShade);
  ridge(c, (x) => 58 + 6 * Math.sin(x / 21) + 3 * Math.sin(x / 8), P.hillFar, P.hillFarCrest);
  ridge(c, (x) => 70 + 5 * Math.sin(x / 15 + 2) + Math.sin(x / 4), P.hillNear, P.hillNearCrest, P.autumnDither, 0.3);
}

function town(c: PixelCanvas) {
  const r = rng(5);
  for (let x = -2; x < W; x += 9 + Math.floor(r() * 4)) {
    const y = 82 + Math.floor(r() * 4), w = 9 + Math.floor(r() * 4);
    c.rect(x, y + 3, w - 1, 10, P.plasterTown);
    c.rect(x, y + 7, w - 1, 6, P.lattice); // wooden koshi lattice on the ground floor
    for (let i = x; i < x + w - 1; i += 2) c.rect(i, y + 7, 1, 6, P.latticeDark);
    c.hline(x, x + w - 2, y + 6, P.roofTown); // small eave between floors
    for (let k = 0; k < 4; k++) c.hline(x - 1 + k, x + w - 1 - k, y + k, k === 0 ? P.roofTownLight : P.roofTown);
  }
}

function pagoda(c: PixelCanvas, cx: number) {
  let y = 94;
  for (let tier = 0; tier < 5; tier++) {
    const hw = 10 - tier;
    const wallTop = y - 6;
    c.rect(cx - hw, wallTop, hw * 2 + 1, 6, P.wood);
    c.rect(cx + hw - 1, wallTop, 2, 6, P.woodDark);
    c.hline(cx - hw, cx + hw, wallTop + 1, P.plaster);
    for (let x = cx - hw + 2; x < cx + hw - 1; x += 3) c.set(x, wallTop + 3, P.woodDark);
    const base = 20 - tier * 1.6;
    roof(c, cx, wallTop - 6, 6, base - 7, base, P.tile, P.eave, P.tileLine);
    y = wallTop - 6;
  }
  // sorin spire with nine rings
  c.rect(cx, 4, 1, y - 4, P.spire);
  for (let k = 0; k < 7; k++) c.hline(cx - 1, cx + 1, 8 + k * 3, P.ring);
  c.disc(cx, 4, 1, P.ring);
}

function torii(c: PixelCanvas) {
  const l = 170, r = 194;
  for (const x of [l, r]) { c.rect(x, 66, 3, 38, P.torii); c.rect(x + 2, 66, 1, 38, P.toriiShade); c.rect(x - 1, 100, 5, 4, P.kasagi); }
  c.rect(164, 66, 36, 2, P.torii);
  c.rect(160, 62, 44, 3, P.kasagi);
  c.set(159, 61, P.kasagi); c.set(204, 61, P.kasagi); c.set(158, 60, P.kasagi); c.set(205, 60, P.kasagi);
  c.rect(166, 74, 32, 2, P.torii);
  c.rect(181, 68, 3, 6, P.kasagi);
}

function foreground(c: PixelCanvas) {
  c.paint((x, y) => (bayer(x, y) < 0.2 ? P.pathDither : P.path), 0, 100, W - 1, H - 1);
  foliage(c, 61, 16, 92, 15, P.maple);
  foliage(c, 62, 118, 98, 11, P.maple);
  foliage(c, 63, 142, 103, 8, P.maple);
  foliage(c, 64, 216, 92, 14, P.maple);
  const r = rng(9);
  for (let i = 0; i < 12; i++) c.set(Math.floor(30 + r() * 170), Math.floor(40 + r() * 55), P.maple[(i % 3) + 1]!);
}

export const kyotoScene: PostcardScene = {
  cityId: "kyoto",
  accent: "#a9452e",
  description: "Pixel-art view of Kyoto in autumn: a five-storey pagoda above old town roofs, Higashiyama hills at dusk, a vermilion torii and red and orange maples.",
  draw(c) {
    backdrop(c);
    town(c);
    pagoda(c, 74);
    torii(c);
    foreground(c);
    // lanterns under the torii, stone lanterns on the path, visitors with paper parasols, crows
    lanternString(c, 172, 194, 76, 1, ["#efe2c4"]);
    stoneLantern(c, 158, 103);
    stoneLantern(c, 206, 103);
    for (const [x, col] of [[94, "#c8432f"], [104, "#3a5a9a"], [130, "#e2b84a"], [176, "#c8432f"], [186, "#e8607e"]] as const) {
      people(c, 430 + x, 104, x, x, 1, ["#3a5a9a", "#e8607e", "#4f7a5a", "#efe2c4"]);
      c.hline(x - 2, x + 2, 98, col);
      c.hline(x - 1, x + 1, 97, col);
      c.set(x, 99, "#4a3431");
    }
    birds(c, 431, 30, 10, 110, 28, 4, "#2b2b33");
  },
  drawStamp(c, x, y, w, h) {
    c.rect(x, y, w, h, "#f3e6c9");
    const cx = x + w / 2 - 0.5, cy = y + h / 2;
    // maple leaf: five lobes around a centre
    for (let k = 0; k < 5; k++) {
      const a = -Math.PI / 2 + (k - 2) * 0.75;
      c.line(cx, cy + 1, cx + Math.cos(a) * 6, cy + 1 + Math.sin(a) * 6, P.maple[0]!, 2);
    }
    c.disc(cx, cy, 2.5, P.maple[0]!);
    c.line(cx, cy + 2, cx, cy + 7, P.woodDark);
  },
};
