import path from "node:path";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root so a stray lockfile in a parent folder isn't picked up.
  turbopack: { root: path.join(__dirname) },
  // The dev badge would cover the player's speed control in the bottom-right corner.
  devIndicators: false,
};

export default nextConfig;
