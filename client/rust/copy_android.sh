#! /bin/bash

LIB_NAME=libremote_server_android

ANDROID_DIR="../android"
JNILIBS="$ANDROID_DIR/app/src/main/jniLibs"

mkdir -p $JNILIBS
mkdir -p $JNILIBS/x86
mkdir -p $JNILIBS/arm64-v8a
mkdir -p $JNILIBS/armeabi-v7a

RUST_OUTPUT="./remote-server/target"
cp $RUST_OUTPUT/i686-linux-android/release/$LIB_NAME.so $JNILIBS/x86/$LIB_NAME.so
cp $RUST_OUTPUT/aarch64-linux-android/release/$LIB_NAME.so $JNILIBS/arm64-v8a/$LIB_NAME.so
cp $RUST_OUTPUT/armv7-linux-androideabi/release/$LIB_NAME.so $JNILIBS/armeabi-v7a/$LIB_NAME.so
