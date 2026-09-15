#!/usr/bin/env bash
# One-command debug APK build (kdd/android key desire 3): web bundle → APK
# assets → gradle assemble. No Rust/NDK toolchain involved.
#
# ⚠ The embedded server is NOT fetched: an actual (shippable) APK needs
# libremote_server_android.so sourced into android/app/src/main/jniLibs/
# arm64-v8a/ before building (gitignored; whatever sits there gets bundled,
# absence = app runs host/remote-backend only). Automated fetching of the
# pinned artifact is a planned follow-up — see kdd/android/android-spec.md.
set -euo pipefail
cd "$(dirname "$0")/.."

# fail fast: the Capacitor CLI arrives with `pnpm install`
if [ ! -x node_modules/.bin/cap ]; then
  echo "Capacitor CLI not found (node_modules/.bin/cap) — run: pnpm install" >&2
  exit 1
fi

# the header warning, enforced at runtime: without the server library the APK
# runs against host/remote backends only (no embedded server)
SO=android/app/src/main/jniLibs/arm64-v8a/libremote_server_android.so
if [ ! -f "$SO" ]; then
  echo "NOTE: $SO not present — this APK will carry NO embedded server (host/remote backend only)." >&2
  echo "For a standalone APK, build the library from the legacy repo (develop branch, cargo ndk — see kdd/android/android-spec.md) and copy it there first." >&2
fi

# gradle needs a JDK even if none is on PATH; fall back to the sdkman install
# (macOS ships a /usr/bin/java stub that exists but errors — run it to be sure)
if [ -z "${JAVA_HOME:-}" ] && ! java -version >/dev/null 2>&1; then
  for v in "$HOME"/.sdkman/candidates/java/21*; do
    [ -d "$v" ] && export JAVA_HOME="$v"
  done
fi

# gradle finds the Android SDK via ANDROID_HOME (or a gitignored
# android/local.properties sdk.dir), erroring "SDK location not found" if
# neither is set. Export the same default path the standard macOS install uses.
export ANDROID_HOME="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-$HOME/Library/Android/sdk}}"
if [ ! -d "$ANDROID_HOME" ]; then
  echo "Android SDK not found at ANDROID_HOME=$ANDROID_HOME." >&2
  echo "Install it (Android Studio → SDK Manager) or set ANDROID_HOME to your SDK path." >&2
  exit 1
fi

# One build carries both pages: the app and the discovery page (a second
# entry of the same graph, served at /discovery.html — client-mode launch
# loads it, MainActivity; spec/desktop's Android sibling).
pnpm build
# cap sync writes capacitor.config.json / capacitor.plugins.json here but does
# not create the dir; ensure it exists (empty on a fresh checkout — all of
# assets/ is gitignored bar a tracked .gitkeep).
mkdir -p android/app/src/main/assets
pnpm exec cap sync android
(cd android && ./gradlew assembleDebug)
echo "APK: android/app/build/outputs/apk/debug/app-debug.apk"
