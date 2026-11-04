import { bayer, rng, type PixelCanvas } from "../pixel/canvas";
import type { PostcardScene } from "../template";
import { W, H, foliage, reflection, ridge, sky, water, birds, people, scooter, lanternString } from "./common";

/** Hanoi on a misty morning: Turtle Tower on Hoan Kiem Lake, the red The Huc Bridge, a willow. */
const P = {
  sky: ["#8ea9ba", "#a7bec8", "#c4d3d2", "#dfe4d8", "#efe9d8"],
  sun: "#f6ecd2",
  treesFar: "#a9bfae", treesFarDark: "#97b09d",
  facade: "#e5c46a", facadeShade: "#c9a44e", shutter: "#4f8a72", roofTerracotta: "#b5654a",
  tower: "#e9dcb2", towerShade: "#c4b27e", towerDark: "#8f7f58", towerRoof: "#5c5a58",
  islet: "#6f9a74", isletDark: "#557e5e",
  bridge: "#c43b2e", bridgeDark: "#8e2a22",
  water: "#7fa59a", waterLight: "#b9d3c8", waterDark: "#628a80",
  willow: "#6a9a62", willowLight: "#93bf80", willowDark: "#4c7a4c", trunk: "#5a4636",
  mist: "#e9ece2",
};

function farBank(c: PixelCanvas) {
  const r = rng(71);
  // French-colonial facades along the far shore
  for (let x = 120; x < W; x += 13 + Math.floor(r() * 4)) {
    const top = 70 + Math.floor(r() * 6), w = 11 + Math.floor(r() * 3);
    c.rect(x, top, w, 86 - top, P.facade);
    c.rect(x + w - 2, top, 2, 86 - top, P.facadeShade);
    c.hline(x - 1, x + w, top - 1, P.roofTerracotta);
    for (let y = top + 3; y < 84; y += 5) for (let i = x + 2; i < x + w - 2; i += 3) { c.set(i, y, P.shutter); c.set(i, y + 1, P.shutter); }
  }
  ridge(c, (x) => (x < 124 ? 72 + 3 * Math.sin(x / 8) + Math.sin(x / 3) : 200), P.treesFar, P.treesFarDark);
  ridge(c, (x) => 84 + Math.sin(x / 5), P.treesFarDark);
  // morning mist bands
  c.paint((x, y) => ((y === 78 || y === 79 || y === 83) && bayer(x, y) < 0.5 ? P.mist : null), 0, 76, W - 1, 84);
}

function turtleTower(c: PixelCanvas, cx: number) {
  // islet
  for (let y = 86; y <= 91; y++) {
    const hw = 14 + (y - 86) * 2;
    c.hline(cx - hw, cx + hw, y, y === 86 ? P.islet : bayer(cx, y) < 0.5 ? P.islet : P.isletDark);
  }
  foliage(c, 72, cx - 14, 84, 4, [P.willow, P.willowLight, P.willowDark]);
  foliage(c, 73, cx + 15, 85, 3, [P.willow, P.willowLight, P.willowDark]);
  // three storeys, each narrower, with arched openings
  const storey = (y1: number, hw: number, h: number, arches: number) => {
    c.rect(cx - hw, y1 - h, hw * 2 + 1, h, P.tower);
    c.rect(cx + hw - 1, y1 - h, 2, h, P.towerShade);
    const gap = (hw * 2) / (arches + 1);
    for (let i = 1; i <= arches; i++) {
      const ax = Math.round(cx - hw + gap * i);
      c.rect(ax - 1, y1 - h + 2, 2, h - 3, P.towerDark);
      c.set(ax - 1, y1 - h + 2, P.tower);
    }
    c.hline(cx - hw - 1, cx + hw + 1, y1 - h - 1, P.towerRoof);
  };
  storey(86, 10, 9, 4);
  storey(76, 7, 7, 3);
  storey(68, 4, 6, 1);
  c.polygon([[cx - 3, 61], [cx, 57], [cx + 3, 61]], P.towerRoof);
  c.set(cx, 56, P.towerDark);
}

function theHucBridge(c: PixelCanvas) {
  const x0 = 4, x1 = 76, deck = 88;
  for (let x = x0; x <= x1; x++) {
    const t = (x - x0) / (x1 - x0);
    const y = Math.round(deck - Math.sin(Math.PI * t) * 7);
    c.set(x, y, P.bridge); c.set(x, y + 1, P.bridge); c.set(x, y + 2, P.bridgeDark);
    c.set(x, y - 3, P.bridge); // rail
    if ((x - x0) % 5 === 0) { c.set(x, y - 1, P.bridge); c.set(x, y - 2, P.bridge); }
    // trestle legs down to the water
    if ((x - x0) % 9 === 4) for (let k = y + 3; k < 93; k++) c.set(x, k, P.bridgeDark);
    const ry = 2 * 93 - y; // reflection
    if (ry < H && ry > 93 && bayer(x, ry) < 0.5) c.set(x, ry, P.bridgeDark);
  }
}

function willow(c: PixelCanvas, x: number) {
  c.line(x, 108, x - 3, 70, P.trunk, 3);
  c.line(x - 3, 74, x + 10, 66, P.trunk, 2);
  foliage(c, 74, x + 2, 62, 13, [P.willow, P.willowLight, P.willowDark]);
  // hanging strands
  const r = rng(75);
  for (let k = 0; k < 22; k++) {
    const sx = x - 10 + Math.floor(r() * 26), len = 14 + Math.floor(r() * 22);
    for (let y = 66; y < 66 + len && y < 102; y++) if ((y + sx) % 3) c.set(sx + Math.round(Math.sin(y / 6)), y, k % 3 ? P.willow : P.willowLight);
  }
}

export const hanoiScene: PostcardScene = {
  cityId: "hanoi",
  accent: "#3a7d6b",
  description: "Pixel-art view of Hanoi on a misty morning: the three-storey Turtle Tower on its islet in Hoan Kiem Lake, the red The Huc Bridge, yellow colonial facades and a weeping willow.",
  draw(c) {
    sky(c, P.sky, 76);
    c.disc(176, 40, 9, P.sun);
    farBank(c);
    water(c, 92, P.water, P.waterLight, P.waterDark, 77);
    turtleTower(c, 112);
    reflection(c, 112, 9, 94, P.towerShade, 0.3);
    theHucBridge(c);
    willow(c, 206);
    // motorbikes along the far bank, a flower-seller's bicycle, conical hats on the bridge, red lanterns, swallows
    const cols = ["#c8432f", "#3a5a9a", "#e2b84a", "#4f9a6a", "#f3ead8"];
    for (let i = 0; i < 6; i++) scooter(c, 122 + i * 14, 90, cols[i % cols.length]!, { shirt: cols[(i + 1) % cols.length]!, helmet: cols[(i + 3) % cols.length]! });
    // flower-seller bicycle heaped with pink and white blossoms
    c.set(108, 90, "#2b2b33"); c.set(116, 90, "#2b2b33"); c.line(108, 90, 112, 87, "#5a4636"); c.line(112, 87, 116, 90, "#5a4636");
    for (let k = 0; k < 12; k++) c.set(110 + (k % 6), 84 + Math.floor(k / 6), k % 3 ? "#e98aa0" : "#f6ecd2");
    for (const x of [20, 30, 44, 58]) {
      const y = Math.round(88 - Math.sin((Math.PI * (x - 4)) / 72) * 7) - 4;
      people(c, 470 + x, y, x, x, 1, ["#f3ead8", "#3a5a9a", "#4f9a6a"]);
      c.hline(x - 1, x + 1, y - 4, "#e9d9a8"); c.set(x, y - 5, "#e9d9a8");
    }
    lanternString(c, 150, 196, 58, 3, ["#c43b2e", "#e2b84a"]);
    birds(c, 471, 40, 20, 130, 40, 6, "#4a5a6a");
  },
  drawStamp(c, x, y, w, h) {
    c.rect(x, y, w, h, "#c43b2e");
    const cx = x + w / 2 - 0.5, cy = y + h / 2;
    const pts: [number, number][] = [];
    for (let k = 0; k < 10; k++) {
      const a = -Math.PI / 2 + (k * Math.PI) / 5, rad = k % 2 ? 2.6 : 6.5;
      pts.push([cx + Math.cos(a) * rad, cy + Math.sin(a) * rad]);
    }
    c.polygon(pts, "#f2cf4a");
  },
};
