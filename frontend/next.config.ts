import path from "node:path";

import type { NextConfig } from "next";

// Where the FastAPI backend lives. The browser never calls it directly: /api/v1/* is proxied
// through this app, so the session cookie is first-party (cross-site cookies to another
// domain are blocked by modern browsers) and no CORS is needed.
const backendUrl = (process.env.BACKEND_URL ?? "http://localhost:8000").replace(/\/$/, "");

const nextConfig: NextConfig = {
  // Pin the workspace root so a stray lockfile in a parent folder isn't picked up.
  turbopack: { root: path.join(__dirname) },
  // The dev badge would cover the player's speed control in the bottom-right corner.
  devIndicators: false,
  async rewrites() {
    return [{ source: "/api/v1/:path*", destination: `${backendUrl}/api/v1/:path*` }];
  },
};

export default nextConfig;
