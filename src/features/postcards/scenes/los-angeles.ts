import { bayer, rng, type PixelCanvas } from "../pixel/canvas";
import type { PostcardScene } from "../template";
import { W, H, birds, people, ridge, sky } from "./common";

/** Los Angeles at sunset: Griffith Observatory on the hills, downtown towers, a palm-lined boulevard and a convertible. */
const P = {
  sky: ["#3f3f7a", "#6e4f8a", "#b8628a", "#ec8c6a", "#f7c98a"],
  sun: "#fbd98e", sunCore: "#fff0c4",
  mtn: "#7a5a86", mtnLight: "#8f6a96", hill: "#6a4f6e", hillDark: "#56405c", hillLight: "#7f5f7c", scrub: "#5f6a5a",
  obs: "#f1ebdc", obsShade: "#cfc6b2", dome: "#6f8f8a", domeLight: "#8fb0aa", glow: "#f7d88a",
  city: "#8a6a8a", cityDark: "#735a78", cityWindow: "#f2c88a",
  palm: "#3a2a3e", palmLight: "#4d3a52",
  road: "#5a4a5e", roadLine: "#f2c14e", sidewalk: "#c9a8a0", sidewalkDark: "#ae8c88",
  car: "#d6402e", carDark: "#9a2a20", chrome: "#e9e6dc", tyre: "#2b2b33",
  coats: ["#2f3346", "#e0603a", "#f2c14e", "#f3ead8", "#3a5a9a"],
};

function hills(c: PixelCanvas) {
  c.disc(64, 60, 13, P.sun);
  c.disc(64, 60, 9, P.sunCore);
  ridge(c, (x) => 52 + 6 * Math.sin(x / 23) + 2 * Math.sin(x / 7), P.mtn, P.mtnLight);
  ridge(c, (x) => 62 - Math.max(0, 14 - Math.abs(x - 150) * 0.22) + 2 * Math.sin(x / 5), P.hill, P.hillLight, P.hillDark, 0.2);
  const r = rng(311);
  for (let i = 0; i < 70; i++) {
    const x = Math.floor(r() * W), y = 54 + Math.floor(r() * 24);
    if (c.get(x, y) === P.hill || c.get(x, y) === P.hillDark) c.set(x, y, P.scrub);
  }
}

function observatory(c: PixelCanvas, cx: number, base: number) {
  // terrace
  c.rect(cx - 26, base - 2, 53, 2, P.obsShade);
  // main block with art-deco piers
  c.rect(cx - 22, base - 10, 45, 8, P.obs);
  c.rect(cx + 19, base - 10, 4, 8, P.obsShade);
  for (let x = cx - 20; x < cx + 20; x += 4) c.rect(x, base - 9, 1, 6, P.obsShade);
  // central rotunda and dome
  c.rect(cx - 6, base - 16, 13, 6, P.obs);
  for (let y = base - 24; y < base - 16; y++) {
    const hw = Math.sqrt(Math.max(0, 1 - ((base - 16 - y) / 8) ** 2)) * 7;
    c.hline(Math.round(cx - hw), Math.round(cx + hw), y, y < base - 20 ? P.domeLight : P.dome);
  }
  c.set(cx, base - 25, P.obsShade);
  // two smaller domes on the wings
  for (const dx of [-18, 18]) {
    c.rect(cx + dx - 3, base - 13, 7, 3, P.obs);
    for (let y = base - 17; y < base - 13; y++) {
      const hw = Math.sqrt(Math.max(0, 1 - ((base - 13 - y) / 4) ** 2)) * 3.5;
      c.hline(Math.round(cx + dx - hw), Math.round(cx + dx + hw), y, P.dome);
    }
  }
  // warm windows at dusk
  for (let x = cx - 18; x < cx + 18; x += 4) c.set(x + 2, base - 6, P.glow);
}

function downtown(c: PixelCanvas) {
  const r = rng(312);
  for (let x = 4; x < 60; x += 5 + Math.floor(r() * 3)) {
    const t = 62 + Math.floor(r() * 14), w = 4 + Math.floor(r() * 3);
    c.rect(x, t, w, 84 - t, r() < 0.5 ? P.city : P.cityDark);
    for (let y = t + 2; y < 82; y += 2) for (let i = x + 1; i < x + w - 1; i += 2) if (r() < 0.35) c.set(i, y, P.cityWindow);
  }
  // the tall cylindrical tower
  c.rect(30, 46, 7, 38, P.city);
  c.rect(35, 46, 2, 38, P.cityDark);
  c.rect(31, 43, 5, 3, P.cityDark);
  for (let y = 48; y < 82; y += 3) c.hline(31, 34, y, P.cityWindow);
}

function palm(c: PixelCanvas, x: number, base: number, h: number) {
  for (let y = base; y > base - h; y--) {
    const sway = Math.round(Math.sin((base - y) / 14) * 1.5);
    c.set(x + sway, y, P.palm);
    if (y > base - h * 0.6) c.set(x + sway + 1, y, P.palm);
  }
  const tx = x + Math.round(Math.sin(h / 14) * 1.5), ty = base - h;
  for (let k = 0; k < 10; k++) {
    const a = Math.PI * 0.9 + (k / 9) * Math.PI * 1.2;
    for (let d = 1; d < 8; d++) c.set(tx + Math.round(Math.cos(a) * d), ty + Math.round(Math.sin(a) * d * 0.55 + d * d * 0.06), k % 2 ? P.palm : P.palmLight);
  }
}

function boulevard(c: PixelCanvas) {
  c.rect(0, 84, W, 6, P.sidewalk);
  c.hline(0, W - 1, 84, P.sidewalkDark);
  c.rect(0, 90, W, H - 90, P.road);
  for (let x = 0; x < W; x += 10) c.hline(x, x + 5, 99, P.roadLine);
  c.paint((x, y) => (bayer(x, y) < 0.1 ? P.hillDark : null), 0, 90, W - 1, H - 1);
  // rows of tall, skinny palms receding along the street
  for (let x = 4; x < W; x += 16) {
    if (x > 116 && x < 186) continue; // keep the view of the observatory open
    palm(c, x, 86, 22 + ((x * 7) % 13));
  }
  palm(c, 112, 86, 34);
  palm(c, 190, 86, 30);
  people(c, 313, 89, 0, 220, 12, P.coats);
}

function convertible(c: PixelCanvas, x: number, y: number) {
  c.rect(x, y - 4, 30, 4, P.car);
  c.hline(x + 1, x + 28, y - 5, P.car);
  c.rect(x + 8, y - 7, 12, 2, P.carDark);
  c.hline(x + 19, x + 23, y - 8, P.chrome); // windscreen
  c.hline(x, x + 29, y - 2, P.chrome);
  c.set(x + 29, y - 4, P.glow);
  c.set(x, y - 4, "#c8432f");
  for (const wx of [x + 6, x + 23]) { c.disc(wx, y, 2.2, P.tyre); c.set(wx, y, P.chrome); }
  // passengers with their hair in the wind
  c.set(x + 12, y - 9, "#e3b48f"); c.set(x + 11, y - 9, "#5a3a2a"); c.set(x + 10, y - 9, "#5a3a2a");
  c.set(x + 17, y - 9, "#e3b48f"); c.set(x + 16, y - 9, "#2b2b33");
}

export const losAngelesScene: PostcardScene = {
  cityId: "los-angeles",
  accent: "#e0603a",
  description: "Pixel-art view of Los Angeles at sunset: Griffith Observatory and its copper domes on the hills, downtown towers, the San Gabriel mountains in violet haze, a boulevard of tall palms with strollers and a red convertible.",
  draw(c) {
    sky(c, P.sky, 70);
    birds(c, 314, 90, 18, 160, 36, 5, P.palm);
    hills(c);
    observatory(c, 150, 64);
    downtown(c);
    boulevard(c);
    convertible(c, 120, 104);
  },
  drawStamp(c, x, y, w, h) {
    c.gradient(y, y + h - 1, ["#6e4f8a", "#ec8c6a", "#f7c98a"], x, x + w - 1);
    c.disc(x + w / 2, y + h - 5, 4, P.sun);
    const px = x + 6;
    c.rect(px, y + 5, 1, h - 5, P.palm);
    for (let k = 0; k < 6; k++) c.line(px, y + 5, px + Math.round(Math.cos(Math.PI + k * 0.6) * 5), y + 5 + Math.round(Math.sin(Math.PI + k * 0.6) * 3) + 2, P.palm);
  },
};
