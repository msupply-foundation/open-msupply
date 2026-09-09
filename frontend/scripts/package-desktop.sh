#!/usr/bin/env bash
# Package the desktop shell + the discovery page's slice of the app build into
# a distributable app (spec/desktop; the shell itself is desktop/ — see
# src/discovery/README.md for the host/page contract).
#
# @electron/packager copies an app DIRECTORY, and that directory needs a
# manifest and a node_modules tree it can actually copy. desktop/ is a
# workspace package (../pnpm-workspace.yaml), so `pnpm deploy` stages both:
# the shell's own manifest and just its dependencies, self-contained.
# node-linker=hoisted because a symlinked store tree does not survive
# packaging.
set -euo pipefail
cd "$(dirname "$0")/.."

STAGE=dist-desktop-stage

[ -f dist/.vite/manifest.json ] || { echo "dist/ missing or built without a manifest — run pnpm build first" >&2; exit 1; }

# The staging tree exists only for the packager to copy; cleared on the way
# out, however this exits.
trap 'rm -rf "$STAGE"' EXIT

rm -rf "$STAGE"
pnpm --filter open-msupply-desktop deploy "$STAGE" --prod \
  --config.node-linker=hoisted --reporter=silent
node scripts/prune-discovery-dist.mjs dist "$STAGE/dist-discovery"

pnpm exec electron-packager "$STAGE" "Open mSupply" \
  --out=dist-desktop --overwrite \
  --app-bundle-id=org.openmsupply.desktop

echo "Packaged app in dist-desktop/"
