# Aetheria: Terraforge — GitHub Pages

Static export of the Next.js 16 game, served via GitHub Pages with basePath configured.

## Live URL
https://ariefenv-hash.github.io/Aetheria-Terraforge---3D-Roguelike-TD-on-Next.js-16/

## Other deployments
- Cloudflare Pages (main, China-accessible): https://aetheria-terraforge.pages.dev
- Vercel (international fallback): https://aetheria-terraforge.vercel.app

## How this branch is generated
```bash
GITHUB_PAGES_BASE='/Aetheria-Terraforge---3D-Roguelike-TD-on-Next.js-16' \
  bunx next build
# then copy ./out to gh-pages branch root, include .nojekyll
```
