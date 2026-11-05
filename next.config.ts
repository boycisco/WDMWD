import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Standalone output bundles only the files needed at runtime,
   * producing a lean Docker image. `.next/standalone` is what the
   * Dockerfile copies into the runner stage.
   */
  output: "standalone",
};

export default nextConfig;