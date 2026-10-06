import path from "node:path";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root so a stray lockfile in a parent folder isn't picked up.
  turbopack: { root: path.join(__dirname) },
  devIndicators: { position: "bottom-right" },
};

export default nextConfig;
