import { bayer, rng, type PixelCanvas } from "../pixel/canvas";
import type { PostcardScene } from "../template";
import { W, H, birds, cloud, people, sky, water } from "./common";

/** London: Elizabeth Tower and the Palace of Westminster, a red bus on Westminster Bridge, the London Eye. */
const P = {
  sky: ["#66799c", "#8396b3", "#a9b6c8", "#cdd2d8", "#e7e2d6"],
  cloud: "#eef0ef", cloudShade: "#c9cfd8", cloudDeep: "#b3bccb",
  stone: "#cdb27a", stoneShade: "#a58c58", stoneLight: "#e2cc98", stoneDeep: "#86703f", window: "#5e4f3a", glassGlint: "#9fb0bf",
  slate: "#5e6466", slateLight: "#7a8082",
  spire: "#4f5c5e", spireLight: "#6f7d7e", clock: "#f3ead2", gold: "#d8b04a", hand: "#2b2b33",
  eye: "#c9ced6", eyePod: "#e8ecef", eyeSpoke: "#a9b2bf",
  far: "#a3aebd", farDark: "#919dae", shard: "#b7c2cf",
  bridge: "#3f6f5a", bridgeLight: "#5a8d74", bridgeDark: "#2c5243", parapet: "#4d806a",
  bus: "#c8362e", busDark: "#8e2420", busWindow: "#d9e2e8", tyre: "#2b2b33", cab: "#2b2b33", cabLight: "#55555f",
  water: "#6c7f80", waterLight: "#a8b6b4", waterDark: "#55676a",
  boat: "#f1efe8", boatStripe: "#2f4f8f", boatWindow: "#5b6b7a",
  flagR: "#c8362e", flagB: "#2f4f8f", flagW: "#f3ead8",
  coats: ["#2f3346", "#8e2420", "#3f6f5a", "#c9a35a", "#5b6b8a", "#6e4c3a"],
};

function farCity(c: PixelCanvas) {
  const r = rng(92);
  for (let x = 150; x < W; x += 5 + Math.floor(r() * 4)) {
    const t = 72 + Math.floor(r() * 10);
    c.rect(x, t, 4 + Math.floor(r() * 3), 92 - t, r() < 0.5 ? P.far : P.farDark);
  }
  // the Shard: a thin glass pyramid
  for (let y = 40; y < 92; y++) {
    const hw = (y - 40) * 0.12;
    for (let x = Math.round(214 - hw); x <= Math.round(214 + hw); x++) c.set(x, y, x > 214 ? P.farDark : P.shard);
  }
}

function eye(c: PixelCanvas, cx: number, cy: number, r: number) {
  for (let k = 0; k < 24; k++) {
    const t = (k / 24) * Math.PI * 2;
    c.line(cx, cy, cx + Math.cos(t) * r, cy + Math.sin(t) * r, P.eyeSpoke);
  }
  for (let a = 0; a < 360; a += 1.2) {
    const t = (a * Math.PI) / 180;
    c.set(Math.round(cx + Math.cos(t) * r), Math.round(cy + Math.sin(t) * r), P.eye);
    c.set(Math.round(cx + Math.cos(t) * (r - 1)), Math.round(cy + Math.sin(t) * (r - 1)), P.eye);
  }
  for (let k = 0; k < 16; k++) {
    const t = (k / 16) * Math.PI * 2;
    c.rect(Math.round(cx + Math.cos(t) * (r + 1)) - 1, Math.round(cy + Math.sin(t) * (r + 1)), 2, 2, P.eyePod);
  }
  c.disc(cx, cy, 1.5, P.eye);
  c.line(cx, cy, cx - 7, 92, P.eye);
  c.line(cx, cy, cx + 7, 92, P.eye);
}

/** Pointed gothic window, 2 px wide. */
function lancet(c: PixelCanvas, x: number, y: number, h: number) {
  c.set(x, y, P.window); c.set(x + 1, y, P.window);
  c.rect(x, y + 1, 2, h - 1, P.window);
  if ((x + y) % 3 === 0) c.set(x, y + 1, P.glassGlint);
  c.hline(x, x + 1, y + h, P.stoneLight);
}

function parliament(c: PixelCanvas) {
  const x0 = 30, x1 = 144, top = 68, base = 92;
  // roof
  for (let k = 0; k < 4; k++) c.hline(x0 + k, x1 - k, top - 4 + k, k === 0 ? P.slateLight : P.slate);
  // facade
  c.rect(x0, top, x1 - x0, base - top, P.stone);
  c.hline(x0, x1, top, P.stoneLight);
  c.hline(x0, x1, top + 11, P.stoneDeep);
  c.hline(x0, x1, top + 12, P.stoneLight);
  for (let x = x0 + 2; x < x1 - 3; x += 6) {
    lancet(c, x, top + 3, 6);
    lancet(c, x + 2, top + 3, 6);
    lancet(c, x, top + 14, 7);
    lancet(c, x + 2, top + 14, 7);
    // buttress with pinnacle above the parapet
    c.rect(x + 4, top - 2, 1, base - top + 2, P.stoneShade);
    c.set(x + 4, top - 4, P.stoneShade); c.set(x + 4, top - 5, P.stoneShade);
  }
  // central lantern spire over the Lobby
  c.rect(88, 56, 5, 8, P.stone);
  c.rect(91, 56, 2, 8, P.stoneShade);
  for (let y = 44; y < 56; y++) c.hline(90 - Math.floor((y - 44) / 5), 90 + Math.floor((y - 44) / 5), y, P.spire);
  c.set(90, 43, P.gold);
  // Victoria Tower with corner turrets and a flag
  const vx = 8, vw = 22, vt = 34;
  c.rect(vx, vt, vw, base - vt, P.stone);
  c.rect(vx + vw - 4, vt, 4, base - vt, P.stoneShade);
  for (let y = vt + 4; y < base - 8; y += 9) for (let x = vx + 3; x < vx + vw - 5; x += 4) lancet(c, x, y, 6);
  c.rect(vx + 6, base - 9, 8, 9, P.stoneDeep); // royal entrance arch
  c.set(vx + 6, base - 9, P.stone); c.set(vx + 13, base - 9, P.stone);
  for (const tx of [vx, vx + vw - 2]) { c.rect(tx, vt - 6, 2, 6, P.stone); c.set(tx, vt - 8, P.gold); c.set(tx + 1, vt - 7, P.gold); }
  c.hline(vx, vx + vw - 1, vt, P.stoneLight);
  c.rect(vx + 10, vt - 14, 1, 14, P.hand);
  c.rect(vx + 11, vt - 14, 6, 4, P.flagB);
  c.hline(vx + 11, vx + 16, vt - 12, P.flagW); c.set(vx + 13, vt - 13, P.flagR); c.set(vx + 13, vt - 11, P.flagR);
  c.hline(vx + 11, vx + 16, vt - 12, P.flagR);
}

function elizabethTower(c: PixelCanvas, cx: number) {
  const hw = 5;
  c.rect(cx - hw, 30, hw * 2 + 1, 62, P.stone);
  c.rect(cx + hw - 2, 30, 3, 62, P.stoneShade);
  // vertical panelling and small windows down the shaft
  for (let y = 46; y < 90; y++) for (const dx of [-3, 0, 3]) if (y % 4 !== 0) c.set(cx + dx, y, (y % 8 < 4) ? P.stoneShade : P.window);
  for (let y = 46; y < 92; y += 8) c.hline(cx - hw, cx + hw, y, P.stoneLight);
  // clock stage with gilded frame and numerals
  c.rect(cx - hw - 1, 30, hw * 2 + 3, 15, P.stoneLight);
  c.rect(cx + hw - 1, 30, 3, 15, P.stoneShade);
  c.rect(cx - 5, 31, 11, 11, P.gold);
  c.disc(cx, 36.5, 4.4, P.clock);
  for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; c.set(Math.round(cx + Math.cos(a) * 3.6), Math.round(36.5 + Math.sin(a) * 3.6), P.hand); }
  c.line(cx, 37, cx, 34, P.hand);
  c.line(cx, 37, cx + 2, 38, P.hand);
  c.hline(cx - hw - 1, cx + hw + 1, 44, P.gold);
  // belfry arcade
  c.rect(cx - hw, 23, hw * 2 + 1, 7, P.stone);
  for (let x = cx - 4; x <= cx + 4; x += 2) { c.rect(x, 24, 1, 5, P.window); }
  c.hline(cx - hw, cx + hw, 23, P.gold);
  // spire with gilded pinnacles and orb
  for (let y = 8; y < 23; y++) {
    const w = Math.round((y - 8) / 3);
    c.hline(cx - w, cx + w, y, (y + cx) % 3 === 0 ? P.spireLight : P.spire);
    if (y % 4 === 1) c.set(cx - w, y, P.gold);
  }
  for (const dx of [-hw, hw]) { c.rect(cx + dx, 16, 1, 7, P.spire); c.set(cx + dx, 15, P.gold); }
  c.rect(cx, 3, 1, 5, P.gold);
  c.set(cx - 1, 4, P.gold); c.set(cx + 1, 4, P.gold);
}

function bridge(c: PixelCanvas) {
  const deck = 92;
  c.rect(0, deck, W, 3, P.bridgeLight);
  c.hline(0, W - 1, deck + 3, P.bridgeDark);
  // parapet with balusters
  c.hline(0, W - 1, deck - 3, P.parapet);
  for (let x = 0; x < W; x += 2) c.set(x, deck - 2, P.parapet);
  c.hline(0, W - 1, deck - 1, P.parapet);
  for (let a = 0; a < 7; a++) {
    const ax = 12 + a * 34;
    for (let x = ax - 14; x <= ax + 14; x++) {
      const y = deck + 4 + Math.round(((x - ax) / 14) ** 2 * 6);
      for (let yy = deck + 4; yy < y; yy++) c.set(x, yy, P.bridge);
      c.set(x, y, P.bridgeDark);
    }
    c.rect(ax + 15, deck + 4, 4, 10, P.bridge);
    c.rect(ax + 15, deck + 4, 1, 10, P.bridgeLight);
  }
  // three-globe lamp standards
  for (let x = 6; x < W; x += 18) {
    c.rect(x, deck - 10, 1, 7, P.bridgeDark);
    c.hline(x - 2, x + 2, deck - 10, P.bridgeDark);
    for (const dx of [-2, 0, 2]) c.set(x + dx, deck - 11, P.clock);
  }
}

function traffic(c: PixelCanvas) {
  const deck = 92;
  // red double-decker
  const bx = 58, by = deck - 16;
  c.rect(bx, by, 30, 15, P.bus);
  c.hline(bx + 1, bx + 28, by, P.busDark);
  c.rect(bx, by + 7, 30, 1, P.busDark);
  for (let x = bx + 2; x < bx + 28; x += 5) { c.rect(x, by + 2, 4, 3, P.busWindow); c.rect(x, by + 9, 4, 3, P.busWindow); }
  c.rect(bx + 26, by + 9, 3, 5, P.busDark);
  c.rect(bx + 2, by + 6, 10, 1, "#f2cf6a"); // destination blind
  c.disc(bx + 6, deck - 1, 1.6, P.tyre);
  c.disc(bx + 24, deck - 1, 1.6, P.tyre);
  // black cab
  const tx = 104;
  c.rect(tx, deck - 6, 15, 5, P.cab);
  c.rect(tx + 3, deck - 9, 9, 3, P.cab);
  c.rect(tx + 4, deck - 8, 3, 2, P.busWindow); c.rect(tx + 8, deck - 8, 3, 2, P.busWindow);
  c.set(tx + 7, deck - 10, "#f2cf6a");
  c.set(tx + 14, deck - 4, "#f2cf6a");
  c.disc(tx + 3, deck - 1, 1.3, P.cabLight); c.disc(tx + 12, deck - 1, 1.3, P.cabLight);
  people(c, 94, deck - 1, 2, 54, 6, P.coats);
  people(c, 95, deck - 1, 124, 222, 9, P.coats);
}

function thames(c: PixelCanvas) {
  water(c, 96, P.water, P.waterLight, P.waterDark, 93);
  // reflection of the clock tower between the arches
  for (let y = 99; y < H; y++) for (let x = 148; x <= 156; x++) if (bayer(x, y) < 0.35 && (y & 1)) c.set(x, y, P.stoneShade);
  // river cruiser
  const x0 = 160, y = 102;
  for (let k = 0; k < 4; k++) c.hline(x0 + k, x0 + 40 - k, y + k, k === 1 ? P.boatStripe : P.boat);
  c.rect(x0 + 6, y - 4, 26, 4, P.boat);
  for (let x = x0 + 8; x < x0 + 30; x += 3) c.rect(x, y - 3, 2, 2, P.boatWindow);
  c.hline(x0 + 6, x0 + 31, y - 5, P.boatStripe);
}

export const londonScene: PostcardScene = {
  cityId: "london",
  accent: "#c8362e",
  description: "Pixel-art view of London under soft cloud: Elizabeth Tower and the gothic Palace of Westminster with Victoria Tower, a red double-decker and a black cab on Westminster Bridge, a cruiser on the Thames, the London Eye and the Shard.",
  draw(c) {
    sky(c, P.sky);
    const r = rng(91);
    for (let i = 0; i < 6; i++) {
      const x0 = Math.floor(r() * 180), len = 30 + Math.floor(r() * 40), y = 14 + Math.floor(r() * 40);
      cloud(c, x0, x0 + len, y, P.cloud, P.cloudShade, 3);
      c.hline(x0 + 6, x0 + len - 6, y + 1, P.cloudDeep);
    }
    birds(c, 96, 40, 18, 130, 40, 5, "#4a5468");
    farCity(c);
    eye(c, 192, 64, 22);
    parliament(c);
    elizabethTower(c, 152);
    thames(c);
    bridge(c);
    traffic(c);
  },
  drawStamp(c, x, y, w, h) {
    c.rect(x, y, w, h, "#2f4f8f");
    const cx = x + Math.floor(w / 2);
    c.rect(cx - 2, y + 6, 5, h - 6, P.stone);
    c.disc(cx, y + 8, 1.6, P.clock);
    for (let k = 0; k < 5; k++) c.hline(cx - Math.round(k / 2), cx + Math.round(k / 2), y + 1 + k, P.spire);
    c.hline(x, x + w - 1, y + h - 1, P.bus);
  },
};
