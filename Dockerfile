
FROM rust:latest

WORKDIR /usr/src/omsupply

COPY server/target/release/remote_server /usr/src/omsupply/remote_server
COPY server/configuration/base.yaml /usr/src/omsupply/configuration/base.yaml
COPY docker/local.yaml /usr/src/omsupply/configuration/local.yaml
RUN echo "test-uuid" > /etc/machine-id

RUN chmod +x /usr/src/omsupply/remote_server

# Config to not be https

ENTRYPOINT /usr/src/omsupply/remote_server

EXPOSE 8000



