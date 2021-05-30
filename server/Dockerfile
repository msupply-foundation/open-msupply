
# Note: planner and caching stages removed to workaround Digital OCean `BuildJobOutOfMemory` errors.

# Planner stage
# FROM lukemathwalker/cargo-chef as planner
# FROM rust:1.50 AS builder
# WORKDIR app
# COPY . .

# RUN cargo chef prepare --recipe-path recipe.json

# Caching stage
# FROM lukemathwalker/cargo-chef as cacher
# WORKDIR app
# COPY --from=planner /app/recipe.json recipe.json
# RUN cargo chef cook --release --recipe-path recipe.json

# Builder stage
FROM rust:1.50 AS builder
WORKDIR app
COPY . .
ENV SQLX_OFFLINE true
RUN cargo build --release --bin omsupply_server

# Runtime stage
FROM debian:buster-slim AS runtime
WORKDIR app
RUN apt-get update -y \
    && apt-get install -y --no-install-recommends openssl \
    && apt-get autoremove -y \
    && apt-get clean -y \
    && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/target/release/omsupply_server omsupply_server
COPY configuration configuration
ENV APP_ENVIRONMENT production

ENTRYPOINT ["./omsupply_server"]`