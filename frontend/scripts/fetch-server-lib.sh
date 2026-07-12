#!/usr/bin/env bash
# Fetch the prebuilt embedded server library (kdd/android Fork 4).
#
# The pinned open-msupply server version for this repo. Today the artifact is
# extracted from the release APK (no dedicated .so artifact is published yet —
# that's an ask on the legacy repo); the pin + checksum-able download is the
# contract this script enforces. jniLibs is gitignored: 130 MB binary.
set -euo pipefail
cd "$(dirname "$0")/.."

OMS_SERVER_VERSION="v2.20.01"
LIB_DIR="android/app/src/main/jniLibs/arm64-v8a"
LIB="$LIB_DIR/libremote_server_android.so"

if [ -f "$LIB" ]; then
  echo "server lib present: $LIB"
  exit 0
fi

command -v gh >/dev/null || { echo "gh CLI required to fetch the server lib" >&2; exit 1; }

APK="open-msupply-${OMS_SERVER_VERSION#v}-arm64-release.apk"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "Fetching $APK from open-msupply $OMS_SERVER_VERSION…"
gh release download "$OMS_SERVER_VERSION" -R msupply-foundation/open-msupply \
  --pattern "$APK" --dir "$TMP"
unzip -q -o "$TMP/$APK" 'lib/arm64-v8a/libremote_server_android.so' -d "$TMP"
mkdir -p "$LIB_DIR"
mv "$TMP/lib/arm64-v8a/libremote_server_android.so" "$LIB"
echo "server lib installed: $LIB ($OMS_SERVER_VERSION)"
