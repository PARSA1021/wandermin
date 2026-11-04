import { bayer, rng, type PixelCanvas } from "../pixel/canvas";
import type { PostcardScene } from "../template";
import { W, H, cloud, foliage, people, ridge, sky } from "./common";

/** Mexico City: the Palacio de Bellas Artes with its golden domes, Torre Latinoamericana, jacarandas in bloom, papel picado, the volcanoes. */
const P = {
  sky: ["#4f80c0", "#6f9ad0", "#a0c0e0", "#d6e2ea", "#f2ead6"],
  cloud: "#f8f6f0", cloudShade: "#dbe2ea",
  volcano: "#8a92b4", volcanoShade: "#737ca0", snow: "#f6f6f2", snowShade: "#cdd4e4",
  marble: "#efe9dc", marbleShade: "#cfc6b2", marbleDark: "#a89f8a", window: "#4a4f66",
  dome: "#e0a33a", domeLight: "#f2c868", domeDark: "#b07a22", rib: "#8a5a1a", bronze: "#5f6a5a",
  glass: "#6f8aa8", glassLight: "#9fb8d0", glassDark: "#566f8c",
  plaza: "#d9cdb2", plazaDither: "#c4b796",
  jacaranda: ["#8a6ac4", "#b496e0", "#6a4ea0", "#d4c0f0"], trunk: "#5a4636",
  picado: ["#d6336c", "#f2c14e", "#3fa0a0", "#e07a3a", "#7a5ac4", "#4f9a6a"],
  coats: ["#2f3346", "#d6336c", "#3a5a9a", "#f2c14e", "#f3ead8", "#3fa0a0"],
};

function volcanoes(c: PixelCanvas) {
  // Popocatépetl (cone) and Iztaccíhuatl (long ridge) far away
  c.paint((x, y) => {
    const popo = 44 + Math.abs(x - 70) * 0.55;
    const izta = 54 - Math.max(0, 6 - Math.abs(x - 150) * 0.08) + Math.sin(x / 6) * 1.5 + Math.abs(x - 150) * 0.12;
    const t = Math.min(popo, izta);
    if (y < t) return null;
    const snow = y < t + (t === popo ? 7 : 4) + Math.sin(x) * 1;
    const shade = x > 70 && t === popo;
    return snow ? (shade ? P.snowShade : P.snow) : shade ? P.volcanoShade : bayer(x, y) < 0.2 ? P.volcanoShade : P.volcano;
  }, 0, 40, W - 1, 80);
}

function torreLatino(c: PixelCanvas, x: number) {
  for (let y = 26; y < 92; y++) {
    const w = y < 34 ? 5 : y < 44 ? 7 : 9;
    const x0 = x - Math.floor(w / 2);
    for (let px = x0; px < x0 + w; px++) c.set(px, y, px === x0 + w - 1 ? P.glassDark : (y % 3 === 0) ? P.glassLight : P.glass);
  }
  c.rect(x, 14, 1, 12, P.glassDark);
}

function bellasArtes(c: PixelCanvas, cx: number) {
  const base = 92;
  // wings with arched windows and columns
  c.rect(cx - 44, 60, 89, base - 60, P.marble);
  c.rect(cx + 40, 60, 5, base - 60, P.marbleShade);
  c.hline(cx - 44, cx + 44, 60, P.marbleDark);
  c.hline(cx - 45, cx + 45, 59, P.marble);
  for (let x = cx - 41; x < cx + 41; x += 6) {
    c.rect(x, 64, 3, 8, P.window);
    c.set(x, 64, P.marble); c.set(x + 2, 64, P.marble);
    c.rect(x + 4, 62, 1, 28, P.marbleShade);
    c.rect(x, 77, 3, 6, P.window);
  }
  // sculpted cornice
  for (let x = cx - 44; x <= cx + 44; x += 2) c.set(x, 61, P.marbleDark);
  // central portal with its tall arch and bronze groups
  c.rect(cx - 12, 54, 25, base - 54, P.marble);
  c.rect(cx - 5, 70, 11, base - 70, P.window);
  for (let y = 66; y < 70; y++) c.hline(cx - 5 + (70 - y) - 1, cx + 5 - (70 - y) + 1, y, P.window);
  for (const dx of [-10, 9]) { c.rect(cx + dx, 56, 2, 36, P.marbleShade); c.rect(cx + dx - 1, 52, 4, 3, P.bronze); }
  // the great dome: ribbed, golden, with a lantern and the eagle
  for (let y = 26; y < 54; y++) {
    const hw = Math.sqrt(Math.max(0, 1 - ((54 - y) / 26) ** 2)) * 16;
    for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) {
      const rib = Math.abs(((x - cx) / Math.max(1, hw)) * 4 % 1) < 0.18;
      c.set(x, y, rib ? P.rib : x < cx - hw * 0.3 ? P.domeLight : x > cx + hw * 0.4 ? P.domeDark : P.dome);
    }
  }
  c.rect(cx - 3, 22, 7, 4, P.marble);
  for (let y = 16; y < 22; y++) c.hline(cx - Math.floor((y - 15) / 2), cx + Math.floor((y - 15) / 2), y, P.dome);
  c.set(cx, 14, P.bronze); c.set(cx - 1, 15, P.bronze); c.set(cx + 1, 15, P.bronze);
  // smaller domes over the wings
  for (const dx of [-32, 32]) {
    for (let y = 48; y < 59; y++) {
      const hw = Math.sqrt(Math.max(0, 1 - ((59 - y) / 11) ** 2)) * 7;
      c.hline(Math.round(cx + dx - hw), Math.round(cx + dx + hw), y, y < 52 ? P.domeLight : P.dome);
    }
    c.set(cx + dx, 47, P.bronze);
  }
}

/** Cut-paper bunting strung across the top of the picture. */
function papelPicado(c: PixelCanvas, x0: number, x1: number, y: number) {
  for (let x = x0; x <= x1; x++) c.set(x, y + Math.round(3 * Math.sin((Math.PI * (x - x0)) / (x1 - x0))), "#5a4636");
  let i = 0;
  for (let x = x0 + 1; x < x1 - 6; x += 8) {
    const yy = y + 1 + Math.round(3 * Math.sin((Math.PI * (x + 3 - x0)) / (x1 - x0)));
    const col = P.picado[i++ % P.picado.length]!;
    // cut-outs show the sky behind, so remember it before laying the paper down
    const holes: [number, number][] = [[x + 2, yy + 2], [x + 4, yy + 2], [x + 3, yy + 4], [x, yy + 6], [x + 2, yy + 6], [x + 4, yy + 6], [x + 6, yy + 6]];
    const under = holes.map(([hx, hy]) => c.get(hx, hy));
    c.rect(x, yy, 7, 7, col);
    holes.forEach(([hx, hy], k) => c.set(hx, hy, under[k] ?? null));
  }
}

export const mexicoCityScene: PostcardScene = {
  cityId: "mexico-city",
  accent: "#d6336c",
  description: "Pixel-art view of Mexico City: the white-marble Palacio de Bellas Artes with its ribbed golden dome, the glass Torre Latinoamericana, the snowy volcanoes Popocatépetl and Iztaccíhuatl in the distance, purple jacarandas in bloom, colourful papel picado and people in the Alameda.",
  draw(c) {
    sky(c, P.sky);
    cloud(c, 150, 196, 40, P.cloud, P.cloudShade);
    volcanoes(c);
    ridge(c, (x) => 80 + Math.sin(x / 7), "#8aa07a");
    torreLatino(c, 34);
    bellasArtes(c, 116);
    c.paint((x, y) => (bayer(x, y) < 0.18 ? P.plazaDither : P.plaza), 0, 92, W - 1, H - 1);
    for (let x = 0; x < W; x += 8) c.hline(x, x + 3, 100, P.plazaDither);
    for (const [x, y, r, sd] of [[10, 90, 14, 1], [196, 88, 15, 2], [62, 96, 9, 3], [170, 98, 8, 4]] as const) {
      c.rect(x, y, 2, 12, P.trunk);
      foliage(c, 350 + sd, x + 1, y - r * 0.4, r, P.jacaranda);
    }
    const r = rng(355);
    for (let i = 0; i < 30; i++) c.set(Math.floor(r() * W), 100 + Math.floor(r() * 8), P.jacaranda[3]!); // fallen blossoms
    people(c, 356, 104, 30, 200, 16, P.coats);
    papelPicado(c, -2, 150, 4);
  },
  drawStamp(c, x, y, w, h) {
    c.rect(x, y, w, h, "#d6336c");
    const cx = x + w / 2 - 0.5;
    for (let yy = y + 4; yy < y + h - 5; yy++) {
      const hw = Math.sqrt(Math.max(0, 1 - ((y + h - 5 - yy) / (h - 9)) ** 2)) * 7;
      c.hline(Math.round(cx - hw), Math.round(cx + hw), yy, P.dome);
    }
    c.rect(x + 2, y + h - 5, w - 4, 5, P.marble);
    c.set(Math.round(cx), y + 3, P.marble);
  },
};
