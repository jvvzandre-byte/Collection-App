import { describe, expect, it } from "vitest";
import { distanceKm, nearestNextOrder, routeLengthKm, type LatLng } from "@/lib/logic/route";

const depot: LatLng = { lat: -33.93, lng: 18.495 };

describe("route", () => {
  it("measures straight-line distance in km", () => {
    // Rondebosch → Wynberg is roughly 5 km as the crow flies.
    const d = distanceKm({ lat: -33.96, lng: 18.47 }, { lat: -34.005, lng: 18.466 });
    expect(d).toBeGreaterThan(4.5);
    expect(d).toBeLessThan(5.5);
    expect(distanceKm(depot, depot)).toBe(0);
  });

  it("visits the closest remaining stop each time, starting from the depot", () => {
    const stops = [
      { id: "far", lat: -34.02, lng: 18.47 },
      { id: "near", lat: -33.935, lng: 18.49 },
      { id: "mid", lat: -33.96, lng: 18.47 },
    ];
    expect(nearestNextOrder(depot, stops)).toEqual(["near", "mid", "far"]);
  });

  it("puts stops without a location at the end in their original order", () => {
    const stops = [
      { id: "x", lat: null, lng: null },
      { id: "a", lat: -33.94, lng: 18.49 },
      { id: "y", lat: null, lng: null },
    ];
    expect(nearestNextOrder(depot, stops)).toEqual(["a", "x", "y"]);
  });

  it("is deterministic on ties and handles empty input", () => {
    const tie = [{ id: "b", lat: -33.94, lng: 18.495 }, { id: "a", lat: -33.94, lng: 18.495 }];
    expect(nearestNextOrder(depot, tie)).toEqual(["a", "b"]);
    expect(nearestNextOrder(depot, [])).toEqual([]);
  });

  it("never makes a zig-zag route longer than the input order", () => {
    const zigzag = [
      { id: "1", lat: -34.02, lng: 18.47 }, { id: "2", lat: -33.935, lng: 18.49 },
      { id: "3", lat: -34.0, lng: 18.47 }, { id: "4", lat: -33.95, lng: 18.48 },
    ];
    const before = routeLengthKm(depot, zigzag);
    const ordered = nearestNextOrder(depot, zigzag).map((id) => zigzag.find((s) => s.id === id)!);
    expect(routeLengthKm(depot, ordered)).toBeLessThan(before);
  });
});
