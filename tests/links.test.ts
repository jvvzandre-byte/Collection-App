import { describe, expect, it } from "vitest";
import { directionsUrl, placeUrl } from "@/lib/maps/links";

describe("maps links", () => {
  it("uses coordinates when known", () => {
    expect(directionsUrl({ lat: -33.96, lng: 18.47 })).toBe("https://www.google.com/maps/dir/?api=1&destination=-33.96%2C18.47&travelmode=driving");
  });
  it("falls back to the street address", () => {
    expect(directionsUrl({ street: "12 Main Rd", suburb: "Wynberg" })).toContain(encodeURIComponent("12 Main Rd, Wynberg, Cape Town"));
    expect(placeUrl({ street: "12 Main Rd", suburb: "Wynberg" })).toContain("search/?api=1&query=");
  });
});
