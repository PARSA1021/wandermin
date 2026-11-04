import { bayer, rng, type PixelCanvas } from "../pixel/canvas";
import type { PostcardScene } from "../template";
import { W, H, birds, cloud, people, sky } from "./common";

/** Melbourne: Flinders Street Station's ochre façade, copper dome and clocks, a green-and-gold tram, the city towers behind. */
const P = {
  sky: ["#4a6aa8", "#6a88bc", "#9cb2d4", "#d2d8e0", "#f0e6d0"],
  cloud: "#f8f4ec", cloudShade: "#d8dde4",
  tower: "#8f9cb0", towerShade: "#76849a", window: "#d8e0e8", gold: "#d8b04a",
  ochre: "#e0a050", ochreShade: "#b87a34", ochreLight: "#f0c078", cream: "#f3e6c8", brick: "#a8502e",
  copper: "#5f9a86", copperDark: "#47786a", clock: "#f3ead8", hand: "#2b2b33",
  street: "#6a6a72", streetLight: "#8a8a92", rail: "#4a4a52", kerb: "#b9b3a6",
  tramGreen: "#3d7a4f", tramGold: "#e2b84a", tramCream: "#f3e6c8", tramWindow: "#3d4560",
  coats: ["#2f3346", "#c8432f", "#3a5a9a", "#e2b84a", "#f3ead8", "#3d7a4f"],
};

function towers(c: PixelCanvas) {
  const r = rng(371);
  for (let x = 0; x < W; x += 6 + Math.floor(r() * 4)) {
    const t = 34 + Math.floor(r() * 26), w = 5 + Math.floor(r() * 5);
    if (x > 160 && x < 196 && t < 52) continue;
    c.rect(x, t, w, 70 - t, r() < 0.5 ? P.tower : P.towerShade);
    for (let y = t + 2; y < 68; y += 2) for (let i = x + 1; i < x + w - 1; i += 2) if (r() < 0.4) c.set(i, y, P.window);
  }
  // Eureka-like tower with its gold crown
  c.rect(30, 18, 9, 52, P.tower);
  c.rect(36, 18, 3, 52, P.towerShade);
  c.rect(30, 18, 9, 8, P.gold);
  c.rect(36, 18, 3, 8, "#b08c34");
  for (let y = 28; y < 68; y += 2) c.hline(31, 35, y, P.window);
}

function station(c: PixelCanvas) {
  const x0 = 8, x1 = 216, top = 62, base = 92;
  c.rect(x0, top, x1 - x0, base - top, P.ochre);
  c.hline(x0, x1 - 1, top, P.ochreLight);
  c.hline(x0, x1 - 1, top + 12, P.cream);
  // arched windows in two storeys with cream bands
  for (let x = x0 + 3; x < x1 - 4; x += 6) {
    for (const wy of [top + 3, top + 15]) {
      c.rect(x, wy, 3, 7, P.cream);
      c.rect(x + 1, wy + 1, 1, 6, P.tramWindow);
    }
    c.rect(x + 4, top + 1, 1, base - top - 1, P.ochreShade);
  }
  // corner towers with small copper domes
  for (const tx of [x0, x1 - 10]) {
    c.rect(tx, top - 12, 10, 12, P.ochre);
    c.rect(tx + 8, top - 12, 2, base - top + 12, P.ochreShade);
    for (let y = top - 18; y < top - 12; y++) { const hw = Math.sqrt(Math.max(0, 1 - ((top - 12 - y) / 6) ** 2)) * 5; c.hline(Math.round(tx + 5 - hw), Math.round(tx + 5 + hw), y, P.copper); }
    c.set(tx + 5, top - 19, P.gold);
  }
  // central dome over the main entrance
  const cx = 104;
  c.rect(cx - 16, top - 10, 33, 10, P.ochre);
  c.rect(cx + 14, top - 10, 3, 10, P.ochreShade);
  for (let y = top - 30; y < top - 10; y++) {
    const hw = Math.sqrt(Math.max(0, 1 - ((top - 10 - y) / 20) ** 2)) * 15;
    c.hline(Math.round(cx - hw), Math.round(cx + hw), y, y < top - 22 ? P.copper : bayer(cx, y) < 0.5 ? P.copper : P.copperDark);
  }
  c.rect(cx - 2, top - 34, 5, 4, P.ochre);
  c.set(cx, top - 36, P.gold); c.set(cx, top - 35, P.gold);
  // the famous row of clocks above the entrance
  for (let k = 0; k < 9; k++) {
    const kx = cx - 16 + k * 4;
    c.rect(kx, base - 12, 3, 3, P.clock);
    c.set(kx + 1, base - 11, P.hand);
  }
  // entrance arch and steps
  c.rect(cx - 8, base - 8, 17, 8, P.tramWindow);
  c.hline(cx - 8, cx + 8, base - 8, P.cream);
  c.hline(x0, x1 - 1, base - 1, P.brick);
}

function street(c: PixelCanvas) {
  c.rect(0, 92, W, 3, P.kerb);
  c.rect(0, 95, W, H - 95, P.street);
  c.paint((x, y) => (bayer(x, y) < 0.08 ? P.streetLight : null), 0, 95, W - 1, H - 1);
  c.hline(0, W - 1, 104, P.rail);
  c.hline(0, W - 1, 106, P.rail);
  // overhead tram wires
  c.hline(0, W - 1, 80, P.rail);
  for (let x = 20; x < W; x += 60) { c.rect(x, 80, 1, 12, P.rail); }
  people(c, 372, 92, 0, 220, 18, P.coats);
}

function tram(c: PixelCanvas, x0: number) {
  const y = 104;
  c.rect(x0, y - 14, 44, 12, P.tramGreen);
  c.rect(x0, y - 14, 44, 2, P.tramCream);
  c.hline(x0, x0 + 43, y - 6, P.tramGold);
  for (let x = x0 + 3; x < x0 + 41; x += 4) c.rect(x, y - 11, 3, 4, P.tramWindow);
  c.rect(x0 + 2, y - 16, 40, 2, P.tramGreen);
  c.line(x0 + 22, y - 16, x0 + 26, 81, P.rail); // pantograph to the wire
  c.rect(x0, y - 2, 44, 2, P.rail);
  for (const wx of [x0 + 6, x0 + 14, x0 + 30, x0 + 38]) c.set(wx, y, "#2b2b33");
  c.set(x0 + 43, y - 4, "#f2cf6a");
}

export const melbourneScene: PostcardScene = {
  cityId: "melbourne",
  accent: "#3d7a4f",
  description: "Pixel-art view of Melbourne: Flinders Street Station's ochre façade with arched windows, copper domes and its row of clocks, a green-and-gold tram under the overhead wires, busy pavements and the city towers behind.",
  draw(c) {
    sky(c, P.sky);
    cloud(c, 60, 110, 16, P.cloud, P.cloudShade, 3);
    cloud(c, 140, 180, 30, P.cloud, P.cloudShade);
    birds(c, 373, 60, 10, 150, 26, 5, "#3a4466");
    towers(c);
    station(c);
    street(c);
    tram(c, 140);
  },
  drawStamp(c, x, y, w, h) {
    c.rect(x, y, w, h, "#f3e6c8");
    c.rect(x + 1, y + h - 10, w - 2, 7, P.tramGreen);
    c.hline(x + 1, x + w - 2, y + h - 10, P.tramCream);
    c.hline(x + 1, x + w - 2, y + h - 5, P.tramGold);
    for (let xx = x + 2; xx < x + w - 3; xx += 4) c.rect(xx, y + h - 8, 2, 2, P.tramWindow);
    c.hline(x, x + w - 1, y + h - 2, P.rail);
    c.line(x + w / 2, y + h - 11, x + w / 2 + 2, y + 2, P.rail);
  },
};
