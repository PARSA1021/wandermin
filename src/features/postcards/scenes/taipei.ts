import { bayer, rng, type PixelCanvas } from "../pixel/canvas";
import type { PostcardScene } from "../template";
import { W, H, cloud, foliage, ridge, roof, sky, treeRow, birds, people, scooter } from "./common";

/** Taipei: Taipei 101 rising beside Elephant Mountain, a temple roof with swallowtail ridges and red lanterns. */
const P = {
  sky: ["#4d6fa0", "#6a8fbd", "#94b3d3", "#c7d8df", "#e8e6d2"],
  cloud: "#f1efe6", cloudShade: "#d4dbe2",
  mtnFar: "#86a39a", mtnFarCrest: "#71908a", mtn: "#5f8a6c", mtnCrest: "#4d7659", mtnLight: "#74a07c",
  city: "#8ea3ad", cityDark: "#748a96", window: "#c2d0d4",
  glass: "#6aa39a", glassDark: "#4d7f78", glassLight: "#a6d0c4", frame: "#3d6460", spire: "#c9d2cf",
  tile: "#d08a3a", tileLine: "#e9b25c", eave: "#8f4f22", wall: "#b83a2b", wallDark: "#86281f",
  gold: "#e2b84a", dragonBlue: "#3d7fa6", dragonGreen: "#4f9a6a",
  lantern: "#d6402e", lanternGlow: "#f2a24a", cord: "#3b2a26",
  plaza: "#d6ccb6", plazaDither: "#c1b59c",
  tree: "#4d7c58", treeLight: "#6a9a70", treeDark: "#365a45",
};

function backdrop(c: PixelCanvas) {
  sky(c, P.sky);
  cloud(c, 14, 60, 22, P.cloud, P.cloudShade);
  cloud(c, 70, 108, 40, P.cloud, P.cloudShade);
  ridge(c, (x) => 56 + 5 * Math.sin(x / 19) + 2 * Math.sin(x / 6), P.mtnFar, P.mtnFarCrest);
  // Elephant Mountain to the right of the tower
  ridge(c, (x) => (x > 150 ? 62 - Math.max(0, 14 - Math.abs(x - 190) * 0.4) + Math.sin(x / 3) : 200), P.mtn, P.mtnCrest, P.mtnLight, 0.14);
  const r = rng(13);
  const blocks: [number, number, number][] = [
    [96, 8, 76], [105, 6, 70], [112, 9, 78], [160, 7, 74], [168, 9, 68], [178, 6, 76], [185, 10, 72], [196, 7, 78], [204, 9, 74], [214, 10, 80],
  ];
  for (const [x, w, t] of blocks) {
    c.rect(x, t, w, 92 - t, P.city);
    c.rect(x + w - 2, t, 2, 92 - t, P.cityDark);
    for (let y = t + 2; y < 90; y += 3) for (let i = x + 1; i < x + w - 2; i += 2) if (r() < 0.5) c.set(i, y, P.window);
  }
}

function taipei101(c: PixelCanvas, cx: number) {
  // podium
  c.rect(cx - 11, 82, 23, 11, P.glassDark);
  for (let x = cx - 10; x < cx + 11; x += 3) c.rect(x, 84, 1, 8, P.frame);
  // eight flared sections, each wider at its top like a stack of bamboo joints / pagoda tiers
  const sectionH = 7;
  for (let s = 0; s < 8; s++) {
    const bottom = 82 - s * sectionH;
    for (let k = 0; k < sectionH; k++) {
      const y = bottom - k;
      const hw = 5 + (k / (sectionH - 1)) * 2.5;
      for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) {
        const right = x > cx + 1;
        c.set(x, y, k === sectionH - 1 ? P.glassLight : right ? P.glassDark : bayer(x, y) < 0.12 ? P.glassLight : P.glass);
      }
    }
    c.hline(cx - 5, cx + 5, bottom, P.frame);
    // ruyi ornament on each face at the base of the stack
    if (s === 0) { c.set(cx - 2, bottom - 3, P.gold); c.set(cx + 2, bottom - 3, P.gold); }
  }
  // stepped crown and spire
  const top = 82 - 8 * sectionH;
  c.rect(cx - 4, top - 4, 9, 4, P.glass);
  c.rect(cx + 2, top - 4, 3, 4, P.glassDark);
  c.rect(cx - 2, top - 8, 5, 4, P.glass);
  c.rect(cx - 1, top - 11, 3, 3, P.glassDark);
  c.rect(cx, 2, 1, top - 13, P.spire);
}

function temple(c: PixelCanvas) {
  const cx = 46;
  c.rect(14, 86, 64, 12, P.wall);
  c.rect(70, 86, 8, 12, P.wallDark);
  // carved doors
  for (const dx of [-14, 0, 14]) {
    c.rect(cx + dx - 4, 89, 9, 9, P.wallDark);
    c.rect(cx + dx - 3, 90, 7, 7, P.gold);
    c.rect(cx + dx, 90, 1, 7, P.wallDark);
  }
  roof(c, cx, 76, 9, 26, 38, P.tile, P.eave, P.tileLine);
  // swallowtail ridge that sweeps up at both ends
  c.hline(cx - 26, cx + 26, 75, P.eave);
  for (let k = 0; k < 8; k++) {
    c.set(cx - 26 - k, 75 - Math.round(k * k * 0.12), P.eave);
    c.set(cx + 26 + k, 75 - Math.round(k * k * 0.12), P.eave);
  }
  // twin dragons and a pearl on the ridge
  for (let k = 0; k < 10; k++) {
    c.set(cx - 18 + k, 73 - Math.round(Math.sin(k / 1.6) * 1.5), k % 2 ? P.dragonBlue : P.dragonGreen);
    c.set(cx + 8 + k, 73 - Math.round(Math.sin(k / 1.6 + 1) * 1.5), k % 2 ? P.dragonGreen : P.dragonBlue);
  }
  c.disc(cx, 72, 1.5, P.gold);
  // hanging lanterns
  c.hline(10, 84, 87, P.cord);
  for (let x = 14; x <= 80; x += 11) {
    c.rect(x - 1, 88, 4, 5, P.lantern);
    c.set(x, 89, P.lanternGlow);
    c.set(x + 1, 93, P.gold);
  }
}

export const taipeiScene: PostcardScene = {
  cityId: "taipei",
  accent: "#3f8a80",
  description: "Pixel-art view of Taipei with the green-glass Taipei 101 tower beside Elephant Mountain, the city below, and a temple roof with swallowtail ridges, dragons and red lanterns.",
  draw(c) {
    backdrop(c);
    treeRow(c, 15, 95, P.tree, P.treeLight, P.treeDark, 84, W + 6);
    taipei101(c, 140);
    temple(c);
    c.paint((x, y) => (bayer(x, y) < 0.15 ? P.plazaDither : P.plaza), 0, 98, W - 1, H - 1);
    foliage(c, 71, 206, 96, 12, [P.tree, P.treeLight, P.treeDark]);
    foliage(c, 72, 104, 100, 7, [P.tree, P.treeLight, P.treeDark]);
    // scooters filling the street, incense from the temple, people, birds
    const cols = ["#c8432f", "#3a5a9a", "#f3ead8", "#e2b84a", "#4f9a6a", "#2b2b33"];
    for (let i = 0; i < 9; i++) scooter(c, 84 + i * 15, 105 - (i % 2), cols[i % cols.length]!, i % 3 === 0 ? undefined : { shirt: cols[(i + 2) % cols.length]!, helmet: cols[(i + 4) % cols.length]! });
    for (let k = 0; k < 10; k++) c.set(46 + Math.round(Math.sin(k / 1.5) * 2), 70 - k, k % 2 ? "#d9d6d0" : "#efece6");
    people(c, 440, 99, 4, 80, 9, ["#2f3346", "#c8432f", "#3a5a9a", "#e2b84a", "#f3ead8"]);
    birds(c, 441, 20, 12, 100, 30, 5, "#3a4466");
  },
  drawStamp(c, x, y, w, h) {
    c.rect(x, y, w, h, "#f3e6c9");
    const cx = x + Math.floor(w / 2);
    for (let s = 0; s < 5; s++) for (let k = 0; k < 3; k++) c.hline(cx - 2 - (k > 1 ? 1 : 0), cx + 2 + (k > 1 ? 1 : 0), y + h - 2 - s * 3 - k, P.glass);
    c.rect(cx - 1, y + 1, 1, h - 17, P.glassDark);
    c.rect(cx - 1, y + h - 19, 2, 3, P.glassDark);
  },
};
