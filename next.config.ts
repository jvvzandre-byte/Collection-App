import type { NextConfig } from "next";

// Static export so the app can be hosted on GitHub Pages (or any static host).
// PAGES_BASE_PATH is set by the deploy workflow, e.g. "/Collection-App"; empty for local dev.
const basePath = process.env.PAGES_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "export",
  trailingSlash: true,
  basePath,
  images: { unoptimized: true },
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};

export default nextConfig;
