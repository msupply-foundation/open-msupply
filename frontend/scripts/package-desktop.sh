#!/usr/bin/env bash
# Package the desktop shell + the discovery page's slice of the app build into
# a distributable app (spec/desktop; the shell itself is desktop/ — see
# src/discovery/README.md for the host/page contract).
#
# @electron/packager copies an app DIRECTORY, and that directory needs a
# manifest and a node_modules tree it can actually copy. Both are staged here
# rather than kept in the repo: desktop/ used to carry a package.json of its
# own and have its dependency installed into desktop/node_modules with npm,
# which made the shell a second npm project — and a third package manager —
# inside a pnpm one. The manifest is now generated from frontend/package.json
# (scripts/desktop-manifest.mjs), so the shell's dependency versions have one
# home, and the install is pnpm's with a hoisted linker, because a symlinked
# store tree does not survive packaging.
set -euo pipefail
cd "$(dirname "$0")/.."

STAGE=dist-desktop-stage

[ -f dist/.vite/manifest.json ] || { echo "dist/ missing or built without a manifest — run pnpm build first" >&2; exit 1; }

# The staging tree exists only for the packager to copy. Cleared on the way
# out, however this exits — nothing about a later `pnpm electron` depends on
# its absence any more (it used to live inside desktop/, where a leftover
# dist-discovery made main.cjs serve that build's frozen page for ever), but
# there is no reason to leave a duplicate of the shell lying about.
trap 'rm -rf "$STAGE"' EXIT

rm -rf "$STAGE"
mkdir -p "$STAGE"
cp desktop/*.cjs "$STAGE/"
node scripts/prune-discovery-dist.mjs dist "$STAGE/dist-discovery"
node scripts/desktop-manifest.mjs desktop "$STAGE/package.json"
pnpm install --dir "$STAGE" --prod --ignore-workspace --no-lockfile \
  --config.node-linker=hoisted --reporter=silent

pnpm exec electron-packager "$STAGE" "Open mSupply" \
  --out=dist-desktop --overwrite \
  --app-bundle-id=org.openmsupply.desktop

echo "Packaged app in dist-desktop/"
