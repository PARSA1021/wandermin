import { bayer, rng, type PixelCanvas } from "../pixel/canvas";
import type { PostcardScene } from "../template";
import { W, H, birds, cloud, leaf, sky } from "./common";

/** Jeju in spring: Seongsan Ilchulbong's ridged crater rising from the sea, yellow canola fields, black basalt walls, a dolharubang. */
const P = {
  sky: ["#5d8fd0", "#83aede", "#b2cde8", "#dbe6ec", "#f2eedc"],
  cloud: "#fbfaf4", cloudShade: "#d8e2ea",
  halla: "#93a8b8", hallaSnow: "#eef2f4",
  sea: "#2e86b0", seaLight: "#8fd2e2", seaDark: "#22688e", foam: "#f4f8f6",
  cone: "#6f8a4e", coneLight: "#8faa5e", coneDark: "#4f6a3a", rib: "#5a7442", cliff: "#8a7a62", cliffDark: "#6a5c4a", cliffLight: "#a8977a",
  grass: "#7aa84a", grassLight: "#9ac45a", grassDark: "#5a8a3a",
  canola: "#f6d33a", canolaLight: "#fbe77a", canolaDark: "#d8a82a", stem: "#6a9a3a",
  basalt: "#4a4744", basaltLight: "#6e6a64", basaltHole: "#2a2826",
  roof: "#e86a3a", roofDark: "#b8502a", wall: "#efe8d8", wallShade: "#cfc6b2",
  tangerine: "#f2902a", tangerineLeaf: "#3f7a3a",
};

function hallasan(c: PixelCanvas) {
  // the island's shield volcano, a long low silhouette far away on the left
  c.paint((x, y) => {
    const t = 50 + Math.pow(Math.abs(x - 46) / 46, 1.6) * 22;
    if (y < t || y > 70) return null;
    return y - t < 2 && Math.abs(x - 46) < 10 ? P.hallaSnow : P.halla;
  }, 0, 40, 110, 70);
}

function sea(c: PixelCanvas) {
  c.rect(0, 64, W, 20, P.sea);
  const r = rng(212);
  for (let i = 0; i < 46; i++) {
    const y = 66 + Math.floor(r() * 16), x = Math.floor(r() * W), len = 2 + Math.floor(r() * 6);
    c.hline(x, x + len, y, r() < 0.6 ? P.seaLight : P.seaDark);
  }
}

function seongsan(c: PixelCanvas) {
  // the tuff cone seen from the land side: a bowl-shaped crown whose rim is ringed by rocky pinnacles,
  // ribbed grassy flanks sloping into sea cliffs, and the low grassy neck joining it to the island on the left
  const cx = 160, rimY = 30, rimHalf = 26, base = 74;
  const rimTop = (x: number) => {
    const dx = x - cx;
    // jagged crown: pinnacles around the rim, higher towards the edges like the real crater wall
    const crown = (Math.abs(dx) / rimHalf) * -3 + ((x * 7) % 5 === 0 ? -3 : (x * 3) % 4 === 0 ? -1.5 : 0);
    return rimY + crown + Math.pow(Math.abs(dx) / rimHalf, 4) * 2;
  };
  c.paint((x, y) => {
    const dx = Math.abs(x - cx);
    const top = dx <= rimHalf ? rimTop(x) : rimY + (dx - rimHalf) * (x < cx ? 1.25 : 1.6) + Math.sin(x / 2.1);
    if (y < top || y > base) return null;
    const d = y - top;
    if (dx <= rimHalf && d < 3) return (x * 7) % 5 === 0 ? P.cliffLight : d < 1 ? P.cliffLight : P.cliff; // rocky rim
    if (y > base - 8 - Math.sin(x / 5) * 2) return leaf(x, y) < 0.3 ? P.cliffLight : leaf(x, y) > 0.75 ? P.cliffDark : P.cliff; // sea cliffs
    const ribPhase = Math.round((x - cx) * 0.8 + (y - rimY) * Math.sign(x - cx) * 0.35);
    const rib = ((ribPhase % 5) + 5) % 5 === 0;
    if (x > cx + 8) return rib ? P.coneDark : leaf(x, y) < 0.2 ? P.cone : P.rib;
    if (rib) return P.rib;
    return leaf(x, y) < 0.22 ? P.coneLight : P.cone;
  }, cx - rimHalf - 50, rimY - 8, cx + rimHalf + 40, base);
  // the grassy neck (Seongsan village side) sloping down to the left, with the visitors' trail
  c.paint((x, y) => {
    const t = 60 + (cx - rimHalf - 6 - x) * 0.18;
    return x < cx - rimHalf - 6 && x > 84 && y >= t && y <= base ? (leaf(x, y) < 0.22 ? P.coneLight : P.cone) : null;
  }, 84, 50, cx, base);
  for (let k = 0; k < 14; k++) c.set(cx - rimHalf - 12 + k * 2, 64 - k * 2, P.cliffLight);
  for (let x = cx - rimHalf - 40; x < cx + rimHalf + 40; x++) if (bayer(x, 74) < 0.5) c.set(x, 75, P.foam);
}

function shore(c: PixelCanvas) {
  // the land the village sits on
  c.paint((x, y) => (y >= 78 + Math.sin(x / 9) ? (leaf(x, y) < 0.25 ? P.grassLight : P.grass) : null), 0, 76, W - 1, 86);
}

function village(c: PixelCanvas) {
  // low houses with bright orange roofs between the fields and the sea
  for (const [x, w] of [[8, 14], [26, 12], [46, 16], [70, 12], [196, 14]] as const) {
    c.rect(x, 78, w, 6, P.wall);
    c.rect(x + w - 3, 78, 3, 6, P.wallShade);
    for (let k = 0; k < 3; k++) c.hline(x - 1 + k, x + w - k, 77 - k, k === 0 ? P.roofDark : P.roof);
    c.rect(x + 3, 80, 2, 4, P.basalt);
  }
  // tangerine trees between houses
  for (const x of [40, 64, 88, 190, 214]) {
    c.disc(x, 80, 3.5, P.tangerineLeaf);
    for (const [dx, dy] of [[-1, -1], [2, 0], [0, 2]] as const) c.set(x + dx, 80 + dy, P.tangerine);
  }
}

function canolaField(c: PixelCanvas) {
  c.paint((x, y) => {
    const top = 84 + Math.sin(x / 13) * 1.5;
    if (y < top) return null;
    const l = leaf(x * 2, y * 2);
    // rows of flowers getting bigger towards the viewer
    if (y > 96 && (x + Math.floor(y / 3)) % 4 === 0 && bayer(x, y) < 0.5) return P.stem;
    if (l < 0.25) return P.canolaLight;
    if (l > 0.8) return P.canolaDark;
    if (y < top + 2) return P.grass;
    return P.canola;
  }, 0, 82, W - 1, H - 1);
  // foreground blossoms
  const r = rng(555);
  for (let i = 0; i < 40; i++) {
    const x = Math.floor(r() * W), y = 98 + Math.floor(r() * 9);
    c.set(x, y, P.canolaLight); c.set(x + 1, y, P.canola); c.set(x, y + 1, P.canolaDark); c.set(x, y + 2, P.stem);
  }
}

function basaltWall(c: PixelCanvas, x0: number, x1: number, base: number) {
  // Jeju's dry-stacked black lava-stone wall: a continuous band of rounded stones in staggered courses,
  // dark gaps between them, a lumpy top edge, porous highlights
  const height = 7;
  for (let x = x0; x < x1; x++) {
    const top = base - height + ((Math.floor(x / 5) * 7) % 3 === 0 ? -1 : 0);
    for (let y = top; y <= base; y++) {
      const row = Math.floor((base - y) / 3);
      const off = row % 2 ? 3 : 0;
      const sx = (x + off + row * 2) % 6, sy = (base - y) % 3;
      const gap = sx === 0 || (sy === 2 && (x + row) % 4 !== 0);
      const hi = (sx === 1 && sy === 1) || y === top;
      c.set(x, y, gap ? P.basaltHole : hi ? P.basaltLight : leaf(x, y) < 0.2 ? P.basaltLight : P.basalt);
    }
  }
}

function dolharubang(c: PixelCanvas, x: number, base: number) {
  // the island's stone grandfather: brimmed hat, bulging eyes, big nose, hands on the belly
  const S = P.basalt, L = P.basaltLight, D = P.basaltHole;
  c.rect(x - 4, base - 4, 9, 4, S); // plinth
  c.rect(x - 3, base - 18, 7, 14, S); // body
  c.rect(x - 4, base - 26, 9, 8, S); // head
  c.hline(x - 5, x + 5, base - 26, L); c.rect(x - 3, base - 30, 7, 4, S); c.hline(x - 2, x + 2, base - 31, L); // hat
  c.set(x - 2, base - 23, D); c.set(x + 2, base - 23, D); // eyes
  c.set(x - 2, base - 24, L); c.set(x + 2, base - 24, L);
  c.rect(x, base - 22, 1, 3, L); // nose
  c.hline(x - 1, x + 1, base - 19, D); // mouth
  c.hline(x - 3, x, base - 12, L); c.hline(x + 1, x + 3, base - 10, L); // hands, one above the other
  for (let y = base - 18; y < base - 4; y++) if (bayer(x, y) < 0.3) c.set(x + 3, y, D);
}

export const jejuScene: PostcardScene = {
  cityId: "jeju",
  accent: "#e8862a",
  windowFocus: [150, 50],
  description: "Pixel-art view of Jeju Island in spring: Seongsan Ilchulbong's flat-topped, ribbed volcanic crater rising from a blue sea with cliffs and surf, Hallasan faint in the distance, orange-roofed village houses and tangerine trees, a sea of yellow canola flowers, black basalt stone walls and a dolharubang stone statue.",
  draw(c) {
    sky(c, P.sky, 64);
    cloud(c, 18, 70, 14, P.cloud, P.cloudShade, 3);
    cloud(c, 96, 128, 22, P.cloud, P.cloudShade);
    cloud(c, 190, 220, 10, P.cloud, P.cloudShade);
    birds(c, 77, 90, 10, 130, 22, 4, "#3a4a5a");
    hallasan(c);
    sea(c);
    seongsan(c);
    shore(c);
    village(c);
    canolaField(c);
    basaltWall(c, -2, 118, 107);
    dolharubang(c, 196, 106);
  },
  drawStamp(c, x, y, w, h) {
    c.gradient(y, y + h - 1, [P.sky[1]!, P.sky[3]!], x, x + w - 1);
    const cx = x + Math.floor(w / 2);
    for (let k = 0; k < 7; k++) c.hline(cx - 5 - k, cx + 5 + k, y + 5 + k, k === 0 ? P.coneLight : P.cone);
    c.rect(x, y + 12, w, 2, P.sea);
    c.rect(x, y + 14, w, h - 14, P.canola);
  },
};
