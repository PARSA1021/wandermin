import { bayer, rng, type PixelCanvas } from "../pixel/canvas";
import type { PostcardScene } from "../template";
import { W, H, birds, cloud, leaf, sky } from "./common";

/** Auckland, the City of Sails: the Sky Tower over the CBD, the Harbour Bridge, Rangitoto's volcanic cone, yachts, pōhutukawa. */
const P = {
  sky: ["#3a7ac0", "#5e98d4", "#8ebce4", "#c6dcec", "#eef0e6"],
  cloud: "#fbfaf4", cloudShade: "#cfdcea",
  rangitoto: "#5a7a5a", rangitotoLight: "#7a9a6a", rangitotoDark: "#4a6a4a",
  tower: "#e4e6ea", towerShade: "#b4b8c0", towerDeep: "#8a909c", pod: "#9aaec4", podLight: "#cfe0ec", mast: "#d8dce2",
  city: "#b8c4d0", cityShade: "#98a6b6", cityGlass: "#7aa0c4", cityWin: "#e6eef4",
  bridge: "#8a96a4", bridgeDark: "#6a7686",
  sea: "#2f7eae", seaLight: "#9ad0e4", seaDark: "#24658e",
  sail: "#fbfaf4", sailShade: "#d8dce2", hull: "#f3f0ea", hullDark: "#2f3346", spinnaker: ["#e8483a", "#f2c14e", "#2f8f6a"],
  pohutukawa: "#3f6a3a", pohutukawaLight: "#5a8a4a", flower: "#d8283a", flowerLight: "#f25a5a", trunk: "#6a5a4a",
  rock: "#8a7a6a", rockDark: "#6a5c50",
};

function rangitoto(c: PixelCanvas) {
  // the young shield volcano: a perfectly symmetric low cone with a small summit bump
  c.paint((x, y) => {
    const t = 50 + Math.pow(Math.abs(x - 48) / 50, 1.3) * 18 - (Math.abs(x - 48) < 4 ? 2 : 0);
    if (y < t || y > 70) return null;
    const l = leaf(x, y);
    return y - t < 1 ? P.rangitotoLight : l < 0.2 ? P.rangitotoLight : l > 0.8 ? P.rangitotoDark : P.rangitoto;
  }, 0, 40, 110, 70);
}

function cbd(c: PixelCanvas) {
  const r = rng(41);
  for (let x = 116; x < W; x += 5 + Math.floor(r() * 4)) {
    if (x > 150 && x < 162) continue;
    const t = 38 + Math.floor(r() * 26), w = 5 + Math.floor(r() * 5);
    const col = r() < 0.4 ? P.cityGlass : P.city;
    c.rect(x, t, w, 70 - t, col);
    c.rect(x + w - 2, t, 2, 70 - t, P.cityShade);
    for (let y = t + 2; y < 68; y += 2) for (let i = x + 1; i < x + w - 2; i += 2) if (r() < 0.5) c.set(i, y, P.cityWin);
  }
}

function skyTower(c: PixelCanvas) {
  // slender concrete shaft, the flared base, the multi-level pod, then the long mast
  const cx = 156, base = 70;
  for (let y = 26; y < base; y++) {
    const half = y > 62 ? 2 + (y - 62) * 0.4 : 2;
    for (let x = Math.round(cx - half); x <= Math.round(cx + half); x++) c.set(x, y, x > cx ? P.towerShade : P.tower);
  }
  // pod: stacked rings, glass bands
  const rings: [number, number, string][] = [[26, 4, P.towerShade], [24, 6, P.tower], [22, 7, P.pod], [21, 7, P.podLight], [19, 7, P.tower], [17, 6, P.pod], [15, 5, P.tower], [14, 4, P.towerShade]];
  for (const [y, hw, col] of rings) c.hline(cx - hw, cx + hw, y, col);
  for (const [y, hw] of rings) c.set(cx + hw, y, P.towerDeep);
  c.rect(cx, 0, 1, 14, P.mast);
  c.rect(cx - 1, 8, 3, 3, P.tower);
  c.set(cx, 0, "#e8483a");
}

function harbourBridge(c: PixelCanvas) {
  // the steel truss "coathanger" over the main span, on piers across the water
  const y0 = 64;
  c.rect(84, y0, 46, 2, P.bridge);
  c.hline(84, 129, y0 + 2, P.bridgeDark);
  for (let x = 88; x < 128; x += 8) c.rect(x, y0 + 2, 2, 6, P.bridgeDark);
  for (let x = 100; x <= 120; x++) {
    const t = (x - 100) / 20, y = Math.round(y0 - 1 - Math.sin(t * Math.PI) * 6);
    c.set(x, y, P.bridgeDark);
    if (x % 3 === 0) for (let yy = y + 1; yy < y0; yy++) c.set(x, yy, P.bridge);
  }
}

function harbour(c: PixelCanvas) {
  c.paint((x, y) => (y % 3 === 0 && bayer(x, y) < 0.3 ? P.seaLight : bayer(x, y) < 0.08 ? P.seaDark : P.sea), 0, 70, W - 1, H - 1);
  c.hline(0, W - 1, 70, P.seaDark);
}

function yacht(c: PixelCanvas, x: number, y: number, size: number, spin?: number) {
  const mastH = Math.round(18 * size);
  c.rect(x, y - mastH, 1, mastH, P.hullDark);
  for (let k = 0; k < mastH - 2; k++) {
    const w = Math.round((k / mastH) * 8 * size);
    c.hline(x + 1, x + w, y - mastH + 2 + k, (x + k) % 5 === 0 ? P.sailShade : P.sail); // mainsail
  }
  for (let k = 0; k < mastH - 6; k++) c.hline(x - Math.round((k / mastH) * 5 * size), x - 1, y - mastH + 6 + k, P.sail); // jib
  if (spin !== undefined) {
    // a coloured spinnaker billowing ahead of the mast, attached at the masthead
    const col = P.spinnaker[spin % P.spinnaker.length]!;
    for (let k = 0; k < mastH - 4; k++) {
      const bulge = Math.round(Math.sin((k / (mastH - 4)) * Math.PI) * 5 * size);
      c.hline(x - 2 - bulge, x - 1, y - mastH + 2 + k, k % 4 === 0 ? P.sail : col);
    }
  }
  const len = Math.round(14 * size);
  c.hline(x - Math.round(len * 0.45), x + Math.round(len * 0.55), y, P.hull);
  c.hline(x - Math.round(len * 0.4), x + Math.round(len * 0.5), y + 1, P.hullDark);
  for (let i = -6; i < 8; i++) if (bayer(x + i, y + 2) < 0.4) c.set(x + i, y + 2, P.seaLight);
}

function pohutukawa(c: PixelCanvas) {
  // the "New Zealand Christmas tree" leaning over the water from a rocky shore, covered in red blossom
  c.paint((x, y) => (y > 98 + Math.sin(x / 5) * 2 && x < 70 ? (leaf(x, y) < 0.3 ? P.rock : P.rockDark) : null), 0, 94, 70, H - 1);
  c.line(14, 106, 26, 88, P.trunk); c.line(26, 88, 40, 80, P.trunk); c.line(22, 94, 10, 84, P.trunk);
  c.paint((x, y) => {
    const blobs: [number, number, number][] = [[40, 74, 14], [18, 78, 11], [58, 78, 9], [30, 68, 10]];
    if (!blobs.some(([bx, by, r]) => ((x - bx) / r) ** 2 + ((y - by) / (r * 0.6)) ** 2 <= 1)) return null;
    const l = leaf(x, y);
    if (l < 0.22) return P.flowerLight;
    if (l < 0.45) return P.flower;
    return l > 0.85 ? P.pohutukawa : P.pohutukawaLight;
  }, 0, 58, 76, 90);
}

export const aucklandScene: PostcardScene = {
  cityId: "auckland",
  accent: "#2f6ab0",
  windowFocus: [140, 34],
  description: "Pixel-art view of Auckland, the City of Sails: the Sky Tower's slender shaft, pod and mast above the CBD, the arched Harbour Bridge, the symmetric volcanic cone of Rangitoto Island, yachts with white sails and colourful spinnakers on the Waitematā Harbour, and a pōhutukawa tree in red bloom leaning over the water from a rocky shore.",
  draw(c) {
    sky(c, P.sky, 70);
    cloud(c, 60, 120, 12, P.cloud, P.cloudShade, 3);
    cloud(c, 170, 210, 26, P.cloud, P.cloudShade);
    cloud(c, 4, 30, 24, P.cloud, P.cloudShade);
    birds(c, 61, 70, 18, 120, 34, 5, "#3a4a5a");
    rangitoto(c);
    cbd(c);
    harbourBridge(c);
    skyTower(c);
    harbour(c);
    yacht(c, 96, 86, 1.1, 0);
    yacht(c, 140, 94, 1.3);
    yacht(c, 190, 84, 0.9, 1);
    yacht(c, 214, 100, 1.4, 2);
    yacht(c, 120, 78, 0.6);
    pohutukawa(c);
  },
  drawStamp(c, x, y, w, h) {
    c.gradient(y, y + h - 1, [P.sky[1]!, P.sky[3]!], x, x + w - 1);
    const cx = x + Math.floor(w / 2);
    c.rect(cx, y + 1, 1, h - 4, P.tower);
    c.hline(cx - 3, cx + 3, y + 7, P.pod); c.hline(cx - 2, cx + 2, y + 6, P.pod); c.hline(cx - 2, cx + 2, y + 8, P.towerShade);
    c.rect(x, y + h - 3, w, 3, P.sea);
    for (let k = 0; k < 6; k++) c.hline(x + 3, x + 3 + Math.floor(k / 2), y + h - 9 + k, P.sail);
  },
};
