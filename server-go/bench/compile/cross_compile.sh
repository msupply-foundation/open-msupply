#!/usr/bin/env bash
# WS5-B: cross-compile cost comparison — pure-Go (goja) vs CGO+Boa(Rust).
#
# Findings (this machine, see docs/DECISION.md):
#   pure-Go : 5/5 targets build with ZERO extra toolchain.
#   CGO+Rust: fails out-of-box (host clang can't target other OS); tractable only with the
#             full zig + rust-cross-target + per-target staticlib setup shown at the bottom.
set -uo pipefail
cd "$(dirname "$0")/../.."

TARGETS="darwin/arm64 linux/amd64 linux/arm64 android/arm64 windows/amd64"

echo "=== PURE-GO (CGO_ENABLED=0) — portability-sensitive packages (goja + modernc + pgx) ==="
for t in $TARGETS; do
  os=${t%/*}; arch=${t#*/}
  if CGO_ENABLED=0 GOOS=$os GOARCH=$arch go build -o /dev/null \
       ./internal/reports/ ./internal/db/ ./internal/migrations/ 2>/dev/null; then
    echo "  $t: OK (no extra toolchain)"
  else
    echo "  $t: FAIL"
  fi
done

echo
echo "=== CGO + Boa(Rust) — out-of-the-box cross-compile (expected to fail at runtime/cgo) ==="
for t in linux/arm64 android/arm64 windows/amd64; do
  os=${t%/*}; arch=${t#*/}
  err=$(CGO_ENABLED=1 GOOS=$os GOARCH=$arch go build -tags boa -o /dev/null ./internal/reports/ 2>&1 | head -1)
  echo "  $t: ${err:-OK}"
done

cat <<'NOTE'

--- Making CGO+Rust cross-compile work (what it takes, per the linux/arm64 proof) ---
  brew install zig                                    # C cross-linker (~150MB)
  rustup target add aarch64-unknown-linux-gnu         # + per additional arch
  cat > /tmp/zcc <<'E'
  #!/bin/sh
  exec zig cc -target aarch64-linux-gnu "$@"
  E
  chmod +x /tmp/zcc
  CARGO_TARGET_AARCH64_UNKNOWN_LINUX_GNU_LINKER=/tmp/zcc CC_aarch64_unknown_linux_gnu=/tmp/zcc \
    cargo build --release --target aarch64-unknown-linux-gnu \
    --manifest-path ffi/boa/Cargo.toml            # 52MB staticlib, ~30s
  CGO_ENABLED=1 GOOS=linux GOARCH=arm64 CC=/tmp/zcc \
    CGO_LDFLAGS="$PWD/ffi/boa/target/aarch64-unknown-linux-gnu/release/libboa_ffi.a" \
    go build -tags boa ./internal/reports/         # OK
  # windows -> mingw or zig windows target + rust windows target; android -> NDK clang as CC.
NOTE
