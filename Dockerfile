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

WORKDIR /usr/src/omsupply/server
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
ENV PATH="/usr/lib/postgresql/17/bin:$PATH"
COPY docker/local.postgres.yaml /usr/src/omsupply/server/configuration/local.yaml
COPY --chmod=755 docker/entry-postgres.sh /usr/src/omsupply/server/entry-postgres.sh
RUN mkdir -p /var/lib/postgresql/data && chown -R postgres:postgres /var/lib/postgresql
ENTRYPOINT ["/usr/src/omsupply/server/entry-postgres.sh"]

FROM sqlite as dev
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