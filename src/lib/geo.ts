export interface LatLng {
  lat: number;
  lng: number;
}

export const EARTH_RADIUS_KM = 6371;

const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

/** Great-circle distance in kilometres (haversine formula). */
export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Point a fraction `t` (0..1) of the way along the great circle from a to b. */
export function interpolateGreatCircle(a: LatLng, b: LatLng, t: number): LatLng {
  const f = Math.min(1, Math.max(0, t));
  const φ1 = rad(a.lat), λ1 = rad(a.lng), φ2 = rad(b.lat), λ2 = rad(b.lng);
  const δ = haversineKm(a, b) / EARTH_RADIUS_KM;
  if (δ < 1e-9) return { ...a };
  const A = Math.sin((1 - f) * δ) / Math.sin(δ);
  const B = Math.sin(f * δ) / Math.sin(δ);
  const x = A * Math.cos(φ1) * Math.cos(λ1) + B * Math.cos(φ2) * Math.cos(λ2);
  const y = A * Math.cos(φ1) * Math.sin(λ1) + B * Math.cos(φ2) * Math.sin(λ2);
  const z = A * Math.sin(φ1) + B * Math.sin(φ2);
  return { lat: deg(Math.atan2(z, Math.hypot(x, y))), lng: deg(Math.atan2(y, x)) };
}

/**
 * Sample a great-circle arc for drawing as a map line. Longitudes are "unwrapped"
 * (may exceed ±180) so a route crossing the antimeridian draws the short way in MapLibre.
 */
export function greatCircleLine(a: LatLng, b: LatLng, segments = 64): [number, number][] {
  const pts: [number, number][] = [];
  let prev: number | null = null;
  for (let i = 0; i <= segments; i++) {
    const p = interpolateGreatCircle(a, b, i / segments);
    let lng = p.lng;
    if (prev !== null) {
      while (lng - prev > 180) lng -= 360;
      while (lng - prev < -180) lng += 360;
    }
    prev = lng;
    pts.push([lng, p.lat]);
  }
  return pts;
}
