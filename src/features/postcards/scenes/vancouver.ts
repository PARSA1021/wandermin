import { bayer, rng, type PixelCanvas } from "../pixel/canvas";
import type { PostcardScene } from "../template";
import { W, birds, cloud, people, ridge, sky, water } from "./common";

/** Vancouver: Stanley Park's cedars and seawall, Brockton Point lighthouse, Lions Gate Bridge, the North Shore mountains, a seaplane. */
const P = {
  sky: ["#4f78b0", "#6f96c6", "#9fbcd8", "#d0dde6", "#eef0ea"],
  cloud: "#f8f6f0", cloudShade: "#d6dee6",
  mtn: "#6f84a8", mtnShade: "#5a6f94", snow: "#f6f6f2", snowShade: "#c9d2e4", slope: "#4f7a62", slopeDark: "#3f6652",
  cedar: "#2f5a44", cedarLight: "#46775a", cedarDark: "#22443a", trunk: "#5a3e2e",
  bridge: "#3f7a5a", bridgeDark: "#2c5a42", bridgeLight: "#5a9a74",
  water: "#3f7a94", waterLight: "#9fc8d8", waterDark: "#2f627a",
  seawall: "#c9c1ae", seawallShade: "#a8a08c", path: "#d9d2c0",
  light: "#f3ece0", lightRed: "#c8362e",
  plane: "#f3ece0", planeStripe: "#c8362e", planeDark: "#5a6070",
  coats: ["#2f3346", "#c8362e", "#3a5a9a", "#e2b84a", "#f3ead8", "#4f9a6a"],
};

function mountains(c: PixelCanvas) {
  const top = (x: number) => 40 - Math.max(0, 12 - Math.abs(x - 96) * 0.2) - Math.max(0, 8 - Math.abs(x - 180) * 0.25) + 3 * Math.sin(x / 9) + Math.sin(x / 3);
  c.paint((x, y) => {
    const t = top(x);
    if (y < t) return null;
    const snowLine = t + 6 + 2 * Math.sin(x * 0.6);
    const shade = Math.sin(x / 7 + y / 5) > 0.35;
    if (y < snowLine) return shade ? P.snowShade : P.snow;
    if (y > 58) return bayer(x, y) < 0.3 ? P.slopeDark : P.slope;
    return shade ? P.mtnShade : P.mtn;
  }, 0, 16, W - 1, 74);
  ridge(c, (x) => 66 + 2 * Math.sin(x / 8), P.slope, P.slopeDark);
}

function cedar(c: PixelCanvas, x: number, base: number, h: number) {
  c.rect(x, base - 3, 1, 3, P.trunk);
  for (let y = base - h; y < base - 2; y++) {
    const t = (y - (base - h)) / h;
    const hw = 0.5 + t * 4.5 + (Math.floor(y / 3) % 2 ? 0.8 : 0);
    for (let px = Math.round(x - hw); px <= Math.round(x + hw); px++)
      c.set(px, y, px > x + hw * 0.3 ? P.cedarDark : bayer(px, y) < 0.25 ? P.cedarLight : P.cedar);
  }
}

function stanleyPark(c: PixelCanvas) {
  const r = rng(331);
  for (let i = 0; i < 26; i++) {
    const x = Math.floor(r() * 96), h = 18 + Math.floor(r() * 22);
    cedar(c, x, 92 - Math.floor(r() * 6), h);
  }
  for (let x = 0; x < 100; x++) for (let y = 84; y < 94; y++) if (!c.get(x, y) || bayer(x, y) < 0.5) c.set(x, y, P.cedarDark);
}

function lionsGate(c: PixelCanvas) {
  const deck = 72, t1 = 112, t2 = 158, top = 46;
  const cableY = (x: number) => {
    if (x < t1) return top + ((t1 - x) / (t1 - 86)) * (deck - top - 2);
    if (x > t2) return top + ((x - t2) / (W - t2)) ** 1.2 * (deck - top - 2);
    const m = (t1 + t2) / 2, half = (t2 - t1) / 2;
    return top + (1 - ((x - m) / half) ** 2) * (deck - top - 8);
  };
  for (let x = 86; x < W; x++) {
    const y = Math.round(cableY(x));
    c.set(x, y, P.bridgeDark);
    if (x % 3 === 0) for (let yy = y + 1; yy < deck; yy++) c.set(x, yy, P.bridge);
  }
  c.rect(86, deck, W - 86, 2, P.bridge);
  c.hline(86, W - 1, deck + 2, P.bridgeDark);
  for (const tx of [t1, t2]) {
    for (const lx of [tx - 3, tx + 2]) { c.rect(lx, top, 2, 32, P.bridge); c.set(lx, top, P.bridgeLight); }
    c.hline(tx - 3, tx + 3, top + 4, P.bridgeDark);
    c.hline(tx - 3, tx + 3, top + 14, P.bridgeDark);
  }
}

function seawall(c: PixelCanvas) {
  c.rect(0, 98, W, 3, P.path);
  c.rect(0, 101, W, 7, P.seawall);
  for (let x = 0; x < W; x += 6) c.rect(x, 101, 1, 7, P.seawallShade);
  c.hline(0, W - 1, 98, P.seawallShade);
  people(c, 332, 98, 2, 220, 12, P.coats);
  // cyclists on the seawall path
  for (const [x, col] of [[60, "#c8362e"], [140, "#3a5a9a"], [190, "#e2b84a"]] as const) {
    c.set(x, 98, "#2b2b33"); c.set(x + 5, 98, "#2b2b33");
    c.line(x, 98, x + 3, 96, "#5a6070"); c.line(x + 3, 96, x + 5, 98, "#5a6070");
    c.set(x + 3, 94, "#e3b48f"); c.set(x + 3, 95, col); c.set(x + 2, 95, col);
  }
}

function lighthouse(c: PixelCanvas, x: number) {
  c.rect(x - 4, 90, 9, 4, P.seawall);
  c.rect(x - 2, 78, 5, 12, P.light);
  for (let y = 80; y < 90; y += 4) c.hline(x - 2, x + 2, y, P.lightRed);
  c.rect(x - 1, 75, 3, 3, "#f2cf6a");
  c.hline(x - 2, x + 2, 74, P.lightRed);
}

function seaplane(c: PixelCanvas, x: number, y: number) {
  c.rect(x, y, 18, 3, P.plane);
  c.hline(x, x + 17, y + 1, P.planeStripe);
  c.rect(x + 14, y - 1, 4, 1, P.plane);
  c.rect(x - 1, y - 4, 3, 4, P.plane); // tail
  c.hline(x + 4, x + 20, y - 1, P.planeDark); // wing
  c.set(x + 18, y + 1, P.planeDark); c.set(x + 19, y, P.planeDark); // prop
  c.hline(x + 2, x + 16, y + 5, P.planeDark); // float
  c.set(x + 5, y + 4, P.planeDark); c.set(x + 13, y + 4, P.planeDark);
  for (let k = 0; k < 10; k++) c.set(x - 2 - k * 2, y + 6, P.waterLight); // wake
}

export const vancouverScene: PostcardScene = {
  cityId: "vancouver",
  accent: "#2f7a5a",
  description: "Pixel-art view of Vancouver: Stanley Park's tall cedars and the seawall with cyclists and walkers, the red-and-white Brockton Point lighthouse, the green Lions Gate Bridge, a seaplane landing on the harbour and the snowy North Shore mountains.",
  draw(c) {
    sky(c, P.sky);
    cloud(c, 20, 70, 14, P.cloud, P.cloudShade, 3);
    cloud(c, 130, 170, 22, P.cloud, P.cloudShade);
    mountains(c);
    water(c, 74, P.water, P.waterLight, P.waterDark, 333);
    lionsGate(c);
    stanleyPark(c);
    lighthouse(c, 98);
    seaplane(c, 140, 86);
    for (const sx of [180, 204]) { c.hline(sx, sx + 7, 92, "#2f3a63"); c.rect(sx + 3, 84, 1, 8, "#2f3a63"); c.polygon([[sx + 4, 84], [sx + 4, 91], [sx + 8, 91]], P.light); }
    seawall(c);
    birds(c, 334, 100, 52, 200, 66, 5, "#3a4466");
  },
  drawStamp(c, x, y, w, h) {
    c.rect(x, y, w, h, "#f3ece0");
    c.rect(x, y, 4, h, "#c8362e"); c.rect(x + w - 4, y, 4, h, "#c8362e");
    const cx = x + w / 2 - 0.5, cy = y + h / 2;
    const pts: [number, number][] = [[0, -7], [1.5, -3], [4, -4], [3, -1], [6, -1], [4, 2], [5, 4], [1, 3], [0.6, 6], [-0.6, 6], [-1, 3], [-5, 4], [-4, 2], [-6, -1], [-3, -1], [-4, -4], [-1.5, -3]];
    c.polygon(pts.map(([dx, dy]) => [cx + dx, cy + dy] as [number, number]), "#c8362e");
  },
};
