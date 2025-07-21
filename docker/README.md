# Open omSupply Docker

Dockerise github action is made to fire when a new tag is created, this tag needs to start with `v`, this action uses Dockerfile in root dir.

Dockerfile has two pre-requisites:

`remote_server` and `remote_server_cli` built in release mode, they should be built inside the rust:slim docker image (after building client): 

```bash
docker run --rm --user "$(id -u)":"$(id -g)" -v "$PWD":/usr/src/omsupply -w /usr/src/omsupply/server rust:slim cargo build --release --bin remote_server --bin remote_server_cli
```

[docker-hub.md](./docker-hub.md) explains the feature set of the docker image.

`async-dataloader.patch` is required because of 'blocking' [requests issue](https://github.com/async-graphql/async-graphql/issues/1716) in async graphql loaders.

`entry.sh` calls cli before starting server or allows use of cli as an argument.

Docker hub credentials need to be setup as secrets for `DOCKER_USERNAME' and `DOCKER_TOKEN` (from docker hub)

## Build steps (as per dockerise.yaml github action workflow)

* Build client
* Build server in rust:slim image container (uses built client)
* Build client in rust:slim image container with yarn pre installed 
* Build docker image
   * copy binaries
   * set hardware id
   * copy entrypoint
   * in dev target add dependencies for yarn
   * copy client and run yarn isntall
* Tag docker images and push to dockerhub

## Building image locally

This is needed when building apple m chip version on your m chip mac.

```bash
# Build client
cd client && yarn && yarn build
# Build server 
cd ../ && docker run --rm --user "$(id -u)":"$(id -g)" -v "$PWD":/usr/src/omsupply -w /usr/src/omsupply/server rust:slim cargo build --release --bin remote_server --bin remote_server_cli
# Dockerise with tag
docker build . -t msupplyfoundation/omsupply:v2.7.3-arm64 --target base && \
docker build . -t msupplyfoundation/omsupply:v2.7.3-arm64-dev --target dev
# "docker hub" in bitwarden
docker login
docker push msupplyfoundation/omsupply:v2.7.3-arm64 && \
docker push msupplyfoundation/omsupply:v2.7.3-arm64-dev
```