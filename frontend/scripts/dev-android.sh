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
set -euo pipefail
cd "$(dirname "$0")/.."

# gradle needs a JDK even if none is on PATH; fall back to the sdkman install
# (macOS ships a /usr/bin/java stub that exists but errors — run it to be sure)
if [ -z "${JAVA_HOME:-}" ] && ! java -version >/dev/null 2>&1; then
  for v in "$HOME"/.sdkman/candidates/java/21*; do
    [ -d "$v" ] && export JAVA_HOME="$v"
  done
fi

# The dev loop doesn't need the on-device server (host backend is the default,
# kdd/android desire 2B) — the app runs fine without the library bundled.
# EMBEDDED_SERVER=1 opts in to fetching + booting it (Fork 4); build-android.sh
# always bundles it. NB: once fetched, the lib stays in jniLibs (gitignored)
# and keeps being bundled until you delete it.
if [ "${EMBEDDED_SERVER:-}" = "1" ]; then
  ./scripts/fetch-server-lib.sh
fi

ADB="${ANDROID_HOME:-$HOME/Library/Android/sdk}/platform-tools/adb"
DEVICES="$($ADB devices | awk 'NR>1 && $2=="device" {print $1}')"
if [ -z "$DEVICES" ]; then
  echo "No connected device/emulator. Start one first (e.g. emulator -avd <name>)." >&2
  exit 1
fi
# explicit serial wins; otherwise prefer a physical device over an emulator
DEVICE="${1:-$(echo "$DEVICES" | grep -v '^emulator-' | head -1)}"
DEVICE="${DEVICE:-$(echo "$DEVICES" | head -1)}"
if [ "$(echo "$DEVICES" | wc -l)" -gt 1 ]; then
  echo "Multiple devices connected:" && echo "$DEVICES" | sed 's/^/  /'
fi
echo "Using device: $DEVICE"

# vite in the background unless something already listens on 3005 (this
# repo's dev port — vite.config.ts)
if ! nc -z localhost 3005 2>/dev/null; then
  pnpm dev &
  VITE_PID=$!
  trap 'kill $VITE_PID 2>/dev/null || true' EXIT
  until nc -z localhost 3005 2>/dev/null; do sleep 0.3; done
fi

# warn early if there's no host backend for mode 2
if ! nc -z localhost 8000 2>/dev/null; then
  echo "WARNING: nothing listening on host :8000 — the app's GraphQL calls will fail." >&2
fi

$ADB -s "$DEVICE" reverse tcp:3005 tcp:3005
$ADB -s "$DEVICE" reverse tcp:8002 tcp:8000 || true
$ADB -s "$DEVICE" forward tcp:18000 tcp:8000

# DEV_ANDROID=1 makes capacitor.config.ts set server.url to the dev server;
# ANDROID_SERIAL scopes gradle's install to the selected device only
DEV_ANDROID=1 pnpm exec cap sync android
(cd android && ANDROID_SERIAL="$DEVICE" ./gradlew installDebug -q)
$ADB -s "$DEVICE" shell am start -n org.openmsupply.client/.MainActivity

echo "App launched on $DEVICE against http://localhost:3005 (hot reload). Ctrl-C stops vite."
wait
