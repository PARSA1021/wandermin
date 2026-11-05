import { bayer, rng, type Color, type PixelCanvas } from "../pixel/canvas";

/** Shared drawing helpers for postcard scenes. Every scene is 224 × 108 art pixels. */
export const W = 224;
export const H = 108;

export function sky(c: PixelCanvas, stops: Color[], horizon = 74) {
  c.gradient(0, horizon, stops);
  c.rect(0, horizon + 1, W, H - horizon - 1, stops.at(-1)!);
}

/** Long thin vintage-poster cloud, tapered at both ends. */
export function cloud(c: PixelCanvas, x0: number, x1: number, y: number, light: Color, shade: Color, thick = 2) {
  for (let x = x0; x <= x1; x++) {
    const t = Math.min(thick, Math.max(1, Math.round(Math.min(x - x0, x1 - x) / 6)));
    for (let k = 0; k < t; k++) c.set(x, y - k, k === 0 && t > 1 ? shade : light);
  }
}

/** Fill everything below the curve `top(x)`, with an optional darker crest line and dither. */
export function ridge(c: PixelCanvas, top: (x: number) => number, fill: Color, crest?: Color, dither?: Color, ditherAmt = 0.12) {
  c.paint((x, y) => {
    const t = top(x);
    if (y < t) return null;
    if (crest && y - t < 1) return crest;
    if (dither && bayer(x, y) < ditherAmt) return dither;
    return fill;
  });
}

/** A row of rounded bushes/trees along `baseY`. */
export function treeRow(c: PixelCanvas, seed: number, baseY: number, body: Color, light: Color, dark: Color, x0 = -4, x1 = W + 6, size = 1) {
  const r = rng(seed);
  for (let x = x0; x < x1; x += 6 + Math.floor(r() * 4)) {
    const rad = (4 + r() * 3.5) * size;
    const cy = baseY - r() * 3;
    c.disc(x, cy, rad, body);
    c.disc(x - 1.5, cy - 1.5, rad * 0.45, light);
    for (let i = -rad; i < rad; i++) if (bayer(x + i, cy + rad) < 0.5) c.set(x + i, Math.round(cy + rad * 0.6), dark);
  }
}

/** Calm water from `y0` to the bottom with a shoreline shadow and light ripples. */
export function water(c: PixelCanvas, y0: number, body: Color, light: Color, dark: Color, seed = 99) {
  const r = rng(seed);
  c.rect(0, y0, W, H - y0, body);
  c.hline(0, W - 1, y0, dark);
  c.paint((x, y) => (bayer(x, y) < 0.25 ? dark : null), 0, y0 + 1, W - 1, y0 + 1);
  for (let i = 0; i < 40; i++) {
    const y = y0 + 2 + Math.floor(r() * (H - y0 - 2)), x = Math.floor(r() * W), len = 2 + Math.floor(r() * 6);
    c.hline(x, x + len, y, light);
  }
}

/** Dithered vertical reflection of a coloured column into water. */
export function reflection(c: PixelCanvas, cx: number, halfW: number, y0: number, color: Color, amt = 0.35) {
  for (let y = y0; y < H; y++) {
    const w = halfW - (y - y0) * 0.5;
    for (let x = Math.round(cx - w); x <= Math.round(cx + w); x++) if (bayer(x, y) < amt && (y & 1)) c.set(x, y, color);
  }
}

/**
 * East-Asian tiled roof with a concave sweep and upturned eave tips.
 * Covers `top` .. `top + h`; returns the y of the eave line.
 */
export function roof(c: PixelCanvas, cx: number, top: number, h: number, topHalf: number, baseHalf: number, tile: Color, eave: Color, ridgeColor?: Color) {
  for (let k = 0; k < h; k++) {
    const hw = topHalf + (baseHalf - topHalf) * Math.pow(k / Math.max(1, h - 1), 1.8);
    c.hline(Math.round(cx - hw), Math.round(cx + hw), top + k, tile);
    if (ridgeColor && k > 0 && k < h - 1) for (let x = Math.round(cx - hw) + 1; x < cx + hw; x += 3) c.set(x, top + k, ridgeColor);
  }
  const y = top + h;
  c.hline(Math.round(cx - baseHalf + 1), Math.round(cx + baseHalf - 1), y, eave);
  // upturned tips
  c.set(Math.round(cx - baseHalf) - 1, y - 2, tile);
  c.set(Math.round(cx + baseHalf) + 1, y - 2, tile);
  c.set(Math.round(cx - baseHalf), y - 1, tile);
  c.set(Math.round(cx + baseHalf), y - 1, tile);
  if (ridgeColor) c.hline(Math.round(cx - topHalf), Math.round(cx + topHalf), top, ridgeColor);
  return y;
}

/** Five-petal blossom dot used for cherry and plum branches. */
export function blossom(c: PixelCanvas, x: number, y: number, petal: Color, centre: Color, shade: Color) {
  c.disc(x, y, 1.6, petal);
  c.set(x, y, centre);
  c.set(x + 1, y + 1, shade);
}

/**
 * Irregular foliage clump (maple, forsythia, cherry): a cluster of overlapping lobes,
 * lit from the top-left with a dithered shadow at the lower right. colors = [body, light, dark, ...accents].
 */
export function foliage(c: PixelCanvas, seed: number, cx: number, cy: number, rad: number, colors: Color[]) {
  const r = rng(seed);
  const [body, light, dark] = [colors[0]!, colors[1] ?? colors[0]!, colors[2] ?? colors[0]!];
  const accents = colors.slice(3);
  const lobes: [number, number, number][] = [[cx, cy, rad * 0.62]];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + r() * 0.6;
    const d = rad * (0.38 + r() * 0.2);
    lobes.push([cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.85, rad * (0.36 + r() * 0.16)]);
  }
  const inside = (x: number, y: number) => lobes.some(([lx, ly, lr]) => (x - lx) ** 2 + (y - ly) ** 2 <= lr * lr);
  const x0 = Math.floor(cx - rad - 2), x1 = Math.ceil(cx + rad + 2);
  const y0 = Math.floor(cy - rad - 2), y1 = Math.ceil(cy + rad + 2);
  c.paint((x, y) => {
    if (!inside(x, y)) return null;
    const lightSide = (x - cx) + (y - cy) < -rad * 0.35;
    const darkSide = (x - cx) * 0.6 + (y - cy) > rad * 0.35;
    if (!inside(x, y - 1) && !lightSide) return light; // rim light along upper edges
    if (darkSide) return bayer(x, y) < 0.6 ? dark : body;
    if (lightSide) return bayer(x, y) < 0.5 ? light : body;
    return body;
  }, x0, y0, x1, y1);
  // flecks of blossom / leaf colour
  for (let i = 0; i < rad * rad * 0.35 && accents.length; i++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r()) * rad;
    const x = Math.round(cx + Math.cos(a) * d), y = Math.round(cy + Math.sin(a) * d);
    if (inside(x, y)) c.set(x, y, accents[Math.floor(r() * accents.length)]!);
  }
}

/* ------------------------------------------------------------------ */
/* Street-level detail used by the European scenes                     */
/* ------------------------------------------------------------------ */

/** Tiny pedestrians (4 px tall) standing on `y`. */
export function people(c: PixelCanvas, seed: number, y: number, x0: number, x1: number, count: number, clothes: Color[], skin = "#e3b48f", legs = "#2f3346") {
  const r = rng(seed);
  for (let i = 0; i < count; i++) {
    const x = Math.round(x0 + r() * (x1 - x0));
    const coat = clothes[Math.floor(r() * clothes.length)]!;
    c.set(x, y - 4, skin);
    c.set(x, y - 3, coat);
    c.set(x, y - 2, coat);
    if (r() < 0.5) c.set(x + 1, y - 3, coat);
    c.set(x, y - 1, legs);
    c.set(x + (r() < 0.5 ? 1 : 0), y, legs);
  }
}

/** Small "v" birds scattered in a box. */
export function birds(c: PixelCanvas, seed: number, x0: number, y0: number, x1: number, y1: number, n: number, color: Color) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const x = Math.round(x0 + r() * (x1 - x0)), y = Math.round(y0 + r() * (y1 - y0));
    c.set(x - 1, y - 1, color); c.set(x, y, color); c.set(x + 1, y - 1, color);
    if (r() < 0.5) { c.set(x - 2, y - 1, color); c.set(x + 2, y - 1, color); }
  }
}

/** Street lamp: post from `base` up `h` px, with a lantern head. */
export function lamp(c: PixelCanvas, x: number, base: number, h: number, post: Color, glow: Color) {
  c.rect(x, base - h, 1, h, post);
  c.hline(x - 1, x + 1, base, post);
  c.rect(x - 1, base - h - 3, 3, 3, post);
  c.set(x, base - h - 2, glow);
  c.set(x, base - h - 4, post);
}

export type RoofStyle = "mansard" | "gable" | "stepped" | "bell" | "flat";

export interface TownhouseStyle {
  facades: Color[];
  shade: Color;
  window: Color;
  sill: Color;
  roof: RoofStyle;
  roofColor: Color;
  roofDark: Color;
  shutters?: Color[];
  awnings?: Color[];
  door?: Color;
  widths?: [number, number];
  heights?: [number, number];
  floorH?: number;
  balcony?: Color;
}

/**
 * A row of European townhouses between x0 and x1 standing on `base`, each with its own facade
 * colour, windows with sills (and optional shutters/balconies), a shop or door on the ground
 * floor and a roof of the given style.
 */
export function townhouses(c: PixelCanvas, seed: number, x0: number, x1: number, base: number, s: TownhouseStyle) {
  const r = rng(seed);
  const [wMin, wMax] = s.widths ?? [12, 17];
  const [hMin, hMax] = s.heights ?? [22, 30];
  const floorH = s.floorH ?? 6;
  for (let x = x0; x < x1; ) {
    const w = wMin + Math.floor(r() * (wMax - wMin + 1));
    const h = hMin + Math.floor(r() * (hMax - hMin + 1));
    const top = base - h;
    const facade = s.facades[Math.floor(r() * s.facades.length)]!;
    c.rect(x, top, w, h, facade);
    c.rect(x + w - 1, top, 1, h, s.shade);
    // floors of windows
    const cols = Math.max(1, Math.floor((w - 3) / 4));
    const pad = Math.floor((w - cols * 4 + 2) / 2);
    for (let fy = top + 3; fy < base - floorH - 1; fy += floorH) {
      for (let k = 0; k < cols; k++) {
        const wx = x + pad + k * 4;
        c.rect(wx, fy, 2, 3, s.window);
        c.hline(wx - (s.shutters ? 0 : 0), wx + 1, fy + 3, s.sill);
        if (s.shutters) { const sh = s.shutters[Math.floor(r() * s.shutters.length)]!; c.set(wx - 1, fy, sh); c.set(wx - 1, fy + 1, sh); c.set(wx - 1, fy + 2, sh); }
      }
      if (s.balcony && r() < 0.5) c.hline(x + 1, x + w - 2, fy + 3, s.balcony);
    }
    // ground floor: shopfront with awning, or a door
    if (s.awnings && r() < 0.75) {
      const aw = s.awnings[Math.floor(r() * s.awnings.length)]!;
      for (let i = x + 1; i < x + w - 1; i++) { c.set(i, base - floorH, aw); c.set(i, base - floorH + 1, i % 2 ? aw : "#f3ead8"); }
      c.rect(x + 2, base - floorH + 2, w - 4, floorH - 2, s.window);
      c.rect(x + Math.floor(w / 2), base - floorH + 2, 1, floorH - 2, s.shade);
    } else {
      const dx = x + Math.floor(w / 2) - 1;
      c.rect(dx, base - 5, 3, 5, s.door ?? s.window);
      c.set(dx + 1, base - 6, s.sill);
    }
    // roof
    const rc = s.roofColor, rd = s.roofDark;
    switch (s.roof) {
      case "mansard":
        for (let k = 0; k < 5; k++) c.hline(x + Math.floor(k / 2), x + w - 1 - Math.floor(k / 2), top - 5 + k, k === 0 ? rd : rc);
        for (let i = x + 2; i < x + w - 3; i += 4) { c.rect(i, top - 4, 2, 3, facade); c.set(i, top - 5, rd); c.set(i, top - 3, s.window); }
        c.rect(x + 1, top - 8, 2, 3, "#b96a52");
        break;
      case "gable": {
        // triangular gable in the facade colour, widest at the eaves, with a dark coping line
        const half = Math.ceil(w / 2);
        for (let k = 0; k < half; k++) {
          c.hline(x + k, x + w - 1 - k, top - 1 - k, facade);
          c.set(x + k, top - 1 - k, rd);
          c.set(x + w - 1 - k, top - 1 - k, rd);
        }
        c.rect(x + half - 1, top - Math.floor(half / 2) - 2, 2, 2, s.window);
        c.set(x + half - 1, top - half - 1, rd);
        break;
      }
      case "stepped": {
        const steps = 3, sw = Math.floor(w / (steps * 2 + 1));
        for (let k = 0; k < steps; k++) c.rect(x + sw * k, top - 3 * (k + 1), w - sw * k * 2, 3, facade);
        c.rect(x + Math.floor(w / 2) - 1, top - 3 * steps - 2, 2, 2, facade);
        c.hline(x + Math.floor(w / 2) - 1, x + Math.floor(w / 2), top - 3 * steps - 2, rd);
        c.rect(x + Math.floor(w / 2) - 1, top - 6, 2, 3, s.window);
        break;
      }
      case "bell": {
        const hw = Math.floor(w / 2);
        for (let k = 0; k < 9; k++) {
          const ww = Math.round(hw * Math.cos((k / 9) * Math.PI * 0.45));
          c.hline(x + hw - ww, x + hw + ww - (w % 2 ? 0 : 1), top - k - 1, facade);
        }
        c.hline(x + hw - 2, x + hw + 1, top - 10, s.sill);
        c.rect(x + hw - 1, top - 6, 2, 3, s.window);
        break;
      }
      case "flat":
        c.hline(x, x + w - 1, top, s.sill);
        c.hline(x, x + w - 1, top - 1, rd);
        break;
    }
    x += w;
  }
}

/* ------------------------------------------------------------------ */
/* Street-level detail used by the Asian scenes                        */
/* ------------------------------------------------------------------ */

/** Motor scooter (10 px long) facing right, standing on `y`, optionally with a helmeted rider. */
export function scooter(c: PixelCanvas, x: number, y: number, body: Color, rider?: { shirt: Color; helmet: Color }) {
  const tyre = "#2b2b33";
  c.set(x + 1, y, tyre); c.set(x + 1, y - 1, tyre); c.set(x + 2, y, tyre);
  c.set(x + 7, y, tyre); c.set(x + 7, y - 1, tyre); c.set(x + 8, y, tyre);
  c.hline(x + 1, x + 6, y - 2, body);
  c.hline(x + 2, x + 4, y - 3, body);
  c.rect(x + 7, y - 5, 1, 3, body);
  c.hline(x + 6, x + 8, y - 6, tyre);
  if (rider) {
    c.set(x + 4, y - 4, rider.shirt); c.set(x + 4, y - 5, rider.shirt); c.set(x + 5, y - 5, rider.shirt);
    c.set(x + 4, y - 6, "#e3b48f");
    c.set(x + 4, y - 7, rider.helmet); c.set(x + 5, y - 7, rider.helmet);
  }
}

/** A sagging cord of paper lanterns between x0 and x1. */
export function lanternString(c: PixelCanvas, x0: number, x1: number, y: number, sag: number, colors: Color[], cord = "#3b2a26", glow = "#f7d88a") {
  for (let x = x0; x <= x1; x++) c.set(x, Math.round(y + sag * Math.sin((Math.PI * (x - x0)) / (x1 - x0))), cord);
  let i = 0;
  for (let x = x0 + 3; x < x1 - 1; x += 6) {
    const yy = Math.round(y + sag * Math.sin((Math.PI * (x - x0)) / (x1 - x0)));
    const col = colors[i++ % colors.length]!;
    c.rect(x - 1, yy + 1, 3, 3, col);
    c.set(x, yy + 2, glow);
    c.set(x, yy + 4, cord);
  }
}

/** Small rowing / tour boat with an optional figure. */
export function rowboat(c: PixelCanvas, x: number, y: number, len: number, hull: Color, trim: Color, figure?: Color) {
  for (let k = 0; k < 3; k++) c.hline(x + k, x + len - 1 - k, y + k, k === 0 ? trim : hull);
  if (figure) {
    const fx = x + Math.floor(len / 2);
    c.set(fx, y - 3, "#e3b48f"); c.set(fx, y - 2, figure); c.set(fx, y - 1, figure);
    c.line(fx + 1, y - 2, fx + 4, y + 2, "#8a6a4a");
  }
}

/** Japanese stone lantern (tōrō), 9 px tall, standing on `base`. */
export function stoneLantern(c: PixelCanvas, x: number, base: number, stone = "#b9b3a6", dark = "#8a857a", glow = "#f2cf6a") {
  c.hline(x - 2, x + 2, base, dark);
  c.rect(x, base - 4, 1, 4, stone);
  c.rect(x - 1, base - 6, 3, 2, glow);
  c.set(x - 2, base - 6, stone); c.set(x + 2, base - 6, stone);
  c.hline(x - 3, x + 3, base - 7, stone);
  c.hline(x - 2, x + 2, base - 8, dark);
  c.set(x, base - 9, stone);
}

/** Deterministic 0..1 hash per 2×2 clump — mottled canopy, rock and crowd textures without stripes. */
export function leaf(x: number, y: number): number {
  const bx = (x + (Math.floor(y / 2) % 2)) >> 1, by = y >> 1;
  let h = (bx * 374761393 + by * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Coconut / date palm: curved trunk with ring marks and drooping fronds. `lean` −1…1. */
export function palm(c: PixelCanvas, x: number, base: number, h: number, lean: number, fronds: Color[], trunk: Color, ring: Color, span = 10) {
  for (let y = base; y > base - h; y--) {
    const t = (base - y) / h;
    c.set(x + Math.round(lean * t * t * 6), y, y % 3 ? trunk : ring);
  }
  const tx = x + Math.round(lean * 6), ty = base - h;
  for (let k = 0; k < 9; k++) {
    const a = Math.PI * 0.95 + (k / 8) * Math.PI * 1.1;
    for (let d = 1; d < span; d++) c.set(tx + Math.round(Math.cos(a) * d), ty + Math.round(Math.sin(a) * d * 0.55 + d * d * 0.07), fronds[k % fronds.length]!);
  }
  c.set(tx, ty + 1, ring); c.set(tx + 1, ty + 1, ring);
}

/** Lit window grid for a building face (night scenes): `on` is the share of lit windows. */
export function windows(c: PixelCanvas, seed: number, x: number, y: number, w: number, h: number, lit: Color, dark: Color, on = 0.6, stepX = 2, stepY = 2) {
  const r = rng(seed);
  for (let yy = y; yy < y + h; yy += stepY) for (let xx = x; xx < x + w; xx += stepX) c.set(xx, yy, r() < on ? lit : dark);
}
