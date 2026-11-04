import { rng, bayer, type PixelCanvas } from "../pixel/canvas";
import type { PostcardScene } from "../template";
import { birds, people, rowboat, stoneLantern, lanternString } from "./common";

/** Tokyo: Mount Fuji over the skyline, Tokyo Tower, cherry blossom, a red bridge over the pond. */
const P = {
  sky: ["#4c5f8e", "#5f73a0", "#7a8db4", "#9eadca", "#c2cad9"],
  cloud: "#e8e4dc", cloudShade: "#cfd2dc",
  fuji: "#5d7299", fujiShade: "#4a5b82", snow: "#f6f0e2", snowShade: "#c6cbdf",
  hillFar: "#9db59b", hillFarDark: "#8aa58a", hill: "#76977c",
  city: "#7c9898", cityDark: "#648082", window: "#b3c9c3",
  tree: "#3e604f", treeLight: "#56795f", treeDark: "#2c4740",
  red: "#c8432f", redDark: "#8f2c24", white: "#f4ecd8", deck: "#e9dfc7", glass: "#2f3a5c",
  water: "#6c97a0", waterLight: "#a9cac6", waterDark: "#527d88",
  branch: "#4a3431", pink: "#f0a2b1", pinkLight: "#fbd4db", pinkDark: "#d8778b",
};

const W = 224, H = 108;

function sky(c: PixelCanvas) {
  c.gradient(0, 74, P.sky, 0, W - 1);
  c.rect(0, 75, W, H - 75, P.sky.at(-1)!);
  // long thin clouds
  const cloud = (x0: number, x1: number, y: number, thick: number) => {
    for (let x = x0; x <= x1; x++) {
      const taper = Math.min(x - x0, x1 - x) / 6;
      const t = Math.min(thick, Math.max(1, Math.round(taper)));
      for (let k = 0; k < t; k++) c.set(x, y - k, k === 0 && t > 1 ? P.cloudShade : P.cloud);
    }
  };
  cloud(118, 176, 30, 2);
  cloud(132, 160, 27, 2);
  cloud(8, 52, 54, 2);
}

function fuji(c: PixelCanvas) {
  const cx = 94, peak = 22, base = 78;
  const half = (y: number) => 6 + 96 * Math.pow((y - peak) / (base - peak), 1.45);
  const snowLine = (x: number) => 37 + 3 * Math.sin(x * 0.85) + ((x * 7) % 4) - Math.abs(x - cx) * 0.06;
  for (let y = peak; y <= base; y++) {
    const hw = half(y);
    for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) {
      const ridge = cx + 2 + (y - peak) * 0.18 + Math.sin(y * 0.7) * 1.2;
      const shade = x > ridge;
      if (y < snowLine(x)) c.set(x, y, shade ? P.snowShade : P.snow);
      else {
        // soft dithered transition from snow-shade to rock just under the snow line
        const near = y - snowLine(x) < 2 && bayer(x, y) < 0.5;
        c.set(x, y, near ? (shade ? P.snowShade : P.snow) : shade ? P.fujiShade : P.fuji);
      }
    }
  }
  // flat crater rim
  c.hline(cx - 5, cx + 5, peak, P.snow);
  c.hline(cx - 3, cx + 2, peak - 1, P.snow);
  // ridge streaks in the snow
  for (const dx of [-14, -6, 9, 17]) for (let k = 0; k < 6; k++) c.set(cx + dx + Math.round(k * Math.sign(dx) * 0.6), 31 + k, P.snowShade);
}

function hills(c: PixelCanvas) {
  c.paint((x, y) => {
    const top = 70 + 3 * Math.sin(x / 13) + 2 * Math.sin(x / 4.3 + 1);
    if (y < top) return null;
    return y - top < 1 ? P.hillFarDark : bayer(x, y) < 0.12 ? P.hillFarDark : P.hillFar;
  }, 0, 60, W - 1, H - 1);
}

function skyline(c: PixelCanvas) {
  const r = rng(7);
  const blocks: [number, number, number][] = [ // x, width, top
    [36, 7, 80], [44, 5, 74], [50, 9, 70], [60, 6, 77], [67, 8, 66], [76, 5, 73], [82, 10, 62],
    [93, 6, 71], [100, 8, 67], [109, 5, 75], [115, 9, 69], [135, 7, 72], [143, 6, 78],
  ];
  for (const [x, w, top] of blocks) {
    c.rect(x, top, w, 92 - top, P.city);
    c.rect(x + w - 2, top, 2, 92 - top, P.cityDark); // shaded side
    for (let y = top + 2; y < 90; y += 3) for (let i = x + 1; i < x + w - 2; i += 2) if (r() < 0.55) c.set(i, y, P.window);
  }
  // Tokyo Skytree silhouette
  const sx = 127;
  c.rect(sx, 30, 1, 12, P.cityDark);
  for (let y = 42; y < 92; y++) {
    const hw = y < 52 ? 1 : y < 70 ? 1 + (y - 52) / 18 : 2 + (y - 70) / 10;
    c.hline(Math.round(sx - hw), Math.round(sx + hw), y, P.cityDark);
  }
  c.rect(sx - 3, 48, 7, 2, P.cityDark);
  c.rect(sx - 4, 57, 9, 3, P.cityDark);
  c.hline(sx - 3, sx + 3, 58, P.window);
}

function nearHills(c: PixelCanvas) {
  c.paint((x, y) => (y >= 86 + 2 * Math.sin(x / 9 + 1) + Math.sin(x / 3) ? P.hill : null), 0, 80, W - 1, H - 1);
}

function tokyoTower(c: PixelCanvas) {
  const cx = 166, top = 30, base = 99;
  const hw = (y: number) => 1.5 + 15 * Math.pow((y - top) / (base - top), 1.75);
  const whiteBands = [[30, 32], [44, 46], [52, 54], [70, 72], [84, 86]];
  const isWhite = (y: number) => whiteBands.some(([a, b]) => y >= a! && y <= b!);
  for (let y = top; y <= base; y++) {
    const w = hw(y);
    const l = Math.round(cx - w), rr = Math.round(cx + w);
    for (let x = l; x <= rr; x++) {
      const inner = Math.abs(x - cx) < w - 3.2;
      // open arch between the four legs near the ground
      if (y > 82 && Math.abs(x - cx) < w - 3.5 - (base - y) * 0.05 && !(y < 86)) continue;
      const edge = x === l || x === rr;
      const lattice = ((x + y) % 4 === 0 || (x - y + 400) % 4 === 0) && inner;
      const base_ = isWhite(y) ? P.white : P.red;
      c.set(x, y, edge ? P.redDark : lattice ? (isWhite(y) ? P.deck : P.redDark) : base_);
    }
  }
  // arch outline
  for (let y = 83; y <= base; y++) {
    const w = hw(y) - 3.5 - (base - y) * 0.05;
    c.set(Math.round(cx - w), y, P.redDark);
    c.set(Math.round(cx + w), y, P.redDark);
  }
  // antenna
  for (let y = 4; y < top; y++) {
    const thick = y > 18 ? 3 : 1;
    c.hline(cx - (thick >> 1), cx + (thick >> 1), y, Math.floor(y / 3) % 2 ? P.red : P.white);
  }
  // observation decks
  const deck = (y: number, extra: number, rows: number) => {
    const w = Math.round(hw(y) + extra);
    c.rect(cx - w, y - 1, w * 2 + 1, 1, P.redDark);
    c.rect(cx - w, y, w * 2 + 1, rows, P.deck);
    for (let x = cx - w + 1; x < cx + w; x += 2) c.set(x, y + 1, P.glass);
    c.rect(cx - w, y + rows, w * 2 + 1, 1, P.redDark);
  };
  deck(40, 2, 3);
  deck(61, 3, 4);
}

function trees(c: PixelCanvas) {
  const r = rng(42);
  for (let x = -4; x < W + 6; x += 6 + Math.floor(r() * 4)) {
    const rad = 4 + r() * 3.5;
    const cy = 96 - r() * 3;
    c.disc(x, cy, rad, P.tree);
    c.disc(x - 1.5, cy - 1.5, rad * 0.45, P.treeLight);
    for (let i = -rad; i < rad; i++) if (bayer(x + i, cy + rad) < 0.5) c.set(x + i, Math.round(cy + rad * 0.6), P.treeDark);
  }
}

function water(c: PixelCanvas) {
  const r = rng(99);
  c.rect(0, 100, W, H - 100, P.water);
  c.hline(0, W - 1, 100, P.waterDark);
  c.paint((x, y) => (bayer(x, y) < 0.25 && y === 101 ? P.waterDark : null), 0, 101, W - 1, 101);
  for (let i = 0; i < 40; i++) {
    const y = 102 + Math.floor(r() * 6), x = Math.floor(r() * W), len = 2 + Math.floor(r() * 6);
    c.hline(x, x + len, y, P.waterLight);
  }
  // tower reflection: dithered red streaks under the tower
  for (let y = 102; y < H; y++) {
    const w = 6 - (y - 102) * 0.6;
    for (let x = Math.round(166 - w); x <= Math.round(166 + w); x++) if (bayer(x, y) < 0.35 && (y & 1)) c.set(x, y, P.redDark);
  }
}

function bridge(c: PixelCanvas) {
  const x0 = 24, x1 = 78, baseY = 101, rise = 8;
  const arc = (x: number) => baseY - rise * Math.sin((Math.PI * (x - x0)) / (x1 - x0));
  for (let x = x0; x <= x1; x++) {
    const y = Math.round(arc(x));
    c.set(x, y, P.red);
    c.set(x, y + 1, P.red);
    c.set(x, y + 2, P.redDark);
    c.set(x, y - 4, P.red); // hand rail
    if ((x - x0) % 6 === 0) for (let k = 1; k < 4; k++) c.set(x, y - k, P.red); // posts
    // reflection
    const ry = Math.round(2 * baseY + 2 - y);
    for (const yy of [ry, ry + 1]) if (yy < H && yy > baseY + 1 && bayer(x, yy) < 0.6) c.set(x, yy, P.redDark);
  }
}

function blossoms(c: PixelCanvas) {
  const limbs: [number, number][][] = [
    [[-2, 3], [10, 7], [22, 9], [34, 14], [46, 17], [56, 18]],
    [[14, 8], [20, 2], [24, -1]],
    [[28, 11], [32, 20], [31, 27]],
    [[40, 15], [47, 24]],
  ];
  limbs.forEach((pts, i) => c.polyline(pts, P.branch, i === 0 ? 2 : 1));
  const flower = (x: number, y: number) => {
    c.disc(x, y, 1.6, P.pink);
    c.set(x, y, P.pinkLight);
    c.set(x + 1, y + 1, P.pinkDark);
  };
  const spots: [number, number][] = [
    [8, 5], [12, 10], [17, 6], [21, 3], [25, 1], [26, 9], [30, 13], [33, 18], [29, 22], [33, 26],
    [37, 12], [41, 17], [45, 21], [48, 25], [50, 16], [55, 20], [58, 16], [4, 9], [19, 12], [36, 21],
  ];
  spots.forEach(([x, y]) => flower(x, y));
  // drifting petals
  const r = rng(3);
  for (let i = 0; i < 7; i++) {
    const x = Math.floor(10 + r() * 60), y = Math.floor(24 + r() * 26);
    c.set(x, y, P.pink);
    if (r() < 0.5) c.set(x + 1, y, P.pinkLight);
  }
}

export const tokyoScene: PostcardScene = {
  cityId: "tokyo",
  accent: "#b83a2b",
  windowFocus: [150, 56],
  description: "Pixel-art view of snow-capped Mount Fuji above the Tokyo skyline and Skytree, red-and-white Tokyo Tower, a cherry blossom branch and a red arched bridge over a pond.",
  draw(c) {
    sky(c);
    fuji(c);
    hills(c);
    skyline(c);
    nearHills(c);
    tokyoTower(c);
    trees(c);
    water(c);
    bridge(c);
    blossoms(c);
    // city life: festival lanterns, stone lanterns, boats, people crossing the bridge, crows
    lanternString(c, 84, 148, 86, 3, ["#c8432f", "#f4ecd8", "#c8432f"]);
    stoneLantern(c, 90, 100);
    stoneLantern(c, 12, 100);
    rowboat(c, 100, 104, 14, "#8f2c24", "#c8432f", "#2f3a5c");
    rowboat(c, 192, 105, 12, "#6e4c3a", "#a8784a", "#f4ecd8");
    for (const [x, sd] of [[36, 1], [45, 2], [57, 3], [66, 4]] as const) {
      const y = Math.round(101 - 8 * Math.sin((Math.PI * (x - 24)) / 54)) - 1;
      people(c, 400 + sd, y, x, x, 1, ["#2f3a5c", "#c8432f", "#f4ecd8", "#e2b84a"]);
    }
    birds(c, 405, 60, 8, 140, 20, 5, "#3a4466");
  },
  drawStamp(c, x, y, w, h) {
    // rising sun over a tiny Fuji
    c.rect(x, y, w, h, "#f3e6c9");
    c.disc(x + w / 2, y + h / 2 - 2, 5, P.red);
    const cx = x + w / 2, by = y + h - 1;
    for (let k = 0; k < 7; k++) c.hline(Math.round(cx - 2 - k * 1.4), Math.round(cx + 2 + k * 1.4), by - 6 + k, k < 2 ? P.snow : P.fujiShade);
  },
};
