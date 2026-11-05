import { bayer, rng, type PixelCanvas } from "../pixel/canvas";
import type { PostcardScene } from "../template";
import { W, H, birds, cloud, leaf, people, sky } from "./common";

/** Berlin: the Brandenburg Gate and its Quadriga at Pariser Platz, the TV tower behind, Tiergarten trees, cyclists. */
const P = {
  sky: ["#5a88c4", "#7ea4d4", "#a8c4e2", "#d4e2ec", "#f0eee4"],
  cloud: "#fbfaf4", cloudShade: "#d4dee8",
  tv: "#c8ccd4", tvShade: "#9aa0ac", ball: "#b8bec8", ballShade: "#8a92a0", ballLight: "#e8ecf0", tvRed: "#c8432f",
  sand: "#e2d0a8", sandShade: "#c4ae84", sandDeep: "#a08a64", sandLight: "#f2e4c4", gap: "#5a5248",
  bronze: "#5a8a74", bronzeLight: "#7aaa90", bronzeDark: "#3f6a58",
  tree: "#4f8a4a", treeLight: "#6fa85a", treeDark: "#3a6a3e",
  city: "#c8c4bc", cityShade: "#a8a49c", cityWin: "#7a8a9a",
  paving: "#c8c0b0", pavingDark: "#a8a090", line: "#e8e2d4",
  bike: "#2f3346", flag: ["#2f2f2f", "#c8322a", "#f2c12e"],
  coats: ["#2f3346", "#c8432f", "#2f6fb0", "#f2c14e", "#f3ead8", "#5a8a5a"],
};

function tvTower(c: PixelCanvas) {
  const x = 176;
  c.rect(x, 22, 3, 52, P.tv);
  for (let y = 22; y < 74; y++) c.set(x + 2, y, P.tvShade);
  c.disc(x + 1, 22, 7, P.ball);
  for (let i = -7; i <= 7; i++) for (let j = -7; j <= 7; j++) if (i * i + j * j <= 49 && i > 2) c.set(x + 1 + i, 22 + j, P.ballShade);
  c.disc(x - 1, 19, 2, P.ballLight);
  c.hline(x - 6, x + 8, 22, P.tvShade); // observation band
  c.rect(x, 2, 2, 13, P.tv);
  for (let y = 2; y < 15; y += 3) c.set(x, y, P.tvRed);
}

function cityRow(c: PixelCanvas) {
  const r = rng(13);
  for (let x = 0; x < W; x += 9 + Math.floor(r() * 5)) {
    const t = 52 + Math.floor(r() * 10), w = 9 + Math.floor(r() * 5);
    c.rect(x, t, w, 92 - t, r() < 0.4 ? P.cityShade : P.city);
    for (let y = t + 3; y < 90; y += 4) for (let i = x + 2; i < x + w - 2; i += 3) c.rect(i, y, 1, 2, P.cityWin);
  }
}

function gate(c: PixelCanvas) {
  // six pairs of Doric columns forming five passages, attic with relief, Quadriga on top
  const x0 = 54, x1 = 170, base = 92, colTop = 50;
  // the two side wings (guard houses)
  for (const [wx0, wx1] of [[x0 - 20, x0 - 2], [x1 + 2, x1 + 20]] as const) {
    c.rect(wx0, 66, wx1 - wx0, base - 66, P.sand);
    c.hline(wx0, wx1 - 1, 66, P.sandLight);
    for (let x = wx0 + 2; x < wx1 - 2; x += 4) c.rect(x, 70, 2, base - 70, P.sandShade);
  }
  // columns
  const cols = 6, span = (x1 - x0) / (cols - 1);
  for (let i = 0; i < cols; i++) {
    const cx = Math.round(x0 + i * span);
    for (const dx of [-5, 1]) {
      c.rect(cx + dx, colTop, 4, base - colTop, P.sand);
      c.rect(cx + dx + 3, colTop, 1, base - colTop, P.sandShade);
      c.set(cx + dx + 1, colTop + 4, P.sandShade);
      for (let y = colTop + 2; y < base; y += 2) c.set(cx + dx + 1, y, P.sandShade); // fluting
      c.hline(cx + dx - 1, cx + dx + 4, colTop, P.sandLight); // capital
    }
  }
  // the passages are open — the street shows through; only the soffit under the beam is in shadow
  for (let i = 0; i < cols - 1; i++) {
    const a = Math.round(x0 + i * span) + 5, b = Math.round(x0 + (i + 1) * span) - 6;
    for (let x = a; x <= b; x++) { c.set(x, colTop + 1, P.sandDeep); if (bayer(x, colTop + 2) < 0.5) c.set(x, colTop + 2, P.sandDeep); }
  }
  // entablature and attic
  c.rect(x0 - 8, colTop - 6, x1 - x0 + 16, 6, P.sand);
  c.hline(x0 - 8, x1 + 7, colTop - 6, P.sandLight);
  for (let x = x0 - 6; x < x1 + 6; x += 4) c.rect(x, colTop - 4, 2, 2, P.sandShade); // triglyphs
  c.rect(x0 + 10, colTop - 14, x1 - x0 - 20, 8, P.sand);
  c.hline(x0 + 10, x1 - 11, colTop - 14, P.sandLight);
  for (let x = x0 + 14; x < x1 - 14; x += 3) c.set(x, colTop - 10, P.sandShade); // relief
  // Quadriga: Victoria in her chariot with four horses, green bronze
  const qx = 112, qy = colTop - 15;
  c.rect(qx - 12, qy - 2, 24, 2, P.bronzeDark);
  for (const hx of [qx - 11, qx - 6, qx + 2, qx + 7]) {
    c.rect(hx, qy - 6, 4, 3, P.bronze); // body
    c.rect(hx + 3, qy - 9, 2, 3, P.bronze); // neck
    c.set(hx + 4, qy - 10, P.bronzeLight);
    c.set(hx, qy - 3, P.bronzeDark); c.set(hx + 3, qy - 3, P.bronzeDark); // legs
  }
  c.rect(qx - 1, qy - 13, 3, 7, P.bronzeLight); // Victoria
  c.set(qx, qy - 14, P.bronzeLight);
  c.line(qx + 2, qy - 12, qx + 6, qy - 20, P.bronzeDark); // staff with the iron cross wreath
  c.disc(qx + 6, qy - 21, 1.5, P.bronze);
  c.line(qx - 2, qy - 11, qx - 6, qy - 15, P.bronze); c.line(qx - 2, qy - 10, qx - 7, qy - 12, P.bronze); // wings
}

function tiergarten(c: PixelCanvas) {
  for (const [x0, x1] of [[0, 34], [190, W]] as const) {
    c.paint((x, y) => {
      const t = 54 + Math.sin(x / 4) * 3 + Math.sin(x / 9) * 2;
      if (y < t || y > 92) return null;
      const l = leaf(x, y);
      return l < 0.2 ? P.treeLight : l > 0.8 ? P.treeDark : P.tree;
    }, x0, 46, x1 - 1, 92);
  }
}

function platz(c: PixelCanvas) {
  c.paint((x, y) => {
    // paving converging towards the gate
    const rows = (y - 92) % 4 === 0;
    const radial = Math.round((x - 112) / Math.max(1, (y - 88) * 0.35)) % 4 === 0;
    return rows || radial ? P.pavingDark : P.paving;
  }, 0, 92, W - 1, H - 1);
  // the cobblestone line marking where the Wall stood
  for (let x = 0; x < W; x++) { c.set(x, 99, P.gap); c.set(x, 100, (x % 3) ? P.pavingDark : P.gap); }
  people(c, 71, 106, 10, 214, 14, P.coats, "#e3b48f");
  // cyclists
  for (const bx of [36, 150]) {
    for (const wx of [bx, bx + 7]) { c.disc(wx, 103, 2.2, P.bike); c.set(wx, 103, P.paving); }
    c.line(bx, 103, bx + 4, 100, P.bike); c.line(bx + 4, 100, bx + 7, 103, P.bike); c.hline(bx + 2, bx + 6, 100, P.bike);
    c.rect(bx + 3, 95, 2, 5, P.coats[(bx / 2) % P.coats.length]!); c.set(bx + 4, 94, "#e3b48f"); c.set(bx + 3, 93, P.coats[1]!);
  }
  // flag
  c.rect(28, 76, 1, 20, P.bike);
  for (let k = 0; k < 3; k++) c.rect(29, 76 + k * 2, 8, 2, P.flag[k]!);
}

export const berlinScene: PostcardScene = {
  cityId: "berlin",
  accent: "#c8322a",
  windowFocus: [112, 50],
  description: "Pixel-art view of Berlin: the sandstone Brandenburg Gate with its paired Doric columns, attic and the green bronze Quadriga of Victoria and four horses, the Fernsehturm TV tower rising behind, buildings and the Tiergarten's trees on either side, and Pariser Platz with the cobblestone line where the Wall stood, cyclists, walkers and a German flag.",
  draw(c) {
    sky(c, P.sky, 74);
    cloud(c, 14, 70, 14, P.cloud, P.cloudShade, 3);
    cloud(c, 120, 150, 8, P.cloud, P.cloudShade);
    birds(c, 4, 60, 18, 120, 30, 5, "#3a4a5a");
    cityRow(c);
    tvTower(c);
    tiergarten(c);
    gate(c);
    platz(c);
  },
  drawStamp(c, x, y, w, h) {
    c.gradient(y, y + h - 1, [P.sky[1]!, P.sky[3]!], x, x + w - 1);
    const base = y + h - 2;
    c.rect(x + 2, base - 11, w - 4, 3, P.sand);
    for (let i = x + 3; i < x + w - 3; i += 3) c.rect(i, base - 8, 1, 8, P.sand);
    c.rect(x + Math.floor(w / 2) - 3, base - 14, 7, 3, P.bronze);
  },
};
