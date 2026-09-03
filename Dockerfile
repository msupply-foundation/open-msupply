# syntax=docker/dockerfile:1
#
# Everything is built here. Previously the server binaries and both frontends
# were produced on the host and COPY'd in, which meant the image build and the
# compile were two systems that had to be kept in step and shared no cache. One
# Dockerfile means CD and the tag builds run the identical path, so a develop
# merge genuinely warms the cache the nightly tag needs.
#
# Build one image:  docker build --target postgres -t <tag> .
# BuildKit only runs the stages a target depends on, so --target sqlite never
# compiles the postgres binaries and vice versa.

# Stage graph
# ===========
# BuildKit runs independent branches concurrently and skips every stage the
# chosen --target does not reach - so `--target sqlite` never compiles the
# postgres binaries, and the frontend build overlaps the server compile rather
# than adding to it.
#
# Cross-compilation: the two compile stages are pinned to $BUILDPLATFORM and
# cross-compile to $TARGETARCH, so `--platform linux/arm64` on an amd64 host
# runs rustc natively rather than emulating it. That is where the emulation
# saving is - rustc is the expensive part, and it never runs emulated.
#
# The runtime stages DO take the target platform, so every RUN in them is
# emulated on a cross build: faketime-builder's make, base's apt-get, and
# postgres's postgresql-17 install. That needs binfmt_misc registered on the
# HOST kernel - neither this file nor the workflow can arrange it, and a build
# without it fails at the first foreign-arch RUN with "exec format error". See
# docs/content/github-actions/self-hosted-runners for the host setup.
#
#   [build host arch]     [build host arch]      [target arch]
#     rust:<ver>            node:<ver>            debian:<ver>-slim
#         |                     |                    |          |
#         v                     v                    v          |
#    server-base          frontend-build      faketime-builder  |
#     .---'---.                 |                    |          |
#     v       v                 '---------.----------'          |
#  build-   build-                        v                     |
#  sqlite  postgres                     base <------------------'
#     |       |                        .--'--.
#     |       |                        v     v
#     '-------|-------------------> sqlite   |
#             '------------------------------> postgres
#                                       |         |
#                                       v         v
#                                      dev   postgres-dev
#
#   base            <- both frontends, libfaketime, configuration, server/data
#   sqlite/postgres <- base + that flavour's binaries    (sqlite = default target)
#   dev variants    <- + node, yarn, client source; postgres also adds
#                      postgresql-17 and gosu
#
# Everything above `base` is discarded; only the runtime stages are shipped.
#
# The two server-build stages are deliberately separate rather than one stage
# with an ARG: a build arg could disagree with --target and silently ship the
# wrong binary, whereas the DAG makes that unrepresentable.

ARG RUST_VERSION=1.94
# Keep in sync with client/.nvmrc (a FROM cannot read a file).
ARG NODE_VERSION=24
# Runtime base. rust:<ver>-slim is Debian 13, so this tracks it.
ARG DEBIAN_VERSION=trixie
# Cargo profile for the server compile. `release` for anything shipped;
# `debug` (cargo's `dev` profile) skips the optimisation pass, so it compiles
# faster and produces a slower binary, and is not stripped where release sets
# `strip = true`. The size and speed deltas here are UNMEASURED - see the
# `debug` section of docs/content/docker for what is and is not known.
#
# Accepts any profile name in server/Cargo.toml - `debug` and `dev` are both
# spelled the way cargo names the OUTPUT DIRECTORY, because that is the name
# the copy-out below has to agree with.
ARG CARGO_PROFILE=release

# ---------------------------------------------------------------- server build
# --platform=$BUILDPLATFORM pins this stage to the machine doing the building,
# so rustc always runs natively and merely *targets* the other architecture.
# Without it, buildx would run the whole compile under QEMU emulation - which is
# what makes naive multi-arch Docker builds 5-10x slower, and why dockerise
# cross-compiles by hand today. This is that same recipe, expressed in the DAG.
FROM --platform=$BUILDPLATFORM rust:${RUST_VERSION} AS server-base
# Supplied automatically by buildx. BUILDARCH is the host, TARGETARCH the goal;
# equal means a native build and none of the cross plumbing below applies.
ARG TARGETARCH
ARG BUILDARCH
# Full rust image, not -slim: -slim lacks the system libraries this workspace
# needs and rediscovering them one failed build script at a time is expensive.
# Named explicitly so a base change fails here rather than deep in a build.
#   libfontconfig-dev  yeslogic-fontconfig-sys, via headless_chrome
#   libpq-dev          pq-sys, postgres feature
#   cmake              aws-lc-sys builds AWS-LC from source
# sqlite needs nothing: libsqlite3-sys is `bundled`.
RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends \
      libfontconfig-dev libpq-dev cmake pkg-config; \
    if [ "$TARGETARCH" != "$BUILDARCH" ]; then \
      # PKG and GNU differ for x86_64: Debian names the cross compiler
      # gcc-x86-64-linux-gnu (hyphens) while the multiarch dir and binary
      # prefix are x86_64-linux-gnu (underscore). They coincide for aarch64,
      # so only the amd64 target exposes the difference.
      case "$TARGETARCH" in \
        arm64) DEB=arm64; PKG=aarch64-linux-gnu; GNU=aarch64-linux-gnu ;; \
        amd64) DEB=amd64; PKG=x86-64-linux-gnu;  GNU=x86_64-linux-gnu  ;; \
        *) echo "unsupported TARGETARCH: $TARGETARCH" >&2; exit 1 ;; \
      esac; \
      dpkg --add-architecture "$DEB"; \
      apt-get update; \
      # The -sys crates each need their library for the TARGET arch, not the
      # host's: pq-sys links libpq, and fontconfig-sys probes via pkg-config.
      apt-get install -y --no-install-recommends \
        "gcc-${PKG}" "libc6-dev-${DEB}-cross" \
        "libpq-dev:${DEB}" "libfontconfig-dev:${DEB}"; \
    fi; \
    rm -rf /var/lib/apt/lists/*
WORKDIR /src
COPY server server
# Resolved once and sourced by both build stages, so the cross recipe lives in
# exactly one place. Every value is single-quoted, which is load-bearing:
# `TARGET_FLAG=--target x86_64-unknown-linux-gnu` sourced unquoted is an
# assignment PREFIX plus a command, so the shell tries to run the triple and
# the build dies with "command not found" before cargo is ever reached.
#
# Native builds get an empty TARGET_FLAG and cargo's usual target/ path; cross
# builds get --target, which moves the output under target/<triple>/ and needs
# the linker and lib dirs pointed at the target arch. Deliberately NOT passing
# --target on native builds: it would force proc-macros and build scripts to be
# compiled twice.
RUN set -eux; \
    if [ "$TARGETARCH" = "$BUILDARCH" ]; then \
      echo 'TARGET_FLAG=' > /cross.env; \
      echo 'TARGET_SUBDIR=target' >> /cross.env; \
    else \
      case "$TARGETARCH" in \
        arm64) TRIPLE=aarch64-unknown-linux-gnu; GNU=aarch64-linux-gnu ;; \
        amd64) TRIPLE=x86_64-unknown-linux-gnu;  GNU=x86_64-linux-gnu  ;; \
      esac; \
      rustup target add "$TRIPLE"; \
      { \
        echo "TARGET_FLAG='--target $TRIPLE'"; \
        echo "TARGET_SUBDIR=target/$TRIPLE"; \
        echo "CARGO_TARGET_$(echo "$TRIPLE" | tr 'a-z-' 'A-Z_')_LINKER=${GNU}-gcc"; \
        echo "CC_$(echo "$TRIPLE" | tr 'a-z-' 'a-z_')=${GNU}-gcc"; \
        echo "PKG_CONFIG_PATH=/usr/lib/${GNU}/pkgconfig"; \
        echo "PKG_CONFIG_ALLOW_CROSS=1"; \
        echo "PQ_LIB_DIR=/usr/lib/${GNU}"; \
      } > /cross.env; \
    fi; \
    cat /cross.env

# Profile resolution, in its own RUN and with the ARG declared here rather than
# at the top of the stage: everything above is profile-independent, so a debug
# and a release build differ only in this one echo and share the apt install,
# the source COPY and the cross setup above it.
#
# Two names because cargo does not use one. The FLAG wants the profile as
# Cargo.toml spells it (`dev`), the DIRECTORY is what cargo actually writes
# (`debug`) - the pair only diverges for the dev profile, which is precisely the
# one being asked for here. `--profile release` is accepted and identical to
# `--release`, so release needs no special case.
ARG CARGO_PROFILE
RUN set -eux; \
    case "$CARGO_PROFILE" in \
      debug|dev) echo 'PROFILE_ARG=dev'; echo 'PROFILE_DIR=debug' ;; \
      *) echo "PROFILE_ARG=$CARGO_PROFILE"; echo "PROFILE_DIR=$CARGO_PROFILE" ;; \
    esac > /profile.env; \
    cat /profile.env

# rust-embed reaches OUTSIDE server/ at compile time, so these are build inputs
# even though nothing under server/ references them as paths. Miss one and the
# derive generates no impl, which surfaces as a baffling "function or associated
# item `get` not found" on the asset struct rather than as a missing file. The
# old workflow never hit this because it bind-mounted the whole repo; an
# explicit build context has to name them.
#   repository/src/migrations/version.rs  ../../package.json
#   service/src/localisations.rs          ../../client/packages/common/src/intl/locales
#   service/src/standard_reports.rs       ../../standard_reports/generated
#                                         ../../standard_forms/generated
COPY package.json package.json
COPY client/packages/common/src/intl/locales client/packages/common/src/intl/locales
COPY standard_reports/generated standard_reports/generated
COPY standard_forms/generated standard_forms/generated

# The target dir is a cache mount, so it does NOT survive the RUN - the binaries
# have to be copied out to a real layer before it ends.
#
# No sccache here, deliberately. Benchmarked on the runner, a warm cargo target
# dir alone beat target-dir + sccache: with fingerprints intact cargo skips 
# untouched units without invoking rustc at all, so there is nothing for a
# compilation cache to accelerate. sccache earns its place where the target dir
# is absent or stale, which is not this build.
FROM server-base AS server-build-sqlite
ARG TARGETARCH
# The cache id carries the target arch: an amd64 and an arm64 build produce
# different artifacts, so sharing one target dir would make them evict each
# other on every release.
#
# It deliberately does NOT carry CARGO_PROFILE. Cargo already separates profiles
# into target/debug and target/release with their own fingerprints, so the two
# coexist in one mount without interfering - and keeping the id as it is means
# adding debug builds does not orphan the warm release cache that every release
# and every develop merge depends on. The cost is a bigger mount (a debug target
# dir is several times a release one, and the dev profile has incremental
# compilation on by default); `docker builder prune --filter
# type=exec.cachemount` is the release valve.
#
# sharing=private, not locked: if two builds want the SAME id at once (a tag
# build overlapping a develop merge, say), locked makes the second wait for the
# first - blocking a whole lane. private hands it its own cache instead, so it
# runs immediately. The trade is that the second build's cache starts empty, so
# it is cold rather than free, and orphaned private caches accumulate on disk
# (`docker builder prune --filter type=exec.cachemount`).
#
# The registry mount is sharing=shared: it is append-mostly downloaded .crate
# files and cargo does its own locking, exactly as it does on a dev machine
# running two projects at once. Leaving it `locked` would serialise EVERY pair
# of concurrent builds on the registry even when their target dirs differ,
# which defeats the per-db and per-arch ids entirely.
RUN --mount=type=cache,id=cargo-target-sqlite-$TARGETARCH,target=/src/server/target,sharing=private \
    --mount=type=cache,id=cargo-registry,target=/usr/local/cargo/registry,sharing=shared \
    set -eux; \
    . /cross.env; export $(cut -d= -f1 /cross.env); \
    . /profile.env; \
    cargo build --profile "$PROFILE_ARG" --manifest-path server/Cargo.toml $TARGET_FLAG \
        --bin remote_server --bin remote_server_cli; \
    mkdir -p /out; \
    OUT_DIR="$TARGET_SUBDIR/$PROFILE_DIR"; \
    cp "server/$OUT_DIR/remote_server" "server/$OUT_DIR/remote_server_cli" /out/

FROM server-base AS server-build-postgres
ARG TARGETARCH
# The cache id carries the target arch: an amd64 and an arm64 build produce
# different artifacts, so sharing one target dir would make them evict each
# other on every release.
RUN --mount=type=cache,id=cargo-target-postgres-$TARGETARCH,target=/src/server/target,sharing=private \
    --mount=type=cache,id=cargo-registry,target=/usr/local/cargo/registry,sharing=shared \
    set -eux; \
    . /cross.env; export $(cut -d= -f1 /cross.env); \
    . /profile.env; \
    cargo build --profile "$PROFILE_ARG" --manifest-path server/Cargo.toml $TARGET_FLAG \
        --no-default-features --features postgres \
        --bin remote_server --bin remote_server_cli; \
    mkdir -p /out; \
    OUT_DIR="$TARGET_SUBDIR/$PROFILE_DIR"; \
    cp "server/$OUT_DIR/remote_server" "server/$OUT_DIR/remote_server_cli" /out/

# -------------------------------------------------------------- frontend build
# Both frontends come from this commit's tree - no pin, no fetch, no token.
# Architecture-independent output, so pin it to the build host: without this
# buildx would run yarn, tsc and vite under QEMU for an arm64 target, which is
# minutes of emulation for bytes that are identical either way.
FROM --platform=$BUILDPLATFORM node:${NODE_VERSION} AS frontend-build
WORKDIR /src
COPY package.json yarn.lock .yarnrc.yml ./
COPY client client
COPY standard_reports standard_reports
COPY standard_forms standard_forms
COPY frontend frontend
RUN corepack enable
# Old UI, served under /old-ui/ - the PUBLIC_PATH is what rewrites asset URLs
# and the router base, so it cannot be relocated after the fact.
RUN --mount=type=cache,id=yarn,target=/root/.yarn/berry/cache,sharing=locked \
    yarn install --immutable \
    && cd client \
    && NODE_OPTIONS="--max_old_space_size=4096" yarn build:old-ui
# New FE, served at /
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store,sharing=locked \
    cd frontend && corepack pnpm install --frozen-lockfile && corepack pnpm build

# ------------------------------------------------------------------- runtime
# Build stage for libfaketime
FROM debian:${DEBIAN_VERSION}-slim AS faketime-builder
# ca-certificates is required for the HTTPS clone below and is NOT in
# debian-slim - the same omission that `base` already accounts for. Missing it
# fails as "Problem with the SSL CA cert", which reads like a proxy or network
# fault rather than a missing package.
RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates git make gcc libc6-dev \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /usr/src/
RUN git clone https://github.com/wolfcw/libfaketime.git
WORKDIR /usr/src/libfaketime/src
RUN make install

# Common runtime stage (no binaries yet).
#
# Plain Debian, not rust:<ver>-slim. The runtime shipped a full Rust toolchain
# it never used - roughly 700MB of compiler in every production image. What the
# server actually needs from the base is glibc, libgcc and bash, all of which
# are in debian-slim's essential set.
#
# ca-certificates is NOT in debian-slim and is added deliberately. The server's
# own outbound TLS does not need it - util/tls.rs uses webpki_roots, so the
# trust anchors are compiled into the binary - but anything else that reaches
# the network from inside the image would fail confusingly without it, and it
# costs a few hundred KB. tzdata IS already present.
FROM debian:${DEBIAN_VERSION}-slim AS base
# curl is here for the container healthcheck, which runs *inside* the image -
# debian-slim ships neither curl nor wget, so without it the probe cannot
# execute and the container reports unhealthy however well the server is
# actually running.
RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates curl \
    && apt-get clean && rm -rf /var/lib/apt/lists/*
# Copy only the compiled libfaketime from builder
COPY --from=faketime-builder /usr/local/lib/faketime/libfaketime.so.1 /usr/local/lib/faketime/
RUN echo "/usr/local/lib/faketime/libfaketime.so.1" > /etc/ld.so.preload

# PDF report export renders HTML through headless Chromium. Install the headless
# shell (chromium-headless-shell) — the GUI-less build, roughly half the installed
# size of the full chromium package — plus a metric-compatible font set (Liberation
# ~= the Helvetica/Arial the report CSS asks for; the slim base image ships no fonts,
# so text would otherwise render as blank boxes). See issue #12289.
RUN apt-get update && \
    apt-get install -y --no-install-recommends chromium-headless-shell fonts-liberation && \
    apt-get clean && rm -rf /var/lib/apt/lists/*
# headless_chrome finds the binary via the CHROME env var. chromium-headless-shell
# is not one of the names it auto-detects, so point CHROME at it explicitly. Chromium
# also refuses to run as root inside a container unless the sandbox is disabled, so
# signal the server to launch it with --no-sandbox (read in report::html_printing).
ENV CHROME=/usr/bin/chromium-headless-shell
ENV OMS_HEADLESS_CHROME_NO_SANDBOX=true

WORKDIR /usr/src/omsupply/server
COPY --chmod=755 docker/entry.sh .
COPY server/data data
# New FE served at / from server.frontend_dir (default: frontend/ relative to cwd).
COPY --from=frontend-build /src/frontend/dist frontend
# Old UI served at /old-ui/ : this repo's client build (PUBLIC_PATH=/old-ui/).
# The server serves frontend/old-ui at /old-ui/ by convention — no config needed.
COPY --from=frontend-build /src/client/packages/host/dist frontend/old-ui

WORKDIR /usr/src/omsupply/server/configuration
COPY server/configuration/base.yaml .
COPY docker/local.yaml .

RUN mkdir -p /database

WORKDIR /usr/src/omsupply/server

ENTRYPOINT ["/usr/src/omsupply/server/entry.sh"]
EXPOSE 8000

# SQLite target (default)
FROM base AS sqlite
COPY --from=server-build-sqlite --chmod=755 /out/remote_server .
COPY --from=server-build-sqlite --chmod=755 /out/remote_server_cli .

# Postgres target
FROM base AS postgres
COPY --from=server-build-postgres --chmod=755 /out/remote_server .
COPY --from=server-build-postgres --chmod=755 /out/remote_server_cli .
RUN apt-get update && apt-get install -y postgresql-17 libpq5 gosu && \
    apt-get clean && rm -rf /var/lib/apt/lists/*
# dbus (pulled in by postgresql-17) bakes a machine-id into the image at build
# time. The machine_uid crate reads /var/lib/dbus/machine-id before
# /etc/machine-id, so symlink them and truncate so entry.sh's runtime UUID
# (or an operator's bind-mounted /etc/machine-id) is what gets read.
RUN ln -sf /etc/machine-id /var/lib/dbus/machine-id && \
    truncate -s 0 /etc/machine-id
ENV PATH="/usr/lib/postgresql/17/bin:$PATH"
COPY docker/local.postgres.yaml /usr/src/omsupply/server/configuration/local.yaml
COPY --chmod=755 docker/entry-postgres.sh /usr/src/omsupply/server/entry-postgres.sh
RUN chown -R postgres:postgres /var/lib/postgresql
ENTRYPOINT ["/usr/src/omsupply/server/entry-postgres.sh"]

FROM sqlite AS dev
WORKDIR /usr/src/omsupply
COPY client/.nvmrc .nvmrc

RUN apt-get update && apt-get install -y curl rsync git && \
    NODE_MAJOR=$(sed 's/^v//' .nvmrc | cut -d. -f1) && \
    curl -fsSL https://deb.nodesource.com/setup_${NODE_MAJOR}.x | bash - && \
    apt-get install -y nodejs && \
    corepack enable && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

COPY package.json yarn.lock .yarnrc.yml ./
COPY client client
COPY standard_reports standard_reports
COPY standard_forms standard_forms

RUN yarn install --immutable && yarn cache clean

RUN echo 'export NODE_OPTIONS="--max-old-space-size=8192"' >> ~/.bashrc

WORKDIR /usr/src/omsupply/server
EXPOSE 3003

FROM postgres AS postgres-dev
WORKDIR /usr/src/omsupply
COPY client/.nvmrc .nvmrc
COPY client client

RUN apt-get update && apt-get install -y curl rsync git && \
    NODE_MAJOR=$(sed 's/^v//' .nvmrc | cut -d. -f1) && \
    curl -fsSL https://deb.nodesource.com/setup_${NODE_MAJOR}.x | bash - && \
    apt-get install -y nodejs && \
    npm install -g yarn && \
    apt-get clean && rm -rf /var/lib/apt/lists/*
COPY package.json .

WORKDIR /usr/src/omsupply/client
RUN yarn && yarn cache clean

RUN echo 'export NODE_OPTIONS="--max-old-space-size=8192"' >> ~/.bashrc

WORKDIR /usr/src/omsupply/server
EXPOSE 3003

# Default target (SQLite, no --target needed)
FROM sqlite