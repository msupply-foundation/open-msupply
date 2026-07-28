#!/usr/bin/env bash
# One-command Android dev loop (kdd/android, key desire 2).
#
# What it does:
#   1. starts the vite dev server on the host
#   2. builds/installs the debug APK (on ONE device) with the WebView pointed
#      at the dev server
#   3. sets up the USB tunnels for that device:
#        adb reverse  device:3005  -> host:3005   (UI, hot reload — vite dev port)
#        adb reverse  device:8002  -> host:8000   (host-run backend, mode 2)
#        adb forward  host:18000   -> device:8000 (vite /graphql proxy -> the
#                                                  on-device server, mode 3)
#      The on-device embedded server binds device :8000 AND :8001 (discovery
#      graphql = port+1) — never tunnel on those.
#   4. launches the app
#
# Device selection: first PHYSICAL device, else first emulator. Override with
#   pnpm dev-android <serial>     (serials: adb devices)
#
# UI changes hot-reload with no reinstall. Native changes need a re-run.
#
# The debug APK installs as org.openmsupply.client.dev (applicationIdSuffix,
# android/app/build.gradle) so it coexists with a production install.
set -euo pipefail
cd "$(dirname "$0")/.."

# fail fast: the Capacitor CLI arrives with `pnpm install` (a stale checkout
# otherwise gets all the way to the cap sync step before dying on it)
if [ ! -x node_modules/.bin/cap ]; then
  echo "Capacitor CLI not found (node_modules/.bin/cap) — run: pnpm install" >&2
  exit 1
fi

# gradle needs a JDK even if none is on PATH; fall back to the sdkman install
# (macOS ships a /usr/bin/java stub that exists but errors — run it to be sure)
if [ -z "${JAVA_HOME:-}" ] && ! java -version >/dev/null 2>&1; then
  for v in "$HOME"/.sdkman/candidates/java/21*; do
    [ -d "$v" ] && export JAVA_HOME="$v"
  done
fi

# The dev loop doesn't need the on-device server (host backend is the default,
# kdd/android desire 2B) — the app runs fine without the library bundled.
# Embedded-server work: source libremote_server_android.so into
# android/app/src/main/jniLibs/arm64-v8a/ yourself (gitignored; a fetch
# script is a planned follow-up) — whatever sits there gets bundled.

# Resolve the SDK once and EXPORT it: gradle reads ANDROID_HOME (or a
# gitignored android/local.properties sdk.dir) to find the SDK, and errors with
# "SDK location not found" if neither is set — even though adb below only needs
# the path locally. Exporting the same value the script already defaults to
# covers gradle too, with no machine-specific file to create.
export ANDROID_HOME="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-$HOME/Library/Android/sdk}}"
if [ ! -d "$ANDROID_HOME" ]; then
  echo "Android SDK not found at ANDROID_HOME=$ANDROID_HOME." >&2
  echo "Install it (Android Studio → SDK Manager) or set ANDROID_HOME to your SDK path." >&2
  exit 1
fi
ADB="$ANDROID_HOME/platform-tools/adb"
DEVICES="$($ADB devices | awk 'NR>1 && $2=="device" {print $1}')"
if [ -z "$DEVICES" ]; then
  echo "No connected device/emulator. Start one first (e.g. emulator -avd <name>)." >&2
  exit 1
fi
# explicit serial wins; otherwise prefer a physical device over an emulator.
# `|| true`: with only emulators connected, grep -v matches nothing and exits
# 1, which under `set -e` would abort the script before the emulator fallback
# on the next line ever runs.
DEVICE="${1:-$(echo "$DEVICES" | grep -v '^emulator-' | head -1 || true)}"
DEVICE="${DEVICE:-$(echo "$DEVICES" | head -1)}"
if [ "$(echo "$DEVICES" | wc -l)" -gt 1 ]; then
  echo "Multiple devices connected:" && echo "$DEVICES" | sed 's/^/  /'
fi
echo "Using device: $DEVICE"

# fail fast on a doomed install: a higher-versioned install already on the
# device means gradle builds for minutes, then dies at the install step with
# INSTALL_FAILED_VERSION_DOWNGRADE
PKG=org.openmsupply.client.dev # debug appId (applicationIdSuffix, android/app/build.gradle)
OUR_VC="$(awk '/versionCode/ {print $2; exit}' android/app/build.gradle)"
DEVICE_VC="$($ADB -s "$DEVICE" shell dumpsys package "$PKG" 2>/dev/null \
  | sed -n 's/.*versionCode=\([0-9][0-9]*\).*/\1/p' | head -1 || true)"
if [ -n "$DEVICE_VC" ] && [ -n "$OUR_VC" ] && [ "$DEVICE_VC" -gt "$OUR_VC" ]; then
  echo "$PKG on $DEVICE is versionCode $DEVICE_VC; this build is $OUR_VC — install would fail (VERSION_DOWNGRADE)." >&2
  echo "Uninstall it first (wipes that install's local app data):" >&2
  echo "  $ADB -s $DEVICE uninstall $PKG" >&2
  exit 1
fi

# vite in the background unless something already listens on 3005 (this
# repo's dev port — vite.config.ts)
if ! nc -z localhost 3005 2>/dev/null; then
  pnpm dev &
  VITE_PID=$!
  trap 'kill $VITE_PID 2>/dev/null || true' EXIT
  until nc -z localhost 3005 2>/dev/null; do sleep 0.3; done
fi

# fail fast on the host backend (mode 2, the default): the app's startup me
# query must answer with the cookie-session auth-contract shape
# ("Unauthenticated" when no session) — any other server boots the app straight
# into the unexpected-error modal ("Internal error"). See the blocker in
# kdd/android/android-spec.md.
if ! nc -z localhost 8000 2>/dev/null; then
  echo "WARNING: nothing listening on host :8000 — the app's GraphQL calls will fail." >&2
else
  ME_RESPONSE="$(curl -s -m 5 -X POST http://localhost:8000/graphql \
    -H 'content-type: application/json' \
    -d '{"query":"query me { me { ... on UserNode { __typename } } }"}' || true)"
  case "$ME_RESPONSE" in
    *Unauthenticated* | *UserNode*) ;; # server speaks the auth contract
    *)
      echo "The server on host :8000 does not carry the cookie-session auth contract — its me query returned:" >&2
      echo "  ${ME_RESPONSE:-<no response>}" >&2
      echo "Login cannot work against it. Run a host server built from the legacy repo's develop branch (kdd/android/android-spec.md)." >&2
      exit 1
      ;;
  esac
fi

$ADB -s "$DEVICE" reverse tcp:3005 tcp:3005
$ADB -s "$DEVICE" reverse tcp:8002 tcp:8000 || true
$ADB -s "$DEVICE" forward tcp:18000 tcp:8000

# cap sync WRITES capacitor.config.json / capacitor.plugins.json into this dir
# but does not create it — and it's empty on a fresh checkout (everything under
# assets/ is gitignored except a tracked .gitkeep), so ensure it exists first.
mkdir -p android/app/src/main/assets
# DEV_ANDROID=1 makes capacitor.config.ts set server.url to the dev server;
# ANDROID_SERIAL scopes gradle's install to the selected device only
DEV_ANDROID=1 pnpm exec cap sync android
(cd android && ANDROID_SERIAL="$DEVICE" ./gradlew installDebug -q)
# fully qualified component: the debug appId ($PKG) differs from the Java
# namespace the activity class lives in
$ADB -s "$DEVICE" shell am start -n "$PKG/org.openmsupply.client.MainActivity"

echo "App launched on $DEVICE against http://localhost:3005 (hot reload). Ctrl-C stops vite."
wait
