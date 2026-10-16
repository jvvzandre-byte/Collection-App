// Route ordering without any external service (pure, tested).
// "Nearest next": from the depot, repeatedly drive to the closest remaining stop by straight-line distance.
// Good enough for one vehicle and a few dozen stops in neighbouring suburbs. Road-aware ordering
// (Google Routes / Route Optimization) plugs in behind the same RouteProvider in the data layer.

export interface LatLng { lat: number; lng: number }
export interface RoutePoint { id: string; lat: number | null; lng: number | null }

const R = 6371; // km
const rad = (d: number) => (d * Math.PI) / 180;

/** Great-circle (haversine) distance in km. */
export function distanceKm(a: LatLng, b: LatLng): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

const located = (p: RoutePoint): p is RoutePoint & LatLng => p.lat != null && p.lng != null;

/** Stop ids in visiting order. Stops with no location go last, in their given order. */
export function nearestNextOrder(start: LatLng, stops: RoutePoint[]): string[] {
  let remaining = stops.filter(located).sort((a, b) => a.id.localeCompare(b.id));
  const order: string[] = [];
  let here: LatLng = start;
  while (remaining.length) {
    let best = remaining[0];
    let bestD = distanceKm(here, best);
    for (const s of remaining.slice(1)) {
      const d = distanceKm(here, s);
      if (d < bestD - 1e-9) { best = s; bestD = d; }
    }
    order.push(best.id);
    here = best;
    remaining = remaining.filter((s) => s !== best);
  }
  return [...order, ...stops.filter((s) => !located(s)).map((s) => s.id)];
}

/** Straight-line length of depot → stops in order → depot, in km (located stops only). */
export function routeLengthKm(start: LatLng, stops: RoutePoint[]): number {
  const pts = stops.filter(located);
  let total = 0;
  let here: LatLng = start;
  for (const p of pts) { total += distanceKm(here, p); here = p; }
  return pts.length ? total + distanceKm(here, start) : 0;
}
