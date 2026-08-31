#!/usr/bin/env bash
# Package the desktop shell + the discovery page's slice of the app build
# into a distributable app (spec/desktop; the shell itself is desktop/ — see
# src/discovery/README.md for the host/page contract). Layout for
# @electron/packager: desktop/ is the app dir; the page's transitive files
# are pruned out of dist/ to a directory beside main.cjs (which prefers the
# sibling copy over the repo-level dev build) — the installer carries the
# page, not the product — and the shell's one runtime dependency is installed
# flat with npm (a pnpm symlink tree doesn't survive packaging).
set -euo pipefail
cd "$(dirname "$0")/.."

[ -f dist/.vite/manifest.json ] || { echo "dist/ missing or built without a manifest — run pnpm build first" >&2; exit 1; }

# The staged slice and the flat node_modules exist only for the packager to
# copy. They must not outlive this run: main.cjs prefers a sibling
# dist-discovery over the repo's dist/, so one left behind would make every
# later `pnpm electron` serve THIS build's frozen page and ignore `pnpm
# build`. Cleared on the way out, however this exits.
trap 'rm -rf desktop/dist-discovery desktop/node_modules' EXIT

rm -rf desktop/dist-discovery desktop/node_modules
node scripts/prune-discovery-dist.mjs dist desktop/dist-discovery
npm install --prefix desktop --omit=dev --no-audit --no-fund --loglevel=error

pnpm exec electron-packager desktop "Open mSupply" \
  --out=dist-desktop --overwrite \
  --app-bundle-id=org.openmsupply.desktop

echo "Packaged app in dist-desktop/"
