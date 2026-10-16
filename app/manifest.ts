import type { MetadataRoute } from "next";

const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kilo · Recycling collection",
    short_name: "Kilo",
    description: "Free kerbside recycling. Every kilogram is an entry into the monthly draw.",
    start_url: `${base}/`,
    display: "standalone",
    background_color: "#f3f2f7",
    theme_color: "#0a1226",
    icons: [
      { src: `${base}/icon.svg`, sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
