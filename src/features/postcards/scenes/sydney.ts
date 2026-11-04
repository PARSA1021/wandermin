import { bayer, type PixelCanvas } from "../pixel/canvas";
import type { PostcardScene } from "../template";
import { W, H, birds, cloud, foliage, people, sky, water } from "./common";

/** Sydney: the Opera House sails and the Harbour Bridge arch, ferries and yachts on the harbour, fig trees. */
const P = {
  sky: ["#3a70b4", "#5a8fcb", "#8bb4dc", "#c3d9e8", "#eef0e6"],
  cloud: "#f8f6f0", cloudShade: "#d6dfe8",
  shell: "#f3efe6", shellShade: "#cfc9bc", shellLine: "#e2ddd0", shellDeep: "#a8a294", glass: "#a07a52",
  podium: "#d9b98a", podiumShade: "#b8966a",
  steel: "#7f8898", steelDark: "#5f6878", steelLight: "#9fa8b8", pylon: "#c9b48e", pylonShade: "#a8946e",
  city: "#9aa8b8", cityDark: "#8291a4", window: "#dbe4ec",
  water: "#2f78a8", waterLight: "#9fd0e4", waterDark: "#235f8a",
  ferryGreen: "#2f7a4a", ferryYellow: "#f2c14e", ferryCream: "#f3ece0",
  fig: ["#3f7a4a", "#5f9a5e", "#2c5a3a", "#7fb06e"], trunk: "#6a5a4a",
  coats: ["#2f3346", "#c8432f", "#2f6fb0", "#f2c14e", "#f3ead8"],
};

function harbourBridge(c: PixelCanvas) {
  const x0 = 128, x1 = 224, deck = 70, peak = 48;
  const mid = (x0 + x1) / 2, half = (x1 - x0) / 2 - 8;
  const archTop = (x: number) => deck - (1 - ((x - mid) / half) ** 2) * (deck - peak);
  const archLow = (x: number) => deck + 6 - (1 - ((x - mid) / (half + 2)) ** 2) * (deck - peak - 4);
  for (let x = Math.round(mid - half - 2); x <= Math.round(mid + half + 2); x++) {
    const t = Math.round(Math.max(peak, archTop(x))), b = Math.round(archLow(x));
    for (let y = t; y <= Math.min(b, deck + 6); y++) {
      const edge = y === t || y === b;
      const truss = (x + y) % 6 === 0 || (x - y + 300) % 6 === 0;
      if (edge) c.set(x, y, P.steelDark);
      else if (truss) c.set(x, y, P.steel);
    }
    // hangers between the arch and the deck
    if (x % 4 === 0) for (let y = Math.max(t, b); y < deck; y++) c.set(x, y, P.steel);
  }
  c.rect(x0 - 4, deck, x1 - x0 + 8, 3, P.steelDark);
  c.hline(x0 - 4, x1 + 4, deck, P.steelLight);
  // granite pylons
  for (const px of [x0, x1 - 10]) {
    c.rect(px, deck - 14, 10, 30, P.pylon);
    c.rect(px + 7, deck - 14, 3, 30, P.pylonShade);
    c.rect(px + 2, deck - 10, 6, 6, P.pylonShade);
    c.hline(px - 1, px + 10, deck - 15, P.pylonShade);
  }
}

function northShore(c: PixelCanvas) {
  for (let x = 128; x < W; x += 5) {
    const t = 76 + ((x * 11) % 9), w = 4 + ((x * 3) % 3);
    c.rect(x, t, w, 88 - t, x % 10 ? P.city : P.cityDark);
    for (let y = t + 2; y < 87; y += 3) c.set(x + 1, y, P.window);
  }
  c.hline(128, W - 1, 87, "#5f8a4f");
}

function cityBehind(c: PixelCanvas) {
  for (let x = 0; x < 128; x += 6) {
    const t = 58 + ((x * 13) % 18), w = 5 + ((x * 7) % 3);
    c.rect(x, t, w, 88 - t, x % 12 ? P.city : P.cityDark);
    for (let y = t + 2; y < 86; y += 3) for (let i = x + 1; i < x + w - 1; i += 2) if ((i * y) % 5 < 2) c.set(i, y, P.window);
  }
}

function operaHouse(c: PixelCanvas) {
  // podium
  c.rect(30, 84, 110, 8, P.podium);
  c.hline(30, 139, 84, P.podiumShade);
  for (let k = 0; k < 4; k++) c.hline(40 + k * 2, 70 - k * 2, 84 - k, P.podiumShade); // grand stairs
  c.hline(30, 139, 91, P.podiumShade);
  // interlocking shells: pointed sails rising steeply to a tip and sweeping back in a curve,
  // lit on the sunny face, with the chevron pattern of the tiles
  const shell = (bx: number, w: number, h: number, dir: 1 | -1) => {
    for (let k = 0; k <= w; k++) {
      const t = k / w;
      const height = Math.round(h * Math.pow(Math.cos((t * Math.PI) / 2), 0.8));
      const x = dir === 1 ? bx + k : bx - k;
      const top = 84 - height;
      for (let y = top; y < 84; y++) {
        const lit = dir === 1 ? t < 0.55 : t > 0.25;
        c.set(x, y, (x * 2 + y) % 6 === 0 ? P.shellLine : lit ? P.shell : P.shellShade);
      }
      if (height > 0) c.set(x, top, P.shellDeep);
    }
    c.rect(dir === 1 ? bx - 3 : bx, 79, 3, 5, P.glass); // glass wall under the shell's mouth
  };
  // Concert Hall group (left) and Joan Sutherland Theatre group (right), tallest first
  shell(50, 20, 30, 1);
  shell(66, 16, 22, 1);
  shell(80, 12, 15, 1);
  shell(58, 10, 18, -1);
  shell(98, 18, 26, 1);
  shell(112, 14, 19, 1);
  shell(124, 10, 12, 1);
  shell(104, 9, 15, -1);
}

function ferry(c: PixelCanvas, x0: number, y: number) {
  for (let k = 0; k < 3; k++) c.hline(x0 + k, x0 + 34 - k, y + k, k === 0 ? P.ferryYellow : P.ferryGreen);
  c.rect(x0 + 4, y - 5, 26, 5, P.ferryCream);
  for (let x = x0 + 5; x < x0 + 29; x += 3) c.rect(x, y - 4, 2, 2, P.ferryGreen);
  c.hline(x0 + 4, x0 + 29, y - 6, P.ferryGreen);
  c.rect(x0 + 15, y - 9, 3, 3, P.ferryYellow);
  for (let k = 0; k < 10; k++) c.set(x0 - k * 2, y + 3, P.waterLight);
}

export const sydneyScene: PostcardScene = {
  cityId: "sydney",
  accent: "#2f6fb0",
  description: "Pixel-art view of Sydney Harbour: the white tiled sails of the Opera House on their sandstone podium, the steel arch of the Harbour Bridge with its granite pylons, a green-and-yellow ferry, yachts, fig trees and people on the foreshore.",
  draw(c) {
    sky(c, P.sky);
    cloud(c, 10, 60, 18, P.cloud, P.cloudShade, 3);
    cloud(c, 70, 110, 32, P.cloud, P.cloudShade);
    birds(c, 361, 40, 12, 120, 30, 6, "#3a4466");
    cityBehind(c);
    northShore(c);
    water(c, 88, P.water, P.waterLight, P.waterDark, 362);
    harbourBridge(c);
    operaHouse(c);
    for (let x = 30; x < 140; x++) for (let y = 93; y < 100; y++) if (bayer(x, y) < 0.25 && (y & 1)) c.set(x, y, P.shellShade);
    ferry(c, 150, 98);
    for (const sx of [96, 120, 200]) { c.hline(sx, sx + 7, 104, "#2f3a63"); c.rect(sx + 3, 96, 1, 8, "#2f3a63"); c.polygon([[sx + 4, 96], [sx + 4, 103], [sx + 8, 103]], P.shell); }
    // Royal Botanic Garden foreshore
    c.rect(0, 96, 30, H - 96, "#5f8a4f");
    foliage(c, 363, 10, 88, 11, P.fig);
    c.rect(9, 92, 2, 6, P.trunk);
    people(c, 364, 91, 34, 136, 12, P.coats);
  },
  drawStamp(c, x, y, w, h) {
    c.rect(x, y, w, h, P.sky[1]!);
    c.rect(x, y + h - 4, w, 4, P.water);
    for (const [bx, sw, sh] of [[x + 2, 7, 10], [x + 7, 6, 7], [x + 12, 6, 9]] as const)
      for (let k = 0; k < sw; k++) c.rect(bx + k, y + h - 4 - Math.round(sh * Math.sin(Math.PI * (k / sw) * 0.95)), 1, Math.round(sh * Math.sin(Math.PI * (k / sw) * 0.95)), P.shell);
  },
};
