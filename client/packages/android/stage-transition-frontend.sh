#! /bin/bash
set -e

# Assemble the dual-frontend web bundle that `cap copy` ships into the APK.
# capacitor webDir points here for release builds (see capacitor.config.ts);
# `cap copy` copies it to app/src/main/assets/public, from where FrontendAssets
# copies it to <filesDir>/frontend for the embedded server to serve.
#
#   frontend-bundle/          NEW FE, served at /          (fetched, pinned dist)
#   frontend-bundle/old-ui/   OLD UI, served at /old-ui/   (this repo's client build)
#
# The embedded server's old_ui_frontend_dir is set to <filesDir>/frontend/old-ui
# to match (see server/android/src/android.rs).
#
# The NEW FE lives in the private open-msupply-frontend repo; fetch-frontend.js
# needs FRONTEND_FETCH_TOKEN (or the FRONTEND_DIST_URL override) with read access
# to its release assets - see server/README.md, 'Serving front-end'. It fails
# loudly on the placeholder pin (no silent fallback), so a release/nightly build
# fails here until the pin is real or FRONTEND_DIST_URL is set.

BUNDLE="frontend-bundle"

# fetch-frontend wipes and recreates its target dir, so fetch the NEW FE FIRST...
node ../../../build/fetch-frontend.js "$BUNDLE"

# ...then nest the OLD UI (built with PUBLIC_PATH=/old-ui/, see the root
# android:build:release script) under old-ui/.
rm -rf "$BUNDLE/old-ui"
cp -R ../host/dist "$BUNDLE/old-ui"
