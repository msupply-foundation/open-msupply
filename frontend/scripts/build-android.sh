#!/usr/bin/env bash
# One-command debug APK build (kdd/android key desire 3): web bundle → APK
# assets → gradle assemble. Fetches the prebuilt server lib if missing —
# no Rust/NDK toolchain involved.
set -euo pipefail
cd "$(dirname "$0")/.."

# gradle needs a JDK even if none is on PATH; fall back to the sdkman install
# (macOS ships a /usr/bin/java stub that exists but errors — run it to be sure)
if [ -z "${JAVA_HOME:-}" ] && ! java -version >/dev/null 2>&1; then
  for v in "$HOME"/.sdkman/candidates/java/21*; do
    [ -d "$v" ] && export JAVA_HOME="$v"
  done
fi

./scripts/fetch-server-lib.sh
pnpm build
pnpm exec cap sync android
(cd android && ./gradlew assembleDebug)
echo "APK: android/app/build/outputs/apk/debug/app-debug.apk"
