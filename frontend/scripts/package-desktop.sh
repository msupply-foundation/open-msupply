#!/usr/bin/env bash
# Package the desktop shell + the built discovery page into a distributable
# app (spec/desktop; the shell itself is desktop/ — see src/desktop/README.md
# for the shell/page contract). Layout for @electron/packager: desktop/ is the
# app dir; the discovery bundle is copied beside main.cjs (which prefers the
# sibling copy over the repo-level dev build), and the shell's one runtime
# dependency is installed flat with npm (a pnpm symlink tree doesn't survive
# packaging).
set -euo pipefail
cd "$(dirname "$0")/.."

[ -d dist-discovery ] || { echo "dist-discovery/ missing — run pnpm build:discovery first" >&2; exit 1; }

rm -rf desktop/dist-discovery desktop/node_modules
cp -R dist-discovery desktop/dist-discovery
npm install --prefix desktop --omit=dev --no-audit --no-fund --loglevel=error

pnpm exec electron-packager desktop "Open mSupply" \
  --out=dist-desktop --overwrite \
  --app-bundle-id=org.openmsupply.desktop

echo "Packaged app in dist-desktop/"
