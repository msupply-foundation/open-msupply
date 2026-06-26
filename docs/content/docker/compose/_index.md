+++
title = "Central + Remote with Docker Compose"
weight = 10
sort_by = "weight"
template = "docs/section.html"

[extra]
source = "docs"
+++

# Central + Remote with Docker Compose

[`docker/scripts/docker-compose.yml`](https://github.com/msupply-foundation/open-msupply/blob/develop/docker/scripts/docker-compose.yml)
runs an Open mSupply **central** server and a **remote** (site) server side by side on your
machine. It replaces the old `run-*.sh` / `restore-*.sh` shell scripts.

- **central** — a central server whose data lives in a **PostgreSQL running on your host**.
  It uses the `-postgres` image (the server binary that can talk to Postgres) but does *not*
  start the image's embedded Postgres; instead it connects to the host's Postgres. Listens on
  host port **8003**.
- **remote** — an ordinary site that syncs to a central server. Embedded **SQLite**, stored in
  a folder on your host so it survives container recreations. Listens on host port **8008**.

## Configuration lives in `server/configuration`

The two configs are shared between Docker and local development (`cargo run`), so there is a
single source of truth:

- [`server/configuration/central.yaml`](https://github.com/msupply-foundation/open-msupply/blob/develop/server/configuration/central.yaml)
- [`server/configuration/remote.yaml`](https://github.com/msupply-foundation/open-msupply/blob/develop/server/configuration/remote.yaml)

These sit next to `base.yaml` and `example.yaml`, and are committed to the repo (the usual
`configuration/*.yaml` gitignore rule has explicit exceptions for them). Compose bind-mounts
each file over `configuration/local.yaml` inside the container, which the server auto-loads on
top of `base.yaml`. Anything in `base.yaml` is the default; `central.yaml` / `remote.yaml`
override it; environment variables (`APP_*`) override everything.

<div class="alert alert-info">
<strong>Reused by dev too.</strong> Because they are normal config files, you can run the same
setup without Docker. The server only auto-loads <code>local.yaml</code> or
<code>production.yaml</code> (chosen by <code>APP_ENVIRONMENT</code>, which recognises only
<code>local</code> — the default — and <code>production</code>), so to load these files by name
pass the <code>--config-path</code> flag. It loads the file you point at, layered on the
<code>base.yaml</code> in the same directory:
<pre><code>cd server
cargo run -- --config-path configuration/central.yaml
cargo run -- --config-path configuration/remote.yaml</code></pre>
Docker takes the simpler route of bind-mounting the file as <code>local.yaml</code>, which is
what loads by default — so no flag is needed there.
</div>

## Prerequisites

1. **Docker Compose v2** (`docker compose`, not the old `docker-compose`).
2. **Host networking enabled.** Both services use `network_mode: host` so that `localhost`
   inside the container is your host's `localhost` — that is how `central` reaches the host's
   Postgres, and how you reach the servers on `localhost:8003` / `localhost:8008`.
   - On **Docker Desktop** (macOS/Windows) turn this on in
     **Settings → Resources → Network → "Enable host networking"**, then restart Docker.
   - On **Linux** host networking works out of the box.
3. **PostgreSQL running on the host** for the central server, reachable on `localhost:5432`
   with the credentials in `central.yaml` (default `postgres` / `password`) and a database
   named `omsupply-central`. Create it once with:
   ```bash
   createdb -h localhost -U postgres omsupply-central
   ```
4. **A `machine-id` file** in `docker/scripts/` (the hardware id that ties a site to this host —
   see [the hardware id section of the Docker docs](../#hardware-id)). Create it once:
   ```bash
   cd docker/scripts
   # macOS:
   uuidgen | tr '[:upper:]' '[:lower:]' > machine-id
   # Linux:
   cat /proc/sys/kernel/random/uuid > machine-id
   ```
   <div class="alert alert-warning">
   This must be a <strong>file</strong> before the first <code>docker compose up</code> — if it
   is missing, Docker silently creates a <em>directory</em> at that path and the container
   misbehaves. Always <code>touch</code>/write it first.
   </div>

## Running

All commands are run from `docker/scripts/`:

```bash
cd docker/scripts

docker compose up central     # start just the central server (port 8003)
docker compose up remote      # start just the remote server  (port 8008)
docker compose up             # start both
docker compose up -d          # start both in the background
docker compose logs -f        # follow logs
docker compose down           # stop and remove the containers
```

The central server is then on <http://localhost:8003> and the remote on
<http://localhost:8008>.

### Pairing the remote to the central

`remote.yaml` ships with its `sync:` block commented out, so the remote starts un-initialised
— pair it through the UI, or uncomment and fill in the `sync:` block (point `url` at
`http://localhost:8003`, the central's host port) to auto-pair on first run.

## Choosing the image version

Every service derives its image from one version tag, defaulting to the tag pinned in the
compose file. Override it without editing the file:

```bash
VERSION=v3.00.00-RC-05261934 docker compose up
```

`central` pulls `…:<VERSION>-postgres-amd64` and `remote` pulls `…:<VERSION>-sqlite-amd64`.

## Data and where it lives

| What                | central                               | remote                                   |
| ------------------- | ------------------------------------- | ---------------------------------------- |
| Database            | Host PostgreSQL (`omsupply-central`)  | SQLite in `docker/scripts/remote/database` |
| Backups             | `docker/scripts/central/backup`       | `docker/scripts/remote/backup`           |
| Listen port (host)  | 8003                                  | 8008                                     |

Docker creates the `central/backup`, `remote/backup`, and `remote/database` folders on first
run; they are not committed. Because `central` uses the host's Postgres, there is no
`central/database` folder — its data lives wherever your host Postgres stores it.

## Backups and restore

Backups are written into the mounted `backup` folder by the CLI's `backup` command (see the
[server CLI docs](../../server/cli/)). The compose file defines two one-shot **restore** jobs.
They live behind the `tools` profile so a bare `docker compose up` never starts them.

Restore the central database from a backup named `central_backup` in `central/backup`:

```bash
docker compose run --rm central-restore
```

Restore the remote database from a backup named `remote_backup` in `remote/backup`:

```bash
docker compose run --rm remote-restore
```

<div class="alert alert-warning">
Restore <strong>wipes the target database</strong> before importing. Make sure the central
server / remote server is stopped first (<code>docker compose stop central</code>), and that the
host Postgres is running for a central restore.
</div>

To restore from a differently-named backup, override the command:

```bash
docker compose run --rm central-restore restore -b my_other_backup
```

## Overriding settings ad hoc

Any value can be overridden with an `APP_`-prefixed environment variable (`__` separates nested
keys). For a one-off, pass it through compose:

```bash
# Point central at a different host Postgres port for one run:
docker compose run --rm -e APP_DATABASE__PORT=5433 central
```

For permanent changes, edit `server/configuration/central.yaml` /
`server/configuration/remote.yaml` — the change then applies to both Docker and `cargo run`.

## Running CLI commands

The images also expose `remote_server_cli`. Pass CLI arguments as the command to run the CLI
instead of the server, e.g. to list the available commands:

```bash
docker compose run --rm central --help
docker compose run --rm remote --help
```

(`central` is the `-postgres` build, so its CLI runs Postgres-aware commands; `remote` is the
SQLite build.)

## Troubleshooting

- **`central` can't reach Postgres / connection refused** — host networking is probably not
  enabled (Docker Desktop), or the host Postgres isn't listening on `localhost:5432`, or the
  `omsupply-central` database / credentials don't match `central.yaml`.
- **Port 8003/8008 already in use** — another process (or a previous `docker compose up`) holds
  it. Under host networking the listen port comes from `APP_SERVER__PORT` in the compose file,
  not a `ports:` mapping — change it there if you need different ports.
- **Container exits immediately complaining about `/etc/machine-id`** — you didn't create the
  `machine-id` file first (see Prerequisites) and Docker made a directory instead.
