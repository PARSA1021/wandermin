import { bayer, rng, type PixelCanvas } from "../pixel/canvas";
import type { PostcardScene } from "../template";
import { W, cloud, foliage, reflection, ridge, roof, sky, treeRow, water, birds, people, rowboat, lanternString } from "./common";

/** Osaka: the castle keep on its stone walls, moat, cherry trees and the city beyond. */
const P = {
  sky: ["#4a6aa3", "#6687bd", "#8fa9d1", "#c3d0e1", "#e9dfcb"],
  cloud: "#f1ece2", cloudShade: "#d3d7e2",
  city: "#93a6b6", cityDark: "#7a8ea0", window: "#c4d0d8",
  stone: "#8f8a80", stoneLine: "#736e66", stoneLight: "#aaa497",
  wall: "#f2ede0", wallShade: "#d3cdbf", window2: "#2f3a46",
  tile: "#5f9c88", eave: "#3c6b5e", tileLine: "#86bfa9", gold: "#d8b04a", goldDark: "#a8842e", top: "#3d4a4f",
  tree: "#4f7d5c", treeLight: "#6c9b72", treeDark: "#3a5d49",
  water: "#5f8e9a", waterLight: "#a3c6c5", waterDark: "#46707e",
  cherry: ["#eea3b3", "#fbd4db", "#cf6f84", "#ffffff"],
};

function skylineBeyond(c: PixelCanvas) {
  const r = rng(17);
  const blocks: [number, number, number][] = [
    [0, 9, 72], [10, 6, 66], [17, 8, 74], [26, 5, 70], [170, 7, 70], [178, 10, 60], [189, 6, 68], [196, 9, 56], [206, 7, 66], [214, 10, 72],
  ];
  for (const [x, w, t] of blocks) {
    c.rect(x, t, w, 90 - t, P.city);
    c.rect(x + w - 2, t, 2, 90 - t, P.cityDark);
    for (let y = t + 2; y < 88; y += 3) for (let i = x + 1; i < x + w - 2; i += 2) if (r() < 0.5) c.set(i, y, P.window);
  }
  ridge(c, (x) => 80 + 2 * Math.sin(x / 7), P.tree, P.treeDark);
  treeRow(c, 8, 86, P.tree, P.treeLight, P.treeDark);
}

function stoneBase(c: PixelCanvas, cx: number) {
  const top = 64, bottom = 92;
  for (let y = top; y <= bottom; y++) {
    const t = (y - top) / (bottom - top);
    const hw = 34 + 9 * Math.pow(t, 1.6); // ishigaki walls curve outwards at the foot
    for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) {
      const row = Math.floor((y - top) / 4);
      const joint = (y - top) % 4 === 0 || (x + row * 4) % 8 === 0;
      c.set(x, y, joint ? P.stoneLine : bayer(x, y) < 0.15 ? P.stoneLight : P.stone);
    }
  }
}

function keep(c: PixelCanvas, cx: number) {
  const wall = (y0: number, y1: number, hw: number, color = P.wall, shade = P.wallShade) => {
    for (let y = y0; y < y1; y++) for (let x = cx - hw; x <= cx + hw; x++) c.set(x, y, x > cx + hw - 3 ? shade : color);
  };
  const windows = (y: number, hw: number) => { for (let x = cx - hw + 2; x < cx + hw - 1; x += 4) { c.set(x, y, P.window2); c.set(x, y + 1, P.window2); } };
  wall(53, 64, 30); windows(57, 30);
  roof(c, cx, 47, 6, 26, 35, P.tile, P.eave, P.tileLine);
  wall(42, 47, 24); windows(43, 24);
  roof(c, cx, 36, 6, 20, 29, P.tile, P.eave, P.tileLine);
  // central gable with gold trim
  c.polygon([[cx - 7, 36], [cx, 31], [cx + 7, 36]], P.tile);
  c.polyline([[cx - 7, 36], [cx, 31], [cx + 7, 36]], P.gold);
  wall(31, 36, 19); windows(32, 19);
  roof(c, cx, 25, 6, 14, 23, P.tile, P.eave, P.tileLine);
  wall(20, 25, 14); c.hline(cx - 13, cx + 13, 22, P.gold);
  roof(c, cx, 14, 6, 9, 18, P.tile, P.eave, P.tileLine);
  // top storey: dark with gold tiger reliefs
  wall(9, 14, 10, P.top, P.top);
  for (let x = cx - 8; x <= cx + 8; x += 4) { c.set(x, 11, P.gold); c.set(x + 1, 11, P.goldDark); }
  roof(c, cx, 3, 6, 3, 14, P.tile, P.eave, P.tileLine);
  // golden shachihoko on the ridge
  for (const sx of [cx - 4, cx + 3]) { c.rect(sx, 0, 2, 3, P.gold); c.set(sx + (sx < cx ? -1 : 2), 0, P.goldDark); }
}

export const osakaScene: PostcardScene = {
  cityId: "osaka",
  accent: "#3d8a77",
  description: "Pixel-art view of Osaka Castle: a white keep with green copper roofs and gold trim on curved stone walls, reflected in the moat, with cherry trees and the city skyline.",
  draw(c) {
    const cx = 112;
    sky(c, P.sky);
    cloud(c, 20, 74, 26, P.cloud, P.cloudShade);
    cloud(c, 150, 200, 40, P.cloud, P.cloudShade);
    cloud(c, 36, 60, 48, P.cloud, P.cloudShade);
    skylineBeyond(c);
    stoneBase(c, cx);
    keep(c, cx);
    water(c, 93, P.water, P.waterLight, P.waterDark, 31);
    reflection(c, cx, 32, 95, P.stoneLine, 0.35);
    reflection(c, cx, 22, 97, P.wall, 0.25);
    foliage(c, 41, 18, 88, 14, P.cherry);
    foliage(c, 42, 44, 92, 8, P.cherry);
    foliage(c, 43, 204, 86, 15, P.cherry);
    foliage(c, 44, 178, 92, 8, P.cherry);
    // a few petals on the water
    for (let i = 0; i < 18; i++) c.set(((i * 53) % (W - 10)) + 5, 96 + ((i * 7) % 11), "#fbd4db");
    // hanami lanterns, sightseeing boats on the moat, strollers on the bank, birds
    lanternString(c, 0, 62, 74, 3, ["#c8432f", "#f3ece2"]);
    lanternString(c, 162, W - 1, 72, 3, ["#c8432f", "#f3ece2"]);
    rowboat(c, 58, 100, 18, "#6e4c3a", "#c8a060", "#f3ead8");
    rowboat(c, 150, 104, 20, "#3d4a52", "#d8b04a", "#c8432f");
    people(c, 420, 92, 54, 92, 6, ["#2f3a46", "#e8607e", "#f3ead8", "#3a5a9a"]);
    people(c, 421, 92, 134, 174, 6, ["#2f3a46", "#e8607e", "#f3ead8", "#3a5a9a"]);
    birds(c, 422, 140, 12, 190, 26, 4, "#3a4466");
  },
  drawStamp(c, x, y, w, h) {
    c.rect(x, y, w, h, "#f3e6c9");
    const cx = x + w / 2 - 0.5;
    c.rect(Math.round(cx - 6), y + h - 4, 13, 4, P.stone);
    c.rect(Math.round(cx - 4), y + h - 8, 9, 4, P.wall);
    c.polygon([[cx - 7, y + h - 8], [cx, y + h - 12], [cx + 7, y + h - 8]], P.tile);
    c.rect(Math.round(cx - 2), y + h - 14, 5, 3, P.wall);
    c.polygon([[cx - 5, y + h - 14], [cx, y + h - 17], [cx + 5, y + h - 14]], P.tile);
    c.set(Math.round(cx), y + h - 18, P.gold);
  },
};
