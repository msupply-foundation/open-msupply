# Android server library (`libremote_server_android.so`)

This crate builds the Open mSupply server as an Android shared library
(`cdylib`), started/stopped over JNI (`org.openmsupply.client.RemoteServer`).

The library is **frontend-agnostic**: the server serves its web UI from
`server.frontend_dir` at runtime (`<filesDir>/frontend`, see
`src/android.rs`), and the app shell owns copying a web bundle there before
starting the server. No web bundle is compiled into the `.so`.

## Published artifact

CI ([build-android-server-lib.yaml](../../.github/workflows/build-android-server-lib.yaml))
builds the library on every `v*` tag (and on demand via workflow dispatch) on
the self-hosted Mac mini runner (same NDK the APK build uses; the workflow
pins its path) and uploads a zip as a workflow artifact. For non-nightly tags
the zip is also attached to the GitHub release, with a `.sha256` checksum:

```text
remote-server-android-<version>.zip
├── jniLibs/
│   ├── arm64-v8a/libremote_server_android.so
│   └── armeabi-v7a/libremote_server_android.so
└── VERSION.txt   (version, commit, abis)
```

Only the release profile is published. For a debuggable set-up, run the
server on a dev machine and point the app at it via `adb reverse` instead of
debugging through the `.so`.

Consumers (e.g. the [open-msupply-frontend](https://github.com/msupply-foundation/open-msupply-frontend)
Android app) pin a version and fetch + checksum-verify the zip at build time,
unpacking `jniLibs/` into their gradle project. No Rust/NDK toolchain needed
on the consumer side.

## Building locally

Requires an Android NDK (r26+; `.cargo/config.toml` uses the API-22 clang
wrappers) and the `aarch64-linux-android` / `armv7-linux-androideabi` rust
targets. From the repo root:

```bash
export NDK_BIN=<ndk>/toolchains/llvm/prebuilt/<host>/bin
export AR="$NDK_BIN/llvm-ar"                                            # for `ring`
export CC_armv7_linux_androideabi="$NDK_BIN/armv7a-linux-androideabi22-clang"
PATH="$PATH:$NDK_BIN" cargo build --release \
    --manifest-path server/android/Cargo.toml \
    --config server/android/.cargo/config.toml \
    --target-dir "$PWD/server-lib"
```

Both target `.so`s land under `server-lib/<target>/release/`. The legacy
in-repo APK build drives the same thing via
`client/packages/android/build_remote_server_libs.sh`.

## Runtime notes

- The server binds the configured port **and port + 1** (discovery graphql).
- A fresh server runs in initialisation mode (`InitialisationQueries`
  schema) until synced.
- `machine_uid` comes from the `androidId` JNI parameter, not the
  `machine-uid` crate (the `android` feature of the `server` crate disables
  it).
