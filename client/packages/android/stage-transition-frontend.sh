#! /bin/bash
set -e

# Assemble the dual-frontend web bundle that `cap copy` ships into the APK.
# capacitor webDir points here for release builds (see capacitor.config.ts);
# `cap copy` copies it to app/src/main/assets/public, from where FrontendAssets
# copies it to <filesDir>/frontend for the embedded server to serve.
#
#   frontend-bundle/          NEW FE, served at /          (built from frontend/)
#   frontend-bundle/old-ui/   OLD UI, served at /old-ui/   (this repo's client build)
#
# The embedded server serves <filesDir>/frontend/old-ui at /old-ui/ by convention
# to match (see server/android/src/android.rs).

BUNDLE="frontend-bundle"
REPO_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"

# Build the NEW FE in-tree (`corepack pnpm` — the pnpm version is pinned by
# frontend/package.json; the repo root workspace is yarn)...
(cd "$REPO_ROOT/frontend" && corepack pnpm install --frozen-lockfile && corepack pnpm build)

# ...copy its dist in fresh...
rm -rf "$BUNDLE"
cp -R "$REPO_ROOT/frontend/dist" "$BUNDLE"

# ...then nest the OLD UI (built with PUBLIC_PATH=/old-ui/, see the root
# android:build:release script) under old-ui/.
cp -R ../host/dist "$BUNDLE/old-ui"
