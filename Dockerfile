# Build stage for libfaketime
FROM rust:1.94-slim as faketime-builder
RUN apt-get update && apt-get install -y git make gcc libc6-dev
WORKDIR /usr/src/
RUN git clone https://github.com/wolfcw/libfaketime.git
WORKDIR /usr/src/libfaketime/src
RUN make install

# Common runtime stage (no binaries yet)
FROM rust:1.94-slim as base
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
# CI stages the pinned, checksum-verified dist into ./frontend-dist in the build
# context (build/fetch-frontend.js, run host-side in the workflow — no network
# fetch inside docker build).
COPY frontend-dist frontend
# Old UI served at /old-ui/ : this repo's client build (PUBLIC_PATH=/old-ui/).
# The server serves frontend/old-ui at /old-ui/ by convention — no config needed.
COPY client/packages/host/dist frontend/old-ui

WORKDIR /usr/src/omsupply/server/configuration
COPY server/configuration/base.yaml .
COPY docker/local.yaml .

RUN mkdir -p /database

WORKDIR /usr/src/omsupply/server

ENTRYPOINT ["/usr/src/omsupply/server/entry.sh"]
EXPOSE 8000

# SQLite target (default)
FROM base as sqlite
COPY --chmod=755 server/target/release/remote_server .
COPY --chmod=755 server/target/release/remote_server_cli .

# Postgres target
FROM base as postgres
COPY --chmod=755 server/target-postgres/release/remote_server .
COPY --chmod=755 server/target-postgres/release/remote_server_cli .
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

FROM sqlite as dev
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

FROM postgres as postgres-dev
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