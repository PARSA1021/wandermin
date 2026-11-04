/**
 * Tiny indexed-colour pixel canvas. Art is drawn on a true low-resolution grid and exported
 * as SVG: one <path> per colour made of 1-px-high runs, rendered with crispEdges, so it
 * stays perfectly sharp at any size and needs no bitmap assets.
 */
export type Color = string; // "#rrggbb"

const BAYER4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

/** Ordered-dither threshold in [0,1) for a pixel. */
export const bayer = (x: number, y: number) => (BAYER4[y & 3]![x & 3]! + 0.5) / 16;

/** Deterministic PRNG (mulberry32) so the same postcard always renders identically. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class PixelCanvas {
  readonly data: Int16Array;
  private readonly palette: Color[] = [];
  private readonly index = new Map<Color, number>();

  constructor(readonly width: number, readonly height: number) {
    this.data = new Int16Array(width * height).fill(-1);
  }

  private ci(c: Color): number {
    const key = c.toLowerCase();
    let i = this.index.get(key);
    if (i === undefined) {
      i = this.palette.push(key) - 1;
      this.index.set(key, i);
    }
    return i;
  }

  inside(x: number, y: number) {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  set(x: number, y: number, c: Color | null) {
    x = Math.round(x); y = Math.round(y);
    if (!this.inside(x, y)) return;
    this.data[y * this.width + x] = c === null ? -1 : this.ci(c);
  }

  get(x: number, y: number): Color | null {
    if (!this.inside(x, y)) return null;
    const i = this.data[y * this.width + x]!;
    return i < 0 ? null : this.palette[i]!;
  }

  rect(x: number, y: number, w: number, h: number, c: Color | null) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, c);
  }

  hline(x0: number, x1: number, y: number, c: Color) {
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) this.set(x, y, c);
  }

  /** Bresenham line, optionally thicker (square brush). */
  line(x0: number, y0: number, x1: number, y1: number, c: Color, thick = 1) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    const half = Math.floor((thick - 1) / 2);
    for (;;) {
      this.rect(x0 - half, y0 - half, thick, thick, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  polyline(points: [number, number][], c: Color, thick = 1) {
    for (let i = 1; i < points.length; i++) {
      const [ax, ay] = points[i - 1]!, [bx, by] = points[i]!;
      this.line(ax, ay, bx, by, c, thick);
    }
  }

  disc(cx: number, cy: number, r: number, c: Color) {
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++)
      for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++)
        if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r + r * 0.6) this.set(x, y, c);
  }

  /** Scanline polygon fill sampling pixel centres (even–odd rule). */
  polygon(points: [number, number][], c: Color) {
    const ys = points.map((p) => p[1]);
    for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) {
      const py = y + 0.5;
      const xs: number[] = [];
      for (let i = 0; i < points.length; i++) {
        const [ax, ay] = points[i]!, [bx, by] = points[(i + 1) % points.length]!;
        if ((ay <= py && by > py) || (by <= py && ay > py)) xs.push(ax + ((py - ay) / (by - ay)) * (bx - ax));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2)
        for (let x = Math.ceil(xs[k]! - 0.5); x <= Math.floor(xs[k + 1]! - 0.5); x++) this.set(x, y, c);
    }
  }

  /** Paint every pixel where `fn` returns a colour. */
  paint(fn: (x: number, y: number) => Color | null | undefined, x0 = 0, y0 = 0, x1 = this.width - 1, y1 = this.height - 1) {
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        const c = fn(x, y);
        if (c) this.set(x, y, c);
      }
  }

  /** Vertical banded gradient through `stops`, ordered-dithered between neighbours. */
  gradient(y0: number, y1: number, stops: Color[], x0 = 0, x1 = this.width - 1) {
    const n = stops.length - 1;
    this.paint((x, y) => {
      const t = ((y - y0) / Math.max(1, y1 - y0)) * n;
      const i = Math.min(n - 1, Math.floor(t));
      const f = t - i;
      return bayer(x, y) < f ? stops[i + 1]! : stops[i]!;
    }, x0, y0, x1, y1);
  }

  /** Copy another canvas onto this one (transparent pixels skipped). */
  blit(src: PixelCanvas, ox: number, oy: number) {
    for (let y = 0; y < src.height; y++)
      for (let x = 0; x < src.width; x++) {
        const c = src.get(x, y);
        if (c) this.set(ox + x, oy + y, c);
      }
  }

  colors(): Color[] {
    return [...this.palette];
  }

  /** SVG <path> elements, one per colour, built from horizontal runs. */
  toSvgPaths(): string {
    const byColor = new Map<number, string[]>();
    for (let y = 0; y < this.height; y++) {
      let x = 0;
      while (x < this.width) {
        const c = this.data[y * this.width + x]!;
        let end = x + 1;
        while (end < this.width && this.data[y * this.width + end] === c) end++;
        if (c >= 0) {
          if (!byColor.has(c)) byColor.set(c, []);
          byColor.get(c)!.push(`M${x} ${y}h${end - x}v1h-${end - x}z`);
        }
        x = end;
      }
    }
    return [...byColor]
      .map(([c, runs]) => `<path fill="${this.palette[c]}" d="${runs.join("")}"/>`)
      .join("");
  }
}
