// Google Maps deep links. Free, no API key: they open the Maps app or website.
// https://developers.google.com/maps/documentation/urls/get-started

type Place = { lat?: number | null; lng?: number | null; street?: string; suburb?: string };

const where = (p: Place) =>
  p.lat != null && p.lng != null ? `${p.lat},${p.lng}` : `${p.street ?? ""}, ${p.suburb ?? ""}, Cape Town`;

/** Turn-by-turn directions to one place from the phone's current location. */
export function directionsUrl(to: Place): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(where(to))}&travelmode=driving`;
}

/** Drop a pin on a place. Uses the street address when there's no exact location. */
export function placeUrl(p: Place): string {
  const q = p.lat != null && p.lng != null && p.street ? `${p.street}, ${p.suburb}` : where(p);
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}
