import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kerbside Recycling",
    short_name: "Kerbside",
    description: "Free kerbside recycling. Every kilogram is an entry into the monthly draw.",
    start_url: "/",
    display: "standalone",
    background_color: "#f3f2f7",
    theme_color: "#f3f2f7",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
