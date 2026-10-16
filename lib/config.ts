// Third-party integrations. Values are baked in at build time (static export).
// Set GOOGLE_MAPS_KEY as a GitHub Actions secret; the deploy workflow passes it through.

export const integrations = {
  /** Browser key for Maps JavaScript, Places and Routes. Restrict it to your domains in Google Cloud. */
  googleMapsKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? "",
} as const;

export const mapsConfigured = () => integrations.googleMapsKey.length > 0;
