<!---
This is uploaded to dockerhub manually
-->

# What is Open mSupply?

Open mSupply is an open source logistic management system for medicine distribution.

[Documentation](https://docs.msupply.foundation/)

[The mSupply Foundation](https://msupply.foundation/home/)

[Github](https://github.com/msupply-foundation/open-msupply)

# Image flavours

Image comes with two flavours base, and dev (with -dev suffix). Dev image comes with client folder ready for development, with dependencies pre-installed

# How to use this image

Basic usage

```bash
docker run -p 9000:8000 msupplyfoundation/omsupply:v2.7.3
```

`note:` if you are using m-chip mac you need to add `--platform linux/amd64` (this just needs to be run the first time you run/pull image), or use `-arm64` tags if that build is available

Remember the first argument of `-p` is the local port on which you would like to run open mSupply.

## Initialise, Load reference data or from sqlite datafile

You will need to initialise database at this point, either by syncing to mSupply server (when connecting to local server you probably need to use `host.docker.internal` rather than localhost).

This docker image comes with reference data that can be loaded via (with credentials Admin/pass)

```bash
docker run -e LOAD_REFERENCE_FILE=reference1 -p 9000:8000 msupplyfoundation/omsupply:v2.7.3
```

If you have sqlite database, you can mount it to `/database`, database name has to be omsupply-database (although can be overwritten see other features). i.e. if you have omsupply-database.sqlite file in `mydatabase` folder:

```bash
docker run -v "$(pwd)/mydatabase":/database -p 9000:8000 msupplyfoundation/omsupply:v2.7.3
```

Try combination of load reference file and above command mounted to an empty folder, and then open sqlite databse with sqlite browser.

## Running CLI

Docker image also allows you to run cli commands via arguments, for example to export graphql schema

```bash
docker run --rm -v "$(pwd)/putschemahere":/schemafolder msupplyfoundation/omsupply:v2.7.3 export-graphql-schema -p /schemafolder/schema.graphql
```

Try `--help` instead of export-graphql-schema to see more

## Date imitation

For tests or stable demos it's good to be able to refresh dates or imitate a particular date.

With refresh dates env variable, will look at the latest date in the database and use it as reference to push all dates forward

```bash
docker run -e LOAD_REFERENCE_FILE=reference1 -e SHOULD_REFRESH_DATES=true -p 9000:8000 msupplyfoundation/omsupply:v2.7.3
```

Or with FAKETIME, which will set server time at particular date, this does not work for dates that are created in front end, like default filters for cold chain or home page dashboard

```bash
docker run -e LOAD_REFERENCE_FILE=reference1 -e FAKETIME="@2023-05-20 11:30:00" -p 9000:8000 msupplyfoundation/omsupply:v2.7.3
```

## Production

If used in production, it's important to persist the database **and** to give each instance a stable, unique hardware id. The hardware id is what the central server uses to recognise a site — without it, a copied database could accidentally sync to the central API as if it were the original site.

Both flavours use the same mount point for persistent state — `/database`:

- SQLite: the `omsupply-database.sqlite` file lives in `/database`.
- Postgres: the postgres data directory lives in `/database/postgres/data`.

Either way, mount your host directory before initialising the omSupply instance:

```bash
docker run -v "$(pwd)/mydatabase":/database -p 9000:8000 msupplyfoundation/omsupply:v2.17.0
```

For the postgres flavour, you can additionally seed the deployment from a dump on first run with a separate `/import.dump` mount. Remove that mount on subsequent runs to avoid re-importing every restart:

```bash
# First run — empty /database, seed from dump
docker run -v "$(pwd)/mydatabase":/database \
  -v "$(pwd)/seed.dump":/import.dump \
  -p 9000:8000 msupplyfoundation/omsupply:v2.17.0-postgres

# Subsequent runs — drop the /import.dump mount
docker run -v "$(pwd)/mydatabase":/database \
  -p 9000:8000 msupplyfoundation/omsupply:v2.17.0-postgres
```

### Hardware id — default behaviour

If `/etc/machine-id` is not mounted, the container generates a fresh UUID on every start. This means each new container instance has a unique hardware id, and a logical dump restored into a fresh container will automatically get a different id — the central API will detect the mismatch and reject an unauthorised sync.

This is fine for ephemeral or short-lived deployments. For production use where the container may be recreated (e.g. after an upgrade), you should mount a stable id file so the site identity is preserved across restarts.

### Hardware id — stable id across container restarts

Create a file to hold the id and mount it to `/etc/machine-id`. The container will use it as-is and never overwrite it.

```bash
# Generate a stable id (once, before first run)
# Linux:
cat /proc/sys/kernel/random/uuid > machine-id
# macOS:
uuidgen | tr '[:upper:]' '[:lower:]' > machine-id

docker run -v "$(pwd)/mydatabase":/database \
  -v "$(pwd)/machine-id":/etc/machine-id:ro \
  -p 9000:8000 msupplyfoundation/omsupply:v2.17.0
```

Keep this file separate from the database volume so that a database dump-and-restore to a new deployment does **not** carry the id with it — the new deployment will generate a fresh UUID and the central API will detect the mismatch.

On Linux you can bind-mount the host's own `/etc/machine-id` to tie the deployment to that machine:

```bash
docker run -v "$(pwd)/mydatabase":/database \
  -v /etc/machine-id:/etc/machine-id:ro \
  -p 9000:8000 msupplyfoundation/omsupply:v2.17.0
```

Note: only do this if you have one deployment per host, otherwise multiple containers on the same host will share a hardware id.

On macOS, `/etc/machine-id` doesn't exist; synthesise one from the IOPlatformUUID:

```bash
ioreg -rd1 -c IOPlatformExpertDevice | awk '/IOPlatformUUID/ { print $3 }' | tr -d '"' > machine-id
docker run -v "$(pwd)/mydatabase":/database \
  -v "$(pwd)/machine-id":/etc/machine-id:ro \
  -p 9000:8000 msupplyfoundation/omsupply:v2.17.0
```

## Dev

You can work on front end using the 'dev' flavour of omSupply image, it comes with all dependencies pre-installed (make sure clientdev folder is empty).

First, we need to copy front end dev files, this may take a few minutes

```bash
docker run --rm -v "$(pwd)/clientdev":/usr/src/omsupply/clientcopy -ti --entrypoint="/bin/bash" -w /usr/src/omsupply/ msupplyfoundation/omsupply:v2.7.3-dev -c "rsync -av --exclude='/node_modules' client/ clientdev/"
```

When overriding entrypoint like this, you can leave out arguments after image name, which will allow you bash into the image

Then we can start front end (`-v /usr/src/omsupply/client/node_modules` keeps node_modules folder from volume)

```bash
docker run -p 9003:3003 -v "$(pwd)/clientdev":/usr/src/omsupply/client -v /usr/src/omsupply/client/node_modules -ti --entrypoint="/bin/bash" -w /usr/src/omsupply/client msupplyfoundation/omsupply:v2.7.3-dev -c "yarn start --env API_HOST='http://localhost:9000'"
```

And start server

```bash
docker run -p 9000:8000 msupplyfoundation/omsupply:v2.7.3
```

Now you can open your favorite editor in clientdev/client folder make changes, they should be reflect in web app (hot reload may not work reliably in this dev setup, so you might need to refresh the page)

# Other features

All configurations from [configuration file](https://github.com/msupply-foundation/open-msupply/blob/main/server/configuration/example.yaml) can be overwritten via env variable, for example to change database name or location:

```bash
docker run -e APP_DATABASE__DATABASE_NAME="/database/database-name" -p 9000:8000 msupplyfoundation/omsupply:v2.7.3
```
