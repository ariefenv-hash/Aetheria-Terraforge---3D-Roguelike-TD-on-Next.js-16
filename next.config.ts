import type { NextConfig } from "next";

// Detect GitHub Pages subpath from environment so we can switch easily:
// - Local dev & Cloudflare Pages & Vercel → basePath = '' (root)
// - GitHub Pages → basePath = '/Aetheria-Terraforge---3D-Roguelike-TD-on-Next.js-16'
const GITHUB_PAGES_BASE = process.env.GITHUB_PAGES_BASE || '';

const nextConfig: NextConfig = {
  // Static export — game is fully client-side, no SSR needed.
  output: "export",
  // Serve from a subpath (required for project-name.github.io/repo/ URLs).
  basePath: GITHUB_PAGES_BASE,
  assetPrefix: GITHUB_PAGES_BASE ? `${GITHUB_PAGES_BASE}/` : undefined,
  images: {
    unoptimized: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
