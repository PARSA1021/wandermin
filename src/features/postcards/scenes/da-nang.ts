import { bayer, rng, type PixelCanvas } from "../pixel/canvas";
import type { PostcardScene } from "../template";
import { W, H, birds, cloud, leaf, palm, sky, windows } from "./common";

/** Da Nang at sunset: the golden Dragon Bridge arching over the Han River, Son Tra peninsula and Lady Buddha, basket boats. */
const P = {
  sky: ["#3f5fa0", "#6a7ab8", "#c48aa0", "#f2a678", "#f8cc8a"],
  sun: "#fbe0a0", sunCore: "#fff1cc",
  cloud: "#f8d8b8", cloudShade: "#d8a0a0",
  mountain: "#5a6a8a", mountainLight: "#6f7f9e", mountainDark: "#4a5878", buddha: "#f3efe6",
  city: "#8a8fae", cityDark: "#6f7494", cityLit: "#f7d88a",
  dragon: "#f2b630", dragonLight: "#fbe07a", dragonDark: "#c8861a", scale: "#e89a20", fire: "#f2584a", fireLight: "#fbb04a",
  deck: "#5a5a6e", deckLight: "#8a8a9e", pier: "#6f6f82",
  river: "#4a6a9a", riverLight: "#f8c88a", riverDark: "#3a5684",
  bank: "#4f7a4a", bankLight: "#6f9a5a",
  basket: "#7a5a3a", basketLight: "#a8845a", basketDark: "#5a4028", hat: "#f0dca0", hatShade: "#c8b07a", shirt: "#3a78c8",
  palm: ["#3f7a4a", "#5f9a5a", "#2c5a3a"], trunk: "#7a5a40", ring: "#5a4030",
};

function sonTra(c: PixelCanvas) {
  // the peninsula ridge to the right, with the white Lady Buddha statue on its slope
  c.paint((x, y) => {
    const t = 40 + Math.pow(Math.abs(x - 186) / 40, 1.8) * 22 + Math.sin(x / 5) * 1.2;
    if (y < t || y > 66) return null;
    const l = leaf(x, y);
    return y - t < 1 ? P.mountainLight : l > 0.82 ? P.mountainDark : P.mountain;
  }, 110, 30, W - 1, 66);
  const bx = 168, by = 50;
  c.rect(bx, by - 8, 2, 8, P.buddha);
  c.set(bx, by - 9, P.buddha); c.set(bx + 1, by - 9, P.buddha);
  c.hline(bx - 1, bx + 2, by, P.buddha);
}

function city(c: PixelCanvas) {
  const r = rng(52);
  for (let x = 0; x < 120; x += 4 + Math.floor(r() * 3)) {
    const t = 50 + Math.floor(r() * 14), w = 3 + Math.floor(r() * 4);
    c.rect(x, t, w, 66 - t, r() < 0.3 ? P.cityDark : P.city);
    windows(c, Math.floor(r() * 999), x + 1, t + 2, w - 2, 64 - t, P.cityLit, P.cityDark, 0.25, 2, 3);
  }
  for (let x = 110; x < W; x += 6) { const t = 60 + ((x * 7) % 5); c.rect(x, t, 5, 66 - t, P.cityDark); }
}

function river(c: PixelCanvas) {
  c.paint((x, y) => {
    const glow = Math.abs(x - 64) < 14 - (y - 66) * 0.6 && (y % 2 === 0) && ((x + y * 3) % 5 < 3);
    return glow ? P.riverLight : y % 3 === 0 && bayer(x, y) < 0.25 ? P.riverDark : P.river;
  }, 0, 66, W - 1, H - 1);
  c.hline(0, W - 1, 66, P.riverDark);
}

function dragonBridge(c: PixelCanvas) {
  const deckY = 76;
  // the flat road deck on piers, full width
  c.rect(0, deckY, W, 3, P.deck);
  c.hline(0, W - 1, deckY, P.deckLight);
  for (let x = 10; x < W; x += 28) c.rect(x, deckY + 3, 4, 10, P.pier);
  // the steel dragon: a thick golden body arching over the deck in waves, tail on the left, head on the right
  const yOf = (x: number) => deckY - 6 - Math.abs(Math.sin(((x - 10) / 186) * Math.PI * 3)) * 20 - (x > 170 ? (x - 170) * 0.2 : 0);
  for (let x = 10; x <= 196; x++) {
    const y = Math.round(yOf(x));
    const thick = 3;
    for (let k = 0; k < thick; k++) c.set(x, y + k, k === 0 ? P.dragonLight : k === thick - 1 ? P.dragonDark : (x % 3 === 0 ? P.scale : P.dragon));
    // spines along the back
    if (x % 4 === 0) c.set(x, y - 1, P.dragonDark);
    // the struts where the body meets the deck
    if (y < deckY - 4 && x % 9 === 0) for (let yy = y + thick; yy < deckY; yy++) if (yy % 2 === 0) c.set(x, yy, P.dragonDark);
  }
  // tail curling up at the left end
  for (let k = 0; k < 7; k++) c.set(10 - Math.round(k * 0.6), Math.round(yOf(10)) - k, P.dragonDark);
  // the head: snout, jaw, horns and a puff of fire (the bridge really breathes fire on weekend nights)
  const hx = 196, hy = Math.round(yOf(196)) - 4;
  c.rect(hx, hy, 8, 5, P.dragon);
  c.hline(hx, hx + 9, hy, P.dragonLight);
  c.rect(hx + 6, hy + 4, 4, 2, P.dragonDark); // jaw
  c.set(hx + 3, hy + 1, P.dragonDark); // eye
  c.line(hx + 1, hy, hx - 2, hy - 5, P.dragonDark); c.line(hx + 3, hy, hx + 2, hy - 6, P.dragonDark); // horns
  for (let k = 0; k < 10; k++) {
    const fx = hx + 11 + k, spread = Math.floor(k / 3);
    for (let s = -spread; s <= spread; s++) c.set(fx, hy + 3 + s, k < 4 ? P.fireLight : bayer(fx, hy + s) < 0.6 ? P.fire : P.fireLight);
  }
}

function basketBoat(c: PixelCanvas, x: number, y: number) {
  // thúng chai: a round woven coracle with a fisherman in a conical hat
  for (let k = 0; k < 4; k++) c.hline(x - 6 + k, x + 6 - k, y + k, k === 0 ? P.basketLight : k % 2 ? P.basket : P.basketDark);
  for (let i = x - 5; i < x + 6; i += 2) c.set(i, y + 1, P.basketDark);
  c.rect(x - 1, y - 4, 3, 4, P.shirt);
  c.hline(x - 3, x + 3, y - 5, P.hatShade); c.hline(x - 2, x + 2, y - 6, P.hat); c.set(x, y - 7, P.hat);
  c.line(x + 2, y - 2, x + 7, y + 3, P.basketDark); // oar
}

function bank(c: PixelCanvas) {
  c.paint((x, y) => {
    const t = 96 + Math.sin(x / 13) * 1.5;
    if (y < t) return null;
    return y - t < 1 ? P.bankLight : leaf(x, y) < 0.2 ? P.bankLight : P.bank;
  }, 0, 92, W - 1, H - 1);
}

export const daNangScene: PostcardScene = {
  cityId: "da-nang",
  accent: "#d8861a",
  windowFocus: [110, 56],
  description: "Pixel-art view of Da Nang at sunset: the golden Dragon Bridge arching in waves over the Han River with its head breathing fire, the city's towers along the river, the Son Tra peninsula with the white Lady Buddha statue, round basket boats with fishermen in conical hats, and palms on the riverbank.",
  draw(c) {
    sky(c, P.sky, 66);
    c.disc(64, 50, 9, P.sun); c.disc(64, 50, 5, P.sunCore);
    cloud(c, 20, 76, 22, P.cloud, P.cloudShade, 2);
    cloud(c, 120, 170, 14, P.cloud, P.cloudShade, 2);
    birds(c, 33, 90, 18, 150, 34, 5, "#4a3a5a");
    sonTra(c);
    city(c);
    river(c);
    dragonBridge(c);
    basketBoat(c, 46, 90);
    basketBoat(c, 150, 88);
    basketBoat(c, 112, 94);
    bank(c);
    palm(c, 16, 102, 24, 1, P.palm, P.trunk, P.ring);
    palm(c, 208, 102, 20, -1, P.palm, P.trunk, P.ring);
  },
  drawStamp(c, x, y, w, h) {
    c.gradient(y, y + h - 1, [P.sky[1]!, P.sky[3]!, P.sky[4]!], x, x + w - 1);
    for (let i = x; i < x + w; i++) {
      const yy = Math.round(y + h - 6 - Math.max(0, Math.sin(((i - x) / w) * Math.PI * 2)) * (h - 9));
      c.set(i, yy, P.dragon); c.set(i, yy + 1, P.dragonDark);
    }
    c.rect(x, y + h - 4, w, 4, P.river);
  },
};
