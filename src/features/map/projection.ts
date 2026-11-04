/** Equirectangular projection matching the baked land path (scripts/bake-land.ts). */
export const MAP_K = 2;
export const LAT_TOP = 84;
export const LAT_BOTTOM = -58;
export const MAP_W = 360 * MAP_K;
export const MAP_H = (LAT_TOP - LAT_BOTTOM) * MAP_K;

export const projX = (lng: number) => (lng + 180) * MAP_K;
export const projY = (lat: number) => (LAT_TOP - lat) * MAP_K;

export interface Box { x: number; y: number; w: number; h: number }

/** Smallest box around the points, padded and widened to the map's aspect ratio, kept in bounds. */
export function fitBox(points: [number, number][], pad = 40, minW = 160): Box {
  if (!points.length) return { x: 0, y: 0, w: MAP_W, h: MAP_H };
  const xs = points.map((p) => p[0]), ys = points.map((p) => p[1]);
  let x0 = Math.min(...xs) - pad, x1 = Math.max(...xs) + pad, y0 = Math.min(...ys) - pad, y1 = Math.max(...ys) + pad;
  const aspect = MAP_W / MAP_H;
  let w = Math.max(minW, x1 - x0), h = Math.max(minW / aspect, y1 - y0);
  if (w / h > aspect) h = w / aspect; else w = h * aspect;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  x0 = cx - w / 2; y0 = cy - h / 2;
  if (w >= MAP_W || h >= MAP_H) return { x: 0, y: 0, w: MAP_W, h: MAP_H };
  x0 = Math.min(Math.max(0, x0), MAP_W - w);
  y0 = Math.min(Math.max(0, y0), MAP_H - h);
  return { x: x0, y: y0, w, h };
}
