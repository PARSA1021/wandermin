import { bayer, type PixelCanvas } from "../pixel/canvas";
import type { PostcardScene } from "../template";
import { W, H, birds, people, sky } from "./common";

/** Agra at dawn: the Taj Mahal with its dome, chhatris and four minarets, the long reflecting pool and cypress rows. */
const P = {
  sky: ["#6a7ab8", "#a890c0", "#e8a8b0", "#f6c8a8", "#f9e2c0"],
  sun: "#fbe2b0",
  marble: "#f6efe6", marbleShade: "#dcd0c4", marbleDeep: "#c0b0a4", marbleLight: "#fffaf2", marbleWarm: "#f3ddd0",
  inlay: "#b8a49a", arch: "#c8b4a8", archDeep: "#9a8478", finial: "#d8b060",
  redstone: "#b85a3a", redLight: "#d07a52", redDark: "#8a3e28",
  pool: "#7aa0c8", poolLight: "#f2dcd8", poolDark: "#5a80a8",
  stone: "#e8d8c0", stoneShade: "#c8b49a",
  cypress: "#2f5a3a", cypressLight: "#4a7a4a", lawn: "#6a9a4a", lawnLight: "#8ab45a", lawnDark: "#4f7a3a",
  coats: ["#e8483a", "#f2c14e", "#3a78c8", "#e88aa0", "#f3f0e6", "#7a4ab0"],
};

const CX = 112;

function minaret(c: PixelCanvas, x: number, top: number, base: number) {
  // slightly tapering shaft in three stages with balconies, topped by a small chhatri
  for (let y = top + 6; y < base; y++) {
    const half = 2 + (y - top) / (base - top) * 0.8;
    for (let i = Math.round(x - half); i <= Math.round(x + half); i++) c.set(i, y, i > x ? P.marbleShade : (y % 4 === 0 ? P.marbleWarm : P.marble));
  }
  for (const by of [top + 14, top + 26, top + 6]) c.hline(x - 3, x + 3, by, P.marbleDeep);
  c.rect(x - 2, top + 2, 5, 4, P.marble);
  for (const px of [x - 2, x + 2]) c.set(px, top + 4, P.archDeep);
  c.hline(x - 3, x + 3, top + 1, P.marbleShade);
  c.disc(x, top, 2, P.marble);
  c.set(x, top - 3, P.finial);
}

function mausoleum(c: PixelCanvas) {
  const base = 74;
  // raised plinth
  c.rect(CX - 52, base - 4, 105, 4, P.marbleShade);
  c.hline(CX - 52, CX + 52, base - 4, P.marbleLight);
  for (let x = CX - 50; x < CX + 52; x += 6) c.rect(x, base - 3, 3, 2, P.marbleDeep);
  // main block with chamfered corners
  const bx0 = CX - 30, bx1 = CX + 30, by = 46;
  c.rect(bx0, by, bx1 - bx0 + 1, base - 4 - by, P.marble);
  c.rect(bx1 - 6, by, 7, base - 4 - by, P.marbleShade);
  c.rect(bx0, by, 6, base - 4 - by, P.marbleShade);
  c.hline(bx0, bx1, by, P.marbleLight);
  // central iwan: a tall pointed arch framed by a rectangular pishtaq with inlay border
  c.rect(CX - 9, by - 4, 19, base - 4 - by + 4, P.marble);
  c.hline(CX - 9, CX + 9, by - 4, P.marbleLight);
  for (let y = by - 2; y < base - 4; y++) { c.set(CX - 8, y, P.inlay); c.set(CX + 8, y, P.inlay); }
  c.hline(CX - 8, CX + 8, by - 2, P.inlay);
  for (let y = by + 1; y < base - 4; y++) {
    const t = Math.max(0, (by + 9 - y) / 9);
    const half = Math.round(5 * Math.sqrt(1 - t * t));
    c.hline(CX - half, CX + half, y, y > base - 14 ? P.archDeep : P.arch);
  }
  c.set(CX, by + 1, P.archDeep);
  // smaller stacked arches on the wings
  for (const ax of [CX - 21, CX - 14, CX + 14, CX + 21]) {
    for (const ay of [by + 6, by + 16]) {
      c.rect(ax - 2, ay, 5, 7, P.arch);
      c.set(ax - 2, ay, P.marble); c.set(ax + 2, ay, P.marble);
      c.hline(ax - 1, ax + 1, ay + 6, P.archDeep);
    }
  }
  // corner chhatris on the roof
  for (const cx2 of [CX - 25, CX + 25]) {
    c.rect(cx2 - 4, by - 6, 9, 6, P.marble);
    for (const px of [cx2 - 3, cx2, cx2 + 3]) c.rect(px, by - 4, 1, 3, P.archDeep);
    c.disc(cx2, by - 9, 4, P.marble);
    c.disc(cx2 + 1, by - 9, 2.5, P.marbleShade);
    c.set(cx2, by - 14, P.finial);
  }
  // drum and the great onion dome with its lotus crown and finial
  c.rect(CX - 14, by - 10, 29, 10, P.marble);
  c.rect(CX + 8, by - 10, 7, 10, P.marbleShade);
  c.hline(CX - 14, CX + 14, by - 10, P.marbleLight);
  for (let y = 8; y < by - 10; y++) {
    const t = (y - 8) / (by - 18);
    const half = 16 * Math.sin(Math.min(1, t * 1.15) * Math.PI * 0.62) * (t < 0.15 ? t / 0.15 * 0.3 + 0.7 : 1);
    for (let x = Math.round(CX - half); x <= Math.round(CX + half); x++) {
      const lit = x < CX - half * 0.2;
      c.set(x, y, lit ? (bayer(x, y) < 0.15 ? P.marbleLight : P.marble) : x > CX + half * 0.55 ? P.marbleDeep : P.marbleShade);
    }
  }
  for (let k = 0; k < 4; k++) c.hline(CX - 3 + k, CX + 3 - k, 8 - k, P.marbleShade);
  // the gilded finial: stacked knobs on a spire, crowned by a small crescent (no cross-bar)
  c.rect(CX, 3, 1, 5, P.finial);
  c.set(CX - 1, 5, P.finial); c.set(CX + 1, 5, P.finial);
  c.set(CX - 1, 1, P.finial); c.set(CX + 1, 1, P.finial); c.set(CX - 1, 0, P.finial); c.set(CX + 1, 0, P.finial); c.set(CX, 2, P.finial);
}

function gardens(c: PixelCanvas) {
  // lawns, the marble walkways and the long central pool reflecting the dome
  c.paint((x, y) => (bayer(x, y) < 0.15 ? P.lawnLight : y > 96 ? P.lawnDark : P.lawn), 0, 74, W - 1, H - 1);
  c.paint((x, y) => {
    const half = 6 + (y - 74) * 0.55;
    const d = Math.abs(x - CX);
    if (d > half + 4) return null;
    if (d > half) return y % 2 ? P.stone : P.stoneShade;
    // reflection: the dome's silhouette upside down, softened
    const ry = 74 + (74 - y);
    const inDome = ry > 8 && ry < 70 && d < (ry < 36 ? 14 : 30);
    if (y % 3 === 0 && bayer(x, y) < 0.4) return P.poolLight;
    return inDome && bayer(x, y) < 0.55 ? P.poolLight : bayer(x, y) < 0.1 ? P.poolDark : P.pool;
  }, 0, 74, W - 1, H - 1);
  // cypress rows flanking the pool, shrinking with distance
  for (let k = 0; k < 7; k++) {
    const y = 80 + k * 4, off = 18 + k * 7, h = 6 + k * 2;
    for (const sx of [-1, 1]) {
      const x = CX + sx * off;
      for (let j = 0; j < h; j++) {
        const hw = Math.max(0, Math.round((j / h) * 1.6 + 0.3));
        c.hline(x - hw, x + hw, y - h + j, j % 3 === 0 ? P.cypressLight : P.cypress);
      }
    }
  }
  people(c, 919, 104, 20, 80, 6, P.coats, "#b07a52");
  people(c, 920, 104, 144, 206, 6, P.coats, "#b07a52");
}

function gateway(c: PixelCanvas) {
  // the red-sandstone side buildings on the horizon: the mosque and its jawab
  for (const [x0, x1] of [[2, 44], [180, 222]] as const) {
    c.rect(x0, 62, x1 - x0, 12, P.redstone);
    c.hline(x0, x1 - 1, 62, P.redLight);
    for (let x = x0 + 3; x < x1 - 3; x += 6) { c.rect(x, 66, 3, 6, P.redDark); c.set(x + 1, 65, P.redDark); }
    const mid = Math.round((x0 + x1) / 2);
    c.disc(mid, 60, 5, P.marble); c.disc(mid + 2, 60, 3, P.marbleShade);
    c.disc(mid - 12, 61, 2.5, P.marble); c.disc(mid + 12, 61, 2.5, P.marble);
  }
}

export const agraScene: PostcardScene = {
  cityId: "agra",
  accent: "#c0584a",
  windowFocus: [112, 40],
  description: "Pixel-art view of the Taj Mahal in Agra at dawn: the white marble mausoleum with its great onion dome, central arched iwan, corner chhatris and four tapering minarets, red-sandstone mosque buildings on either side, the long reflecting pool mirroring the dome, rows of cypress trees, lawns and visitors in colourful clothes.",
  draw(c) {
    sky(c, P.sky, 74);
    c.disc(176, 40, 8, P.sun);
    birds(c, 222, 150, 12, 210, 28, 5, "#6a5a7a");
    gateway(c);
    minaret(c, CX - 46, 20, 72);
    minaret(c, CX + 46, 20, 72);
    mausoleum(c);
    gardens(c);
  },
  drawStamp(c, x, y, w, h) {
    c.gradient(y, y + h - 1, [P.sky[1]!, P.sky[3]!], x, x + w - 1);
    const cx = x + Math.floor(w / 2), base = y + h - 3;
    c.rect(cx - 7, base - 5, 15, 5, P.marble);
    c.disc(cx, base - 9, 4.5, P.marble);
    c.set(cx, y + 2, P.finial);
    for (const mx of [x + 2, x + w - 3]) c.rect(mx, base - 11, 1, 11, P.marble);
    c.rect(x, base, w, 3, P.lawn);
  },
};
