import { bayer, rng, type PixelCanvas } from "../pixel/canvas";
import type { PostcardScene } from "../template";
import { W, H, cloud, foliage, ridge, roof, sky, treeRow, birds, people, lanternString } from "./common";

/** Seoul: granite Bukhansan peaks, Namsan with N Seoul Tower, a palace hall, spring forsythia and cherry. */
const P = {
  sky: ["#557099", "#6f8bb8", "#9bb0d0", "#d4c8c6", "#edd6b9"],
  cloud: "#efe7dc", cloudShade: "#d6d2d6",
  granite: "#8a95b0", graniteCrest: "#6f7a98", graniteLight: "#a7b0c7",
  hill: "#7f9e85", namsan: "#5f8a6a", namsanCrest: "#4f775b", namsanLight: "#73a07c",
  tower: "#eee8da", towerShade: "#c9c2b4", glass: "#3a4466", red: "#c8432f",
  city: "#8796a0", cityDark: "#6e7d89", window: "#bcc7c8",
  tile: "#3d4560", eave: "#262c42", tileLine: "#566080",
  green: "#3e8a6c", dancheongRed: "#c4473a", dancheongWhite: "#efe6cf",
  pillar: "#a8382b", interior: "#4b3330", lattice: "#c9a35a",
  stone: "#d4cab4", stoneShade: "#b6ab93", court: "#ddd4c0", courtDither: "#c7bca6",
  tree: "#4e7a5a", treeLight: "#6a9672", treeDark: "#38594a",
  forsythia: ["#e2ae2c", "#f6d866", "#b8861c", "#fbe9a0"],
  cherry: ["#eea3b3", "#fbd4db", "#cf6f84", "#ffffff"],
};

function peaks(c: PixelCanvas) {
  const top = (x: number) =>
    60 - Math.max(0, 22 - Math.abs(x - 34) * 0.75) - Math.max(0, 15 - Math.abs(x - 72) * 0.6)
    - Math.max(0, 9 - Math.abs(x - 204) * 0.45) + 2 * Math.sin(x / 3) + Math.sin(x / 1.7);
  ridge(c, top, P.granite, P.graniteCrest, P.graniteLight, 0.18);
  // granite streaks on the big peak
  for (const [x0, y0] of [[30, 42], [36, 44], [41, 48], [68, 50]] as const)
    for (let k = 0; k < 7; k++) c.set(x0 + Math.round(k * 0.4), y0 + k, P.graniteLight);
  ridge(c, (x) => 71 + 3 * Math.sin(x / 11) + Math.sin(x / 4), P.hill);
}

function namsanAndTower(c: PixelCanvas) {
  const cx = 150;
  ridge(c, (x) => (Math.abs(x - cx) < 44 ? 60 + ((x - cx) / 32) ** 2 * 13 : 200), P.namsan, P.namsanCrest, P.namsanLight, 0.15);
  // shaft with a flared base
  for (let y = 36; y <= 61; y++) {
    const hw = y > 55 ? 1 + (y - 55) * 0.45 : 1;
    for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) c.set(x, y, x > cx ? P.towerShade : P.tower);
  }
  // observation pod
  c.hline(cx - 4, cx + 4, 28, P.towerShade);
  c.rect(cx - 5, 29, 11, 5, P.tower);
  for (let x = cx - 4; x <= cx + 4; x += 2) c.set(x, 31, P.glass);
  c.rect(cx + 3, 29, 2, 5, P.towerShade);
  c.hline(cx - 4, cx + 4, 34, P.towerShade);
  c.hline(cx - 3, cx + 3, 35, P.towerShade);
  // antenna
  for (let y = 10; y < 28; y++) {
    const w = y > 21 ? 1 : 0;
    c.hline(cx - w, cx + w, y, Math.floor(y / 3) % 2 ? P.red : P.tower);
  }
}

function city(c: PixelCanvas) {
  const r = rng(11);
  const blocks: [number, number, number][] = [
    [112, 7, 78], [120, 6, 74], [127, 9, 80], [171, 8, 76], [180, 6, 72], [187, 10, 79], [198, 7, 75], [206, 9, 81], [216, 8, 77],
  ];
  for (const [x, w, t] of blocks) {
    c.rect(x, t, w, 92 - t, P.city);
    c.rect(x + w - 2, t, 2, 92 - t, P.cityDark);
    for (let y = t + 2; y < 90; y += 3) for (let i = x + 1; i < x + w - 2; i += 2) if (r() < 0.5) c.set(i, y, P.window);
  }
  treeRow(c, 5, 94, P.tree, P.treeLight, P.treeDark, 104, W + 6);
}

function palace(c: PixelCanvas) {
  const cx = 60;
  // stone terrace
  c.rect(10, 96, 102, 7, P.stone);
  c.hline(10, 111, 96, P.stoneShade);
  for (let x = 14; x < 110; x += 8) c.set(x, 99, P.stoneShade);
  c.hline(10, 111, 102, P.stoneShade);
  // hall body: dark interior, golden lattice doors, red pillars
  c.rect(18, 84, 85, 12, P.interior);
  for (let bay = 0; bay < 7; bay++) {
    const x0 = 19 + bay * 12;
    for (let y = 86; y < 95; y++) for (let x = x0 + 2; x < x0 + 10; x++) if ((x + y) % 2 === 0 && bay > 0 && bay < 6) c.set(x, y, P.lattice);
  }
  for (let i = 0; i <= 7; i++) c.rect(18 + i * 12, 84, 2, 12, P.pillar);
  // dancheong band under the lower eave
  const band = (y0: number, x0: number, x1: number) => {
    c.rect(x0, y0, x1 - x0 + 1, 3, P.green);
    for (let x = x0 + 1; x < x1; x += 4) { c.set(x, y0 + 1, P.dancheongRed); c.set(x + 2, y0 + 1, P.dancheongWhite); }
  };
  band(81, 18, 104);
  // double-eaved roof
  roof(c, cx, 72, 9, 40, 56, P.tile, P.eave, P.tileLine);
  band(69, 30, 90);
  roof(c, cx, 59, 10, 22, 40, P.tile, P.eave, P.tileLine);
  // ridge ornaments (chwidu)
  c.rect(cx - 23, 56, 2, 3, P.eave);
  c.rect(cx + 22, 56, 2, 3, P.eave);
}

function foreground(c: PixelCanvas) {
  c.paint((x, y) => (bayer(x, y) < 0.15 ? P.courtDither : P.court), 0, 103, W - 1, H - 1);
  for (let x = 0; x < W; x += 9) c.set(x, 105, P.stoneShade);
  foliage(c, 21, 212, 94, 13, P.forsythia);
  foliage(c, 22, 194, 99, 8, P.forsythia);
  foliage(c, 23, 120, 96, 9, P.cherry);
  foliage(c, 24, 4, 96, 9, P.cherry);
}

export const seoulScene: PostcardScene = {
  cityId: "seoul",
  accent: "#2f4f8f",
  description: "Pixel-art view of Seoul with granite Bukhansan peaks, N Seoul Tower on green Namsan, a double-roofed palace hall with painted dancheong, and spring forsythia and cherry blossom.",
  draw(c) {
    sky(c, P.sky);
    cloud(c, 98, 140, 24, P.cloud, P.cloudShade);
    cloud(c, 160, 196, 46, P.cloud, P.cloudShade);
    peaks(c);
    namsanAndTower(c);
    city(c);
    palace(c);
    foreground(c);
    // Namsan cable car, lotus lanterns across the courtyard, visitors in hanbok, magpies
    c.line(198, 86, 158, 63, "#3a4466");
    c.rect(176, 74, 5, 4, "#c8432f");
    c.hline(176, 180, 74, "#e9e1d0");
    c.set(178, 73, "#3a4466");
    lanternString(c, 6, 112, 97, 2, ["#e8607e", "#f2c14e", "#4f9a6a", "#e8607e", "#3a5a9a"]);
    people(c, 410, 107, 10, 200, 14, ["#e8607e", "#f2c14e", "#4f9a6a", "#3a5a9a", "#f3ead8", "#c8432f"]);
    birds(c, 411, 40, 18, 120, 34, 5, "#2f3346");
  },
  drawStamp(c, x, y, w, h) {
    c.rect(x, y, w, h, "#f3e6c9");
    const cx = x + w / 2 - 0.5, cy = y + h / 2 - 0.5, r = 6;
    c.paint((px, py) => {
      const dx = px - cx, dy = py - cy;
      if (dx * dx + dy * dy > r * r + 2) return null;
      return dy < Math.sin((dx / r) * Math.PI) * -2 ? "#c8432f" : "#2f4f8f";
    }, x, y, x + w - 1, y + h - 1);
  },
};
