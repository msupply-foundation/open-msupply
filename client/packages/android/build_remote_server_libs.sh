#! /bin/bash
set -e

# See server/android/README/md for more details

# Build mode: release or debug (default: release)
BUILD_MODE="${1:-release}"

if [[ "$BUILD_MODE" != "release" && "$BUILD_MODE" != "debug" ]]; then
    echo "Error: Build mode must be 'release' or 'debug'"
    echo "Usage: $0 [release|debug]"
    exit 1
fi

# The following env variables are needed to build ring 0.16.20:
export AR=${NDK_BIN}/llvm-ar
export CC_armv7_linux_androideabi=${NDK_BIN}/armv7a-linux-androideabi22-clang

# Build arm64-v8a:aarch64-linux-android (Defined in cargo.toml)
if [[ "$BUILD_MODE" == "release" ]]; then
    PATH=PATH=$PATH:$NDK_BIN \
        cargo build \
            --release \
            --manifest-path="../../../server/android/Cargo.toml" \
            --config="../../../server/android/.cargo/config.toml" \
            --target-dir="$(pwd)/server-lib"
else
    PATH=PATH=$PATH:$NDK_BIN \
        cargo build \
            --manifest-path="../../../server/android/Cargo.toml" \
            --config="../../../server/android/.cargo/config.toml" \
            --target-dir="$(pwd)/server-lib"
fi

# Copy built .so files to jniLib
cp "server-lib/aarch64-linux-android/$BUILD_MODE/libremote_server_android.so" "app/src/main/jniLibs/arm64-v8a/"
# mkdir -p "app/src/main/jniLibs/armeabi-v7a"
# cp "server-lib/armv7-linux-androideabi/release/libremote_server_android.so" "app/src/main/jniLibs/armeabi-v7a/"

