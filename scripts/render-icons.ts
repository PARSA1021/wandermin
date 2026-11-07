/**
 * App icons, drawn with the postcard pixel engine. The picture is the app in one glance: the window seat
 * (a round plane window with a dusk sky, clouds and the wing) inside the red focus ring, with the little
 * airliner riding the ring like the timer does. A simpler drawing is used for the 32 px favicon.
 * Everything that matters stays inside the maskable safe zone (the centre 80 %).
 */
import { mkdirSync, writeFileSync, copyFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { PixelCanvas, type Color } from "@/features/postcards/pixel/canvas";

const NAVY = "#283152", NAVY_DEEP = "#1d2440", TRACK = "#3b4570";
const CREAM = "#f4ecd8", CREAM_SHADE = "#d9c9a3";
const RED = "#c8322a", RED_DARK = "#9e2720";
const SKY = ["#2c3570", "#4b4f8e", "#7a5a96", "#c46f88", "#f0a072"]; // dusk, top → horizon
const SUN = "#ffe2a6", CLOUD = "#f6c9a8", CLOUD_SHADE = "#d99a9a";
const WING = "#c6ccd8", WING_LIGHT = "#e9edf3", WING_DARK = "#8e96a6";

const PLANE = ["..#..", ".###.", "#####", "..#..", ".###."]; // seen from above, nose up (it climbs the left side of the ring)

function draw(n: number, detailed: boolean, scale: number): PixelCanvas {
  const c = new PixelCanvas(n, n);
  const k = (n / 64) * scale; // design grid is 64 × 64; the app icon is scaled into the maskable safe zone
  const cx = n / 2 - 0.5, cy = n / 2 - 0.5;
  const d = (x: number, y: number) => Math.hypot(x - cx, y - cy);
  const ang = (x: number, y: number) => (Math.atan2(x - cx, -(y - cy)) + 2 * Math.PI) % (2 * Math.PI); // 0 at top, clockwise

  // background: flat navy (a deeper navy only behind the ring's shadow)
  c.rect(0, 0, n, n, NAVY);

  // the focus ring: a dark track and the red progress arc (three quarters flown)
  const r0 = 25.5 * k, r1 = 29.5 * k, done = 0.75 * 2 * Math.PI;
  c.paint((x, y) => (d(x, y) >= r1 && d(x, y) < r1 + 1.2 * k && (x - cx) + (y - cy) > 0 ? NAVY_DEEP : null));
  c.paint((x, y) => {
    const r = d(x, y);
    if (r < r0 || r > r1) return null;
    return ang(x, y) <= done ? (r > r1 - 1.2 * k && detailed ? RED_DARK : RED) : TRACK;
  });

  // the window frame: cream, shaded towards the lower right
  const f0 = 19.5 * k, f1 = 23.5 * k;
  c.paint((x, y) => {
    const r = d(x, y);
    if (r < f0 || r > f1) return null;
    return (x - cx) + (y - cy) > 6 * k && r > f0 + 1 ? CREAM_SHADE : CREAM;
  });

  // dusk sky inside, dithered between bands
  const inner = f0;
  const top = cy - inner, h = inner * 2;
  c.paint((x, y) => {
    if (d(x, y) >= inner) return null;
    // flat bands with a single dithered row between them, the way the postcards do skies
    const t = Math.max(0, Math.min(0.999, (y - top) / h)) * SKY.length;
    const i = Math.floor(t), f = t - i;
    const edge = f > 1 - 1 / (h / SKY.length) && i + 1 < SKY.length && (x + y) % 2 === 0;
    return (edge ? SKY[i + 1] : SKY[i]) as Color;
  });
  const inside = (x: number, y: number) => d(x, y) < inner;
  const put = (x: number, y: number, col: Color) => { const X = Math.round(x), Y = Math.round(y); if (inside(X, Y)) c.set(X, Y, col); };

  // the setting sun, low on the right
  c.paint((x, y) => (inside(x, y) && Math.hypot(x - (cx + 9 * k), y - (cy + 7 * k)) < 4.4 * k ? SUN : null));
  if (detailed) {
    // a few flat pixel clouds
    const cloud = (x: number, y: number, w: number) => {
      for (let i = 0; i < w; i++) { put(x + i, y + 1, CLOUD); put(x + i, y + 2, CLOUD_SHADE); }
      for (let i = 1; i < w - 2; i++) put(x + i, y, CLOUD);
    };
    cloud(cx - 14 * k, cy - 4 * k, Math.round(10 * k));
    cloud(cx + 2 * k, cy - 10 * k, Math.round(8 * k));
    cloud(cx - 3 * k, cy + 10 * k, Math.round(7 * k));
    // stars in the darker top of the sky
    for (const [sx, sy] of [[-6, -14], [5, -15], [-12, -9], [11, -6]] as const) put(cx + sx * k, cy + sy * k, "#f4ecd8");
  }

  // the wing, sweeping in from the lower left, with its red navigation light
  const wing: [number, number][] = [[cx - 22 * k, cy + 9 * k], [cx + 3 * k, cy + 2 * k], [cx + 5 * k, cy + 3 * k], [cx - 10 * k, cy + 22 * k], [cx - 22 * k, cy + 22 * k]];
  c.paint((x, y) => {
    if (!inside(x, y)) return null;
    // point-in-polygon
    let hit = false;
    for (let i = 0, j = wing.length - 1; i < wing.length; j = i++) {
      const [xi, yi] = wing[i]!, [xj, yj] = wing[j]!;
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
    }
    if (!hit) return null;
    // leading edge highlight, underside shade
    const lead = (y - (cy + 9 * k)) - ((x - (cx - 22 * k)) * (-7 / 25));
    return lead < 1.6 * k ? WING_LIGHT : (x - cx) + (y - cy) > 14 * k ? WING_DARK : WING;
  });
  put(cx + 3.5 * k, cy + 1.5 * k, RED);
  if (k >= 1) put(cx + 4.5 * k, cy + 1.5 * k, RED);

  // the little airliner riding the end of the arc, on a cream disc like the timer's
  const a = done, pr = (r0 + r1) / 2;
  const px = cx + Math.sin(a) * pr, py = cy - Math.cos(a) * pr;
  const discR = (detailed ? 6 : 5.6) * k;
  c.paint((x, y) => {
    const r = Math.hypot(x - px, y - py);
    return r < discR - 1.3 * k ? CREAM : r < discR ? RED : null;
  });
  if (detailed) {
    const s = Math.max(1, Math.round(k * 1.5)); // plane pixel size
    const ox = Math.round(px - (PLANE[0]!.length * s) / 2 + 0.5), oy = Math.round(py - (PLANE.length * s) / 2 + 0.5);
    // the plane heads along the ring (clockwise at about 10 o'clock → up and to the right)
    PLANE.forEach((row, j) => [...row].forEach((b, i) => { if (b === "#") c.rect(ox + i * s, oy + j * s, s, s, NAVY); }));
  } else {
    c.disc(px, py, 1.4 * k, NAVY);
  }
  return c;
}

mkdirSync("public/icons", { recursive: true });
const svgOf = (c: PixelCanvas) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${c.width} ${c.height}" shape-rendering="crispEdges">${c.toSvgPaths()}</svg>`;
const big = draw(64, true, 0.76);
writeFileSync("public/icons/icon.svg", svgOf(big));
for (const size of [180, 192, 512]) execFileSync("rsvg-convert", ["-w", String(size), "-h", String(size), "-o", `public/icons/icon-${size}.png`, "public/icons/icon.svg"]);
// favicon: drawn natively at 32 px so it stays crisp and readable in a browser tab
writeFileSync("public/icons/icon-32.svg", svgOf(draw(32, false, 0.95)));
execFileSync("rsvg-convert", ["-w", "32", "-h", "32", "-o", "public/icons/icon-32.png", "public/icons/icon-32.svg"]);
copyFileSync("public/icons/icon-180.png", "src/app/apple-icon.png");
copyFileSync("public/icons/icon-32.png", "src/app/icon.png");
console.log("icons written");
