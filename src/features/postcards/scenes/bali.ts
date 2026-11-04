import { bayer, rng, type PixelCanvas } from "../pixel/canvas";
import type { PostcardScene } from "../template";
import { W, H, sky, birds } from "./common";

/** Bali at sunset: Tanah Lot's meru shrines on a sea rock, surf, a split gate and palm silhouettes. */
const P = {
  sky: ["#3e4a86", "#7a5a8e", "#c9738a", "#f0a274", "#f8d08c"],
  sun: "#fbe2a6", sunCore: "#fff1c8",
  cloud: "#e98f80", cloudLight: "#f6b392",
  sea: "#56608f", seaLight: "#f2b07a", seaDark: "#3f4874", foam: "#f4e6d6",
  rock: "#4a3b3a", rockShade: "#33282a", rockLight: "#6a5250", moss: "#3f6b45",
  thatch: "#2c2a2e", thatchLight: "#46424a", shrine: "#8a5a45",
  silhouette: "#2e2a3c", silhouetteLight: "#3d3750",
};

function sunsetSky(c: PixelCanvas) {
  sky(c, P.sky, 80);
  c.disc(156, 70, 12, P.sun);
  c.disc(156, 70, 8, P.sunCore);
  // streaky sunset clouds across the sun
  for (const [x0, x1, y] of [[118, 200, 62], [130, 178, 58], [20, 80, 40], [36, 70, 36]] as const)
    for (let x = x0; x <= x1; x++) {
      c.set(x, y, P.cloud);
      if (x > x0 + 4 && x < x1 - 4) c.set(x, y - 1, P.cloudLight);
    }
}

function sea(c: PixelCanvas) {
  const r = rng(83);
  c.rect(0, 80, W, H - 80, P.sea);
  c.hline(0, W - 1, 80, P.seaLight);
  // the sun's glitter path
  for (let y = 81; y < H; y++) {
    const w = 6 + (y - 81) * 0.7;
    for (let x = Math.round(156 - w); x <= Math.round(156 + w); x++) if (bayer(x, y) < 0.42 - (y - 81) * 0.006 && (y % 2 === 0)) c.set(x, y, P.seaLight);
  }
  for (let i = 0; i < 40; i++) c.hline(Math.floor(r() * W), Math.floor(r() * W), 84 + Math.floor(r() * 24), P.seaDark);
}

function tanahLot(c: PixelCanvas, cx: number) {
  // sea rock: wide base, overhanging upper ledge
  for (let y = 58; y <= 96; y++) {
    const t = (y - 58) / 38;
    const hw = 22 + Math.sin(t * Math.PI) * 6 + (y > 88 ? (y - 88) * 1.6 : 0);
    for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) {
      const shade = x > cx + hw * 0.3;
      c.set(x, y, shade ? P.rockShade : bayer(x, y) < 0.15 ? P.rockLight : P.rock);
    }
  }
  // greenery on the top
  for (let x = cx - 24; x <= cx + 24; x++) for (let k = 0; k < 3; k++) if (bayer(x, 58 + k) < 0.7 - k * 0.25) c.set(x, 58 + k, P.moss);
  // meru shrines: stacked thatched roofs on small walls
  const meru = (mx: number, base: number, tiers: number, w0: number) => {
    c.rect(mx - 3, base - 5, 7, 5, P.shrine);
    let y = base - 5;
    for (let t = 0; t < tiers; t++) {
      const hw = w0 - t * (w0 / (tiers + 1));
      for (let k = 0; k < 3; k++) c.hline(Math.round(mx - hw + k), Math.round(mx + hw - k), y - k, k === 0 ? P.thatchLight : P.thatch);
      c.rect(mx - 1, y - 5, 3, 2, P.shrine);
      y -= 5;
    }
    c.rect(mx, y - 2, 1, 3, P.thatch);
  };
  meru(cx - 4, 58, 5, 11);
  meru(cx + 14, 58, 3, 7);
  // surf breaking around the foot of the rock
  const r = rng(85);
  for (let x = cx - 34; x <= cx + 34; x++) {
    const y = 95 + Math.round(Math.sin(x / 3) * 1.2);
    if (r() < 0.8) c.set(x, y, P.foam);
    if (r() < 0.4) c.set(x, y - 1, P.foam);
  }
}

/** Candi bentar: a stepped temple gate split in two, seen in silhouette. */
function splitGate(c: PixelCanvas, gx: number) {
  const half = (x0: number, dir: 1 | -1) => {
    for (let s = 0; s < 7; s++) {
      const y = 104 - s * 7, w = 14 - s * 1.5;
      for (let k = 0; k < 6; k++) {
        const xa = dir === 1 ? x0 : x0 - Math.round(w);
        c.hline(xa, xa + Math.round(w), y - k, k === 5 ? P.silhouetteLight : P.silhouette);
      }
    }
    c.rect(dir === 1 ? x0 : x0 - 1, 52, 2, 4, P.silhouette);
  };
  half(gx - 22, 1);
  half(gx + 22, -1);
  c.rect(gx - 30, 104, 60, 4, P.silhouette);
}

function palm(c: PixelCanvas, x: number, base: number, h: number, lean: number) {
  for (let y = base; y > base - h; y--) {
    const t = (base - y) / h;
    c.set(x + Math.round(lean * t * t * h * 0.3), y, P.silhouette);
    c.set(x + 1 + Math.round(lean * t * t * h * 0.3), y, P.silhouette);
  }
  const tx = x + Math.round(lean * h * 0.3), ty = base - h;
  for (let k = 0; k < 9; k++) {
    const a = Math.PI * 0.95 + (k / 8) * Math.PI * 1.1;
    for (let d = 1; d < 14; d++) c.set(tx + Math.round(Math.cos(a) * d), ty + Math.round(Math.sin(a) * d * 0.55 + d * d * 0.045), P.silhouette);
  }
}

export const baliScene: PostcardScene = {
  cityId: "bali",
  accent: "#c8582e",
  postmarkInk: "#f6e6cf",
  description: "Pixel-art view of Bali at sunset: Tanah Lot's thatched meru shrines on a rock in the sea with surf below, a split temple gate and palm trees in silhouette.",
  draw(c) {
    sunsetSky(c);
    sea(c);
    tanahLot(c, 92);
    splitGate(c, 30);
    palm(c, 196, 108, 52, 1);
    palm(c, 214, 108, 38, -1);
    // jukung outrigger boats with sails in silhouette, frigate birds, a pair walking by the gate
    for (const [bx, by, s] of [[136, 92, 1], [176, 98, 0.8]] as const) {
      const len = Math.round(22 * s);
      c.hline(bx, bx + len, by, P.silhouette);
      c.hline(bx + 2, bx + len - 2, by + 1, P.silhouette);
      c.hline(bx - 2, bx + len + 2, by + 3, P.silhouetteLight); // outrigger float
      c.set(bx + 3, by + 2, P.silhouette); c.set(bx + len - 3, by + 2, P.silhouette);
      c.polygon([[bx + len / 2, by - 1], [bx + len / 2, by - Math.round(14 * s)], [bx + len / 2 + Math.round(9 * s), by - 1]], P.silhouette);
    }
    birds(c, 480, 40, 20, 140, 50, 6, P.silhouette);
    for (const x of [62, 66]) { c.set(x, 99, P.silhouette); c.rect(x, 100, 1, 3, P.silhouette); c.set(x, 103, P.silhouette); }
  },
  drawStamp(c, x, y, w, h) {
    // frangipani flower on green
    c.rect(x, y, w, h, "#4f8a5a");
    const cx = x + w / 2 - 0.5, cy = y + h / 2;
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 - Math.PI / 2;
      c.disc(cx + Math.cos(a) * 3.5, cy + Math.sin(a) * 3.5, 2.6, "#fbf3e2");
    }
    c.disc(cx, cy, 2, "#f2c14e");
  },
};
