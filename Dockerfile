# Build stage for libfaketime
FROM rust:1.88-slim as faketime-builder
RUN apt-get update && apt-get install -y git make gcc libc6-dev
WORKDIR /usr/src/
RUN git clone https://github.com/wolfcw/libfaketime.git
WORKDIR /usr/src/libfaketime/src
RUN make install

# Runtime stage
FROM rust:1.88-slim as base
# Copy only the compiled libfaketime from builder
COPY --from=faketime-builder /usr/local/lib/faketime/libfaketime.so.1 /usr/local/lib/faketime/
RUN echo "/usr/local/lib/faketime/libfaketime.so.1" > /etc/ld.so.preload

# Rest of your runtime setup...
WORKDIR /usr/src/omsupply/server
COPY --chmod=755 server/target/release/remote_server .
COPY --chmod=755 server/target/release/remote_server_cli .
COPY --chmod=755 docker/entry.sh .
COPY server/data data

WORKDIR /usr/src/omsupply/server/configuration
COPY server/configuration/base.yaml .
COPY docker/local.yaml .

RUN echo "test-uuid" > /etc/machine-id
RUN mkdir -p /database

WORKDIR /usr/src/omsupply/server

ENTRYPOINT ["/usr/src/omsupply/server/entry.sh"]
EXPOSE 8000

FROM base

FROM base as dev
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