import { bayer, rng, type PixelCanvas } from "../pixel/canvas";
import type { PostcardScene } from "../template";
import { W, H, leaf, people, sky, windows } from "./common";

/** Busan at dusk: Gwangan Bridge lit over the bay, Marine City towers, hills, Gwangalli beach. */
const P = {
  sky: ["#24264f", "#3d3a72", "#6c4f8a", "#c46f88", "#f2a67a", "#f8c98e"],
  star: "#f3ead8",
  hill: "#3b3a5e", hillLight: "#4a4870", hillDark: "#2c2b4a",
  tower: "#3a4468", towerLight: "#55618a", towerDark: "#2a3252", glass: "#6a7aa8",
  lit: "#f7d88a", litWarm: "#f2a65a", unlit: "#2a3050",
  bridge: "#d8dce8", bridgeShade: "#9aa0b8", deck: "#4a4f6a",
  led: ["#7fd0f0", "#b88af0", "#f08ac0", "#8af0c0"],
  sea: "#2f3d6e", seaLight: "#f2a67a", seaDark: "#232e58", glow: "#f7d88a",
  sand: "#c9a98a", sandShade: "#a88a70", sandLight: "#e0c4a2", foam: "#e8e4f0",
  coats: ["#f3ead8", "#e8483a", "#f2c14e", "#7fd0f0", "#2f3346"],
};

function farHills(c: PixelCanvas) {
  c.paint((x, y) => {
    const t = 56 + 7 * Math.sin(x / 23 + 1) + 3 * Math.sin(x / 9);
    if (y < t || y > 74) return null;
    const l = leaf(x, y);
    return y - t < 1 ? P.hillLight : l > 0.85 ? P.hillDark : P.hill;
  }, 0, 40, W - 1, 74);
}

function marineCity(c: PixelCanvas) {
  // Haeundae's tall residential towers on the right, curved crowns, lit windows
  const r = rng(31);
  const towers: [number, number, number][] = [[150, 18, 9], [161, 26, 8], [171, 12, 10], [183, 22, 9], [194, 30, 7], [203, 16, 9], [214, 34, 8]];
  for (const [x, top, w] of towers) {
    c.rect(x, top, w, 74 - top, P.tower);
    c.rect(x + w - 2, top, 2, 74 - top, P.towerDark);
    c.rect(x, top, 1, 74 - top, P.towerLight);
    c.hline(x + 1, x + w - 3, top - 1, P.towerLight); c.hline(x + 2, x + w - 4, top - 2, P.towerLight); // rounded crown
    windows(c, Math.floor(r() * 1000), x + 1, top + 2, w - 3, 72 - top, P.lit, P.unlit, 0.45, 2, 2);
    c.set(x + Math.floor(w / 2), top - 3, "#f2584a"); // aircraft warning light
  }
  // lower blocks on the left shore
  for (let x = 0; x < 150; x += 7) {
    const h = 6 + ((x * 13) % 9), t = 74 - h;
    c.rect(x, t, 6, h, x % 14 ? P.tower : P.towerDark);
    windows(c, x + 5, x + 1, t + 2, 4, h - 3, P.litWarm, P.unlit, 0.5, 2, 2);
  }
}

function gwanganBridge(c: PixelCanvas) {
  const deckY = 66;
  const towersX = [64, 132];
  // deck across the whole card, with the double-deck truss underside
  c.rect(0, deckY, W, 3, P.deck);
  c.hline(0, W - 1, deckY, P.bridgeShade);
  for (let x = 0; x < W; x += 3) c.set(x, deckY + 2, P.bridgeShade);
  // piers
  for (let x = 6; x < W; x += 18) if (!towersX.some((t) => Math.abs(t - x) < 8)) c.rect(x, deckY + 3, 2, 8, P.bridgeShade);
  // main towers: two legs with cross beams
  for (const tx of towersX) {
    for (const lx of [tx - 3, tx + 2]) { c.rect(lx, 34, 2, deckY - 34 + 10, P.bridge); c.set(lx + 1, 34, P.bridgeShade); }
    for (const by of [36, 46, 58]) c.hline(tx - 3, tx + 3, by, P.bridge);
  }
  // main cables: catenary between the towers, side spans down to the deck, LED colours drifting
  const ledAt = (x: number) => P.led[Math.floor((x + 400) / 14) % P.led.length]!;
  const [a, b] = towersX as [number, number];
  for (let x = a; x <= b; x++) {
    const t = (x - a) / (b - a);
    const y = Math.round(35 + 4 * (deckY - 36) * t * (1 - t) * 0.9);
    c.set(x, y, ledAt(x));
    if (x % 4 === 0) for (let yy = y + 1; yy < deckY; yy++) if ((yy + x) % 2 === 0) c.set(x, yy, P.bridgeShade); // hangers
  }
  for (const [x0, x1, up] of [[0, a, true], [b, W - 1, false]] as const) {
    for (let x = x0; x <= x1; x++) {
      const t = (x - x0) / (x1 - x0 || 1);
      const y = Math.round(up ? deckY - 2 - t * (deckY - 37) + Math.sin(t * Math.PI) * 4 : 35 + t * (deckY - 37) + Math.sin(t * Math.PI) * 4);
      c.set(x, y, ledAt(x));
      if (x % 4 === 0) for (let yy = y + 1; yy < deckY; yy++) if ((yy + x) % 2 === 0) c.set(x, yy, P.bridgeShade);
    }
  }
  // lamps along the deck
  for (let x = 2; x < W; x += 6) c.set(x, deckY - 1, P.lit);
}

function bay(c: PixelCanvas) {
  c.paint((x, y) => {
    const glow = Math.abs(x - 100) < 22 - (y - 74) && (y % 2 === 0) && bayer(x, y) < 0.25;
    if (glow) return P.seaLight;
    return y % 3 === 0 && bayer(x, y) < 0.2 ? P.seaDark : P.sea;
  }, 0, 75, W - 1, 92);
  // the bridge's lights reflected as broken vertical streaks
  const r = rng(808);
  for (let i = 0; i < 70; i++) {
    const x = Math.floor(r() * W), y = 76 + Math.floor(r() * 14);
    c.hline(x, x + 1 + Math.floor(r() * 2), y, P.led[i % P.led.length]!);
  }
  for (let x = 0; x < W; x += 5) for (let y = 76; y < 90; y += 3) if (bayer(x, y) < 0.15) c.set(x, y, P.glow);
}

function gwangalli(c: PixelCanvas) {
  for (let x = 0; x < W; x++) {
    const s = 92 + Math.round(Math.sin(x / 11) * 0.8);
    c.set(x, s, P.foam);
    if ((x >> 1) % 3 === 0) c.set(x, s - 1, P.foam);
  }
  c.paint((x, y) => (y > 92 + Math.sin(x / 11) * 0.8 ? (bayer(x, y) < 0.12 ? P.sandLight : y > 101 ? P.sandShade : P.sand) : null), 0, 92, W - 1, H - 1);
  people(c, 44, 101, 10, 214, 14, P.coats, "#d8a882", "#2f3346");
  // a couple with a sparkler and a small fireworks burst over the bay — Busan loves its fireworks
  const fx = 40, fy = 22;
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    for (let d = 2; d < 7; d++) if (d % 2 === 0 || d === 6) c.set(fx + Math.round(Math.cos(a) * d), fy + Math.round(Math.sin(a) * d), d > 4 ? P.led[2]! : P.lit);
  }
  c.set(fx, fy, P.star);
}

export const busanScene: PostcardScene = {
  cityId: "busan",
  accent: "#3a5ba8",
  postmarkInk: "#f3ead8",
  windowFocus: [100, 50],
  description: "Pixel-art view of Busan at dusk: Gwangan Bridge stretching across the bay with its main towers and colour-changing LED cables, the tall lit towers of Marine City and Haeundae, dark hills behind, a firework over the water, reflections on the sea, and people strolling on Gwangalli beach.",
  draw(c) {
    sky(c, P.sky, 74);
    const r = rng(17);
    for (let i = 0; i < 26; i++) { const x = Math.floor(r() * W), y = Math.floor(r() * 26); if (bayer(x, y) < 0.5) c.set(x, y, P.star); }
    c.disc(196, 12, 4, "#f8ecd0"); c.disc(198, 11, 4, P.sky[0]!); // crescent moon
    farHills(c);
    marineCity(c);
    gwanganBridge(c);
    bay(c);
    gwangalli(c);
  },
  drawStamp(c, x, y, w, h) {
    c.gradient(y, y + h - 1, [P.sky[1]!, P.sky[3]!, P.sky[4]!], x, x + w - 1);
    const dy = y + h - 6;
    c.hline(x, x + w - 1, dy, P.bridge);
    for (const tx of [x + 5, x + w - 6]) c.rect(tx, y + 4, 1, h - 6, P.bridge);
    for (let i = x + 5; i <= x + w - 6; i++) { const t = (i - x - 5) / (w - 11); c.set(i, Math.round(y + 4 + t * (1 - t) * 4 * (h - 11)), P.led[1]!); }
    c.rect(x, dy + 1, w, h - (dy + 1 - y), P.sea);
  },
};
