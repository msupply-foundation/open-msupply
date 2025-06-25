# Open omSupply Docker

Dockerise github action is made to fire when a new tag is created, this tag needs to start with `v`, this action uses Dockerfile in root dir.

Dockerfile has two pre-requisites:

`remote_server` and `remote_server` built in release mode, they should be built inside the rust:slim docker images: 

```bash
docker run --rm --user "$(id -u)":"$(id -g)" -v "$PWD":/usr/src/omsupply -w /usr/src/omsupply/server rust:slim cargo build --release --bin remote_server --bin remote_server_cli
```

And if building `--target dev`, a client.tar.gz with all dev dependencies already installed (with yarn) in the root folder.

[docker-hub.md](./docker-hub.md) explains the feature set of the docker image.

`async-dataloader.patch` is required because of 'blocking' [requests issue](https://github.com/async-graphql/async-graphql/issues/1716) in async graphql loaders.

`entry.sh` calls cli before starting server or allows use of cli as an argument.

Docker hub credentials need to be setup as secrets for `DOCKER_USERNAME' and `DOCKER_TOKEN` (from docker hub)

## Build steps

* Build client
* Build server in rust:slim image container (uses build client)
* Build client in rust:slim image container with yarn pre installed 
* Build docker
   * copy binaries
   * set hardware id
   * copy client
   * copy entrypoint
   * in dev target add dependencies for yarn
* Tag docker images and push to dockerhub

## Building image locally

This is needed when building build apple m chip version on y

```bash
# Build client
cd client && yarn && yarn build
# Build server 
cd ../ && docker run --rm --user "$(id -u)":"$(id -g)" -v "$PWD":/usr/src/omsupply -w /usr/src/omsupply/server rust:slim cargo build --release --bin remote_server --bin remote_server_cli
# Build dev-client inside rust:slim container with yarn pre installed
find . -name "node_modules" -type d -prune -exec rm -rf '{}' + && \
docker build docker/dev-client/. -t dev-client-build && \
docker run --rm -v "$PWD":/usr/src/omsupply -w /usr/src/omsupply/client dev-client-build yarn install

# Dockerise with tag
docker build . -t msupplyfoundation/omsupply:v2.7.3-arm64 --target base && \
docker build . -t msupplyfoundation/omsupply:v2.7.3-arm64-dev --target dev
# "docker hub" in bitwarden
docker login
docker push msupplyfoundation/omsupply:v2.7.3-arm64 && \
docker push msupplyfoundation/omsupply:v2.7.3-arm64-dev

# Cleanup
find . -name "node_modules" -type d -prune -exec rm -rf '{}' +
```