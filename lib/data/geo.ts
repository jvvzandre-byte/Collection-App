import type { Address } from "@/lib/types";
import { hashSeed } from "@/lib/logic/draw";
import { normaliseSuburb } from "@/lib/logic/schedule";

// PLACEHOLDER GEOCODER. Until Google Geocoding / Places is connected, an address gets its suburb's
// approximate centre plus a small, stable offset (so pins don't stack). Marked geo: "approximate".
// Replace with a real geocoder in the Supabase implementation (server-side, cached on the address).

const CENTRES: Record<string, [number, number]> = {
  rondebosch: [-33.9600, 18.4700], newlands: [-33.9750, 18.4600], claremont: [-33.9830, 18.4650], rosebank: [-33.9530, 18.4730],
  observatory: [-33.9380, 18.4720], mowbray: [-33.9470, 18.4750], woodstock: [-33.9280, 18.4470], "salt river": [-33.9300, 18.4600],
  kenilworth: [-33.9950, 18.4700], wynberg: [-34.0050, 18.4660], plumstead: [-34.0200, 18.4720], "harfield village": [-33.9890, 18.4760],
  muizenberg: [-34.1080, 18.4700], bergvliet: [-34.0480, 18.4570], tokai: [-34.0600, 18.4380], pinelands: [-33.9330, 18.5050],
};

export function approximateLocation(street: string, suburb: string): Pick<Address, "lat" | "lng" | "geo"> {
  const c = CENTRES[normaliseSuburb(suburb)];
  if (!c) return { lat: undefined, lng: undefined, geo: undefined };
  const h = hashSeed(`${street.toLowerCase()}|${normaliseSuburb(suburb)}`);
  // ±~600 m, stable per address.
  const dLat = (((h & 0xffff) / 0xffff) - 0.5) * 0.011;
  const dLng = ((((h >>> 16) & 0xffff) / 0xffff) - 0.5) * 0.013;
  return { lat: +(c[0] + dLat).toFixed(5), lng: +(c[1] + dLng).toFixed(5), geo: "approximate" };
}

/** Default depot until one is set in Settings (Ndabeni industrial area, between the three zones). */
export const DEFAULT_DEPOT = { label: "Depot (Ndabeni)", lat: -33.9300, lng: 18.4950 };
