#! /bin/bash
set -e

# See server/android/README/md for more details

# Build arm64-v8a:aarch64-linux-android and armeabi-v7a:armv7-linux-androideabi
PATH=PATH=$PATH:$NDK_BIN \
    cargo build \
        --release \
        --manifest-path="../../../server/android/Cargo.toml" \
        --config="../../../server/android/.cargo/config.toml" \
        --target-dir="$(pwd)/server-lib"

# Copy built .so files to jniLib
cp "server-lib/aarch64-linux-android/release/libremote_server_android.so" "app/src/main/jniLibs/arm64-v8a/"
cp "server-lib/armv7-linux-androideabi/release/libremote_server_android.so" "app/src/main/jniLibs/armeabi-v7a/"