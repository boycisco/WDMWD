import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  transpilePackages: ["motion"],
  // Reads comma-separated hostnames from .env.local
  // (no protocol, no port). Unset = localhost-only behavior.
  allowedDevOrigins: process.env.NEXT_ALLOWED_DEV_ORIGINS
    ? process.env.NEXT_ALLOWED_DEV_ORIGINS.split(",").map((s) => s.trim())
    : [],
};

export default nextConfig;