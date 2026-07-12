#!/usr/bin/env bash
# Fetch the prebuilt embedded server library (kdd/android Fork 4).
#
# The pinned open-msupply server version for this repo. Today the artifact is
# extracted from the release APK (no dedicated .so artifact is published yet —
# that's an ask on the legacy repo); the pin + checksum-able download is the
# contract this script enforces. jniLibs is gitignored: 130 MB binary.
#
# ⚠ SCHEMA COMPATIBILITY — the pin below is KNOWN WRONG for this frontend.
# The app is codegen'd against spec/schema.graphql, whose floor is the
# legacy repo's `fe-auth-contract` branch (cookie-session auth: UserNode
# timing hints etc.) — ahead of every published release, so there is no
# correct version to pin yet. The embedded server boots with v2.20.01 but
# the app's login query will fail on it ("Unknown field …"). Embedded-server
# flows are blocked on the legacy repo publishing an .so artifact from that
# contract (tracked in kdd/android). Host-backend dev (the default loop)
# doesn't use this library at all.
#
# Overrides:
#   OMS_SERVER_VERSION  release tag to extract from (default below)
#   OMS_SERVER_LIB      path to a locally built .so (e.g. cargo-ndk build of
#                       fe-auth-contract) — copied into place, no download
set -euo pipefail
cd "$(dirname "$0")/.."

OMS_SERVER_VERSION="${OMS_SERVER_VERSION:-v2.20.01}"
LIB_DIR="android/app/src/main/jniLibs/arm64-v8a"
LIB="$LIB_DIR/libremote_server_android.so"

if [ -n "${OMS_SERVER_LIB:-}" ]; then
  [ -f "$OMS_SERVER_LIB" ] || { echo "OMS_SERVER_LIB not found: $OMS_SERVER_LIB" >&2; exit 1; }
  mkdir -p "$LIB_DIR"
  cp "$OMS_SERVER_LIB" "$LIB"
  echo "server lib installed from local build: $OMS_SERVER_LIB"
  exit 0
fi

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
