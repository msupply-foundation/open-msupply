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

# stage-frontend builds frontend/ in-tree and wipes/recreates its target dir,
# so stage the NEW FE FIRST...
node "$REPO_ROOT/build/stage-frontend.js" "$BUNDLE"

# ...then nest the OLD UI (built with PUBLIC_PATH=/old-ui/, see the root
# android:build:release script) under old-ui/.
rm -rf "$BUNDLE/old-ui"
cp -R ../host/dist "$BUNDLE/old-ui"
