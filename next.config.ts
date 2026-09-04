import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse (via pdfjs-dist) tries to load a worker file at a path that
  // Next's bundler rewrites, which breaks it ("Setting up fake worker
  // failed"). Keeping these packages external makes the API route load
  // them as plain Node modules instead of bundling them, which avoids the
  // worker-path resolution issue entirely.
serverExternalPackages: ["pdf-parse", "pdfjs-dist", "@napi-rs/canvas"],
};

export default nextConfig;
