+++
title = "Self-hosted Linux runner setup"
weight = 20
sort_by = "weight"
template = "docs/section.html"

[extra]
source = "docs"
+++

# Self-hosted Linux runner setup

Runbook for a box that runs the containerised CI jobs. Several runner
*instances* live on one machine — each takes one job at a time, so instances
are the unit of parallelism ("lanes").

## What the host actually needs

Remarkably little, and that is the point: **no Rust, no Node, no Postgres, no
build libraries**. All of that lives inside the image build
([`Dockerfile`](https://github.com/msupply-foundation/open-msupply-internal/blob/develop/Dockerfile)), so the host never accumulates toolchain state
and never drifts.

| | why |
|---|---|
| `docker` | starts the job containers |
| `docker-buildx` | the image build runs `docker buildx build`, for the Dockerfile's cache mounts and `$BUILDPLATFORM` pinning; plain `docker build` will not do |
| `docker-compose-v2` | the deploy job brings the develop environment up with `docker compose`; the `docker.io` package does not include the Compose plugin, and without it `docker compose -f ...` fails as `unknown shorthand flag: 'f'` |
| `qemu-user-static`, `binfmt-support` | cross-arch image builds — see below |
| `git` | host-side jobs (the CI image build) run `actions/checkout` directly |
| `curl`, `tar`, `jq` | fetching and configuring the runner |
| the runner agent | one copy per lane |

```bash
sudo apt-get update
sudo apt-get install -y docker.io docker-buildx docker-compose-v2 \
  qemu-user-static binfmt-support git curl tar jq
sudo systemctl enable --now docker
```

The distro `docker.io` package is enough. Nothing these jobs do is
version-sensitive — starting containers, bind mounts, `--user`, `docker build`
and `docker push` are all long-stable — and it gets security updates through
normal `apt` with no third-party repo, GPG key, or `curl | sudo sh` on a machine
that holds registry credentials.

### Cross-arch builds need binfmt on the host

Release tags build `linux/arm64` as well as `linux/amd64`. The Dockerfile's
compile stages are pinned to `$BUILDPLATFORM` and cross-compile, so `rustc`,
`yarn` and `vite` always run natively — that is where the emulation saving is.
But the *runtime* stages take the target platform, so their `RUN` steps are
genuinely emulated: `apt-get` in `base`, the `postgresql-17` install in
`postgres`, and libfaketime's `make`. Without binfmt_misc registered these fail
at the first foreign-arch `RUN` with `exec format error`.

This is host state, not workflow state. On GitHub-hosted runners
`docker/setup-qemu-action` did it per job because every job got a fresh VM; on
this box it is registered once. Use the distro packages rather than
`docker run --privileged tonistiigi/binfmt --install`: the packages ship systemd
units so the registration survives a reboot, whereas the container form does
not, and nothing here would re-run it — least of all under
[JIT runners](#scaling-lanes-without-re-registering-jit-runners), which hold no
setup step of their own.

Only release tags are affected in practice: every deployment build and every
non-release tag are amd64-only, so a box without binfmt passes everything you
are likely to test with, then fails the `arm64` legs of the first real release.

Check what you got, and only reach for Docker's own repo if something actually
requires newer:

```bash
docker --version && docker buildx version
docker run --rm --platform linux/arm64 debian:trixie-slim uname -m   # -> aarch64
```

## Sizing

Roughly **4 cores and 4–8 GB RAM per lane**. RAM is what gets under-bought:
rustc peaks hard while linking, and several lanes peaking together is what
triggers the OOM killer.

Disk: NVMe. Budget generously — `/var/lib/docker`, the sccache store, and one
target dir *per lane* all grow. 500 GB is not excessive.

```bash
nproc; free -h; df -h /
```

Record those — the benchmark workflow prints the same values in its summary so
runs can be compared across machines.

## User and directories

The runners run as the box's existing login — `ubuntu` on a stock cloud image,
whatever you ssh in as otherwise. No dedicated `runner` account: on a machine
that does nothing but CI it buys no isolation worth the extra moving part, and
every path below then has to be written for a user you are not currently logged
in as (`sudo -iu`, absolute `/home/runner/...`), which is exactly where these
runbooks rot.

Everything is written in terms of `$USER` and `$HOME`, so it is copy-pasteable
as-is:

```bash
sudo usermod -aG docker "$USER"   # root-equivalent; fine on a dedicated CI box
newgrp docker                     # or log out and back in — group membership is
                                  # read at login, so `docker ps` fails until then

# Caches live OUTSIDE the runner workspaces, deliberately: they then survive
# workspace wipes, ephemeral runners, and lane count changes.
sudo mkdir -p /cache/sccache /cache/target
sudo chown -R "$USER:$(id -gn)" /cache
```

`/cache/sccache` is for the containerised check and test jobs, which move onto
these runners in a later change — nothing writes to it yet. It is shared across
all lanes, which is safe because sccache is content-addressed. `/cache/target` is subdivided **per runner name** by the
workflow: cargo takes an exclusive lock on a target dir, so lanes sharing one
would serialise on the lock and thrash each other's fingerprints.

## Install the runner, once per lane

> Registering each lane by hand, as this section describes, is the simpler thing
> to read but the more annoying thing to live with — every lane added or removed
> means minting a token and running `config.sh`. If you are setting this up
> fresh, skip to [JIT runners](#scaling-lanes-without-re-registering-jit-runners)
> and never register anything. This section is kept because it is the fallback
> when the box cannot hold a privileged token.


```bash
V=$(curl -s https://api.github.com/repos/actions/runner/releases/latest | jq -r .tag_name | sed 's/^v//')
case "$(uname -m)" in
  x86_64)  A=x64 ;;
  aarch64) A=arm64 ;;
esac
curl -fsSL -o /tmp/runner.tar.gz \
  "https://github.com/actions/runner/releases/download/v${V}/actions-runner-linux-${A}-${V}.tar.gz"

for i in 1 2 3 4; do
  mkdir -p ~/actions-runner-$i && tar xzf /tmp/runner.tar.gz -C ~/actions-runner-$i
done
```

Register each with its own name and labels. The registration token expires after
an hour, so mint one per instance:

```bash
OWNER_REPO=msupply-foundation/open-msupply-internal
for i in 1 2 3 4; do
  TOKEN=$(gh api -X POST repos/$OWNER_REPO/actions/runners/registration-token -q .token)
  ~/actions-runner-$i/config.sh --unattended --replace \
    --url https://github.com/$OWNER_REPO \
    --token "$TOKEN" \
    --name "linux-$i" \
    --labels self-hosted,Linux,"$(uname -m)",build
done
```

### Lane roles

Two roles, and a lane carries exactly one:

| label | what runs there |
|---|---|
| `build` | the image build and its planning job — CPU-bound, ~19 minutes cold |
| `deploy` | `docker compose up` for one deployment — about a minute |

They are separate because the deploy job must land on the machine hosting the
deployments, and that is a different box. Nothing in the deploy job assumes a
locally built image: it logs in and pulls by tag, so the two roles never need to
share a machine.

### The deploy box hosts more than one thing

A `deploy` lane runs every deployment: the named ones from
`docker-named-deployment.yaml` (`develop`, a server per active release-candidate
branch, and any ad-hoc one someone has asked for) and every per-PR preview from
`docker-pr-preview.yaml`. How to *use* them is on the [Docker
page](../../docker/); this section is what they cost the box and how it is
configured.

Each is a compose project of its own — container and volumes — so they cost
real resources:

- **RAM**: each deployment is one container running the server *and* its own
  bundled postgres. Budget as you would for a small server per deployment, not
  per lane.
- **Disk**: one database per deployment, plus one image at a time. Images are tagged per commit, so a redeploy adds one rather than replacing one — the deploy removes that deployment's *superseded* tags once the new one is up and routable, so a deployment costs one image however often it redeploys. The teardown takes the last one with the rest of the stack, and `docker-expire.yaml` sweeps anything past its expiry. What still grows is the count: a box with many labelled PRs and no-expiry deployments holds a database and an image for each.

Every deployment is reached at `https://<name>.<DEPLOY_DOMAIN>`, where `<name>`
is the deployment's name and *also* its container name. Nothing publishes a host
port.

Repository variables that configure this:

| variable | default | what it does |
|---|---|---|
| `DEPLOY_DOMAIN` | *none — required* | the base every deployment's hostname hangs off, e.g. `preview.example.com` |
| `DEPLOY_STATE_DIR` | `/opt/omsupply/deployments` | where each deployment's `machine-id` file is kept |
| `DEPLOY_REFERENCE_FILE` | `e2e` | which dataset a new deployment is seeded from |

There is deliberately no variable for the proxy's host port. It used to be `PROXY_PORT`, and it was a second copy of something the proxy already knows: a proxy brought up on port 80 against a variable still saying `8080` makes every route check fail with a refused connection, reported as an unroutable deployment. The route check now reads the published port from `docker port oms-proxy 80/tcp` instead, so the two cannot disagree. If the variable is still set on the repository it is inert and can be deleted.

`DEPLOY_STATE_DIR` has to exist and be writable by the runner user before the first deploy. The runner does not run as root, so it cannot create a directory under `/opt` itself, and the default lands there. Once per box:

```bash
sudo mkdir -p /opt/omsupply/deployments
sudo chown "$(id -un)":"$(id -gn)" /opt/omsupply/deployments   # as the runner user
```

Or point `DEPLOY_STATE_DIR` at somewhere the runner already owns. Not inside the runner's `_work` tree, which is cleaned between jobs.

**Do not wipe `DEPLOY_STATE_DIR`.** It holds one `machine-id` file per
deployment, bind-mounted read only at `/etc/machine-id`. `machine_uid::get()`
reads that file, and `entry.sh` generates a fresh UUID whenever it is empty —
which is every new container — so without a stable file a redeploy changes the
site's hardware id and v7 pairing rejects it. Nothing about that is visible
until someone tries to pair. It is *per deployment* rather than the host's own
`/etc/machine-id` because two deployments sharing one hardware id collide the
moment both pair to the same central server, and a central/remote pair is an
obvious thing to want. Removing it is the teardown's job, not a person's.

**`DEPLOY_REFERENCE_FILE` defaults to `e2e`, and `reference1` does not work** —
measured, not assumed. `reference1` is a 2023 V5/V6 export and
`SyncBufferRow.source_site_id` is a plain `i32` with no `#[serde(default)]`,
unlike `sync_version` and `app_version` beside it, so the export fails to
*deserialise* and never reaches integration:

```
Error: missing field `source_site_id` at line 11 column 3
```

`e2e` is a V7 export that the nightly e2e suite exercises, so it cannot rot
unnoticed. Fixing `reference1` is a one-line `#[serde(default)]` plus a
re-export, and is a server change rather than a CI one.

**Three labels carry a deployment's whole record**, so there is nothing to keep
in step with it and no settings page to configure per deployment:

| label | |
|---|---|
| `oms.branch` | the branch it follows, so a push to that branch updates it. Empty means pinned to a tag or a commit, and no push will touch it. |
| `oms.expires` | when `docker-expire.yaml` may reap it, or `never` |
| `oms.profile` | `release` or `debug`, so an auto-update rebuilds it the same way it was built before |

`docker-named-deployment.yaml` reads all three back off the containers, which is
why its planning job runs on this box rather than a GitHub-hosted runner. A push
carries no inputs, so the deployment itself is the only place those answers can
come from.

They are written by `docker/compose.deploy.yaml` **as of the ref being
deployed**, not by whatever is on the default branch — so a deployment following
a branch that predates a label will not carry it, and will keep taking the
default until that branch has the change.

**`docker-expire.yaml` sweeps expired deployments daily**, reading the
`oms.expires` label off each container. Its job summary lists everything
currently deployed and when each expires — the quickest answer to "what is
running on this box", since the Environments page shows what *was* deployed
rather than what is still up. Run it with `dry_run` to see what it would reap.

Teardown also deletes the deployment's GitHub environment, which needs
**Administration: write** — a scope `GITHUB_TOKEN` does not have. It uses the
same `tmf-ci-bot` App as the JIT runner config above rather than a PAT, so
nothing new needs provisioning; if the App lacks that permission the teardown
still succeeds and the empty environment simply lingers in settings.

### Setting up the deploy box's reverse proxy

**One-off, by hand, and deliberately not owned by CI.** The proxy fronts every
deployment on the box, so a bad config takes all of them down at once — and
`docker-deploy.yaml` checks out the *pull request's* ref, so a CI-owned proxy
would let one PR break every other deployment.

Its two files live in **`proxy/`, beside this page**, not in `docker/`:
everything in `docker/` is an input to a workflow, and these are steps in this
runbook. They are reference copies — the box's own are authoritative and nothing
overwrites them, so expect drift and check the box before assuming these
describe it.

| file, in `proxy/` beside this page | |
|---|---|
| `compose.proxy.yaml` | the Caddy container, its published ports, its CA volume and the shared network |
| `proxy.Caddyfile` | the one route, for every deployment |

1. **A wildcard DNS record** for `*.<DEPLOY_DOMAIN>`, pointing at whatever
   terminates TLS.
2. **One vhost on the edge proxy** for `*.<DEPLOY_DOMAIN>`, forwarding to this
   box on `PROXY_PORT` (default `80`). TLS stops there, so nothing on the deploy
   box does ACME and no DNS credentials live on it. Skip this if the deploy box
   is reached directly — the local HTTPS below then covers it.
3. **The shared network and the proxy.** Copy both files into a directory of
   their own — they must stay together, because the compose file mounts
   `./proxy.Caddyfile` relative to itself:

   ```bash
   docker network create oms-edge
   mkdir -p ~/docker-compose/proxy && cd ~/docker-compose/proxy   # + the two files
   echo "DEPLOY_DOMAIN=preview.example.com" > .env
   docker compose -f compose.proxy.yaml up -d
   ```

   It takes 80 and 443 by default, which is what you want on a box that only
   hosts deployments. Set `PROXY_PORT` and `PROXY_TLS_PORT` in the same `.env` if
   something already holds them — an edge proxy sharing this machine rather than
   sitting in front of it. CI does not need to be told either value.

`docker-deploy.yaml` creates `oms-edge` if it is missing, so a deployment never
fails for want of it — but it does **not** create the proxy. A deployment onto a
box without one comes up healthy and unroutable, which the deploy's own route
check reports.

**`DEPLOY_DOMAIN` is set twice and the two must match** — the repository
variable, which builds the URLs CI reports and checks, and the proxy's
environment here, which builds the vhost it answers for. The box cannot read
repository variables, hence the duplication. A mismatch means every deployment
comes up healthy and 404s; the route check is what catches it.

**Editing the live `proxy.Caddyfile` needs `--force-recreate`**, not a reload or
a restart — it is a single-*file* bind mount, and docker binds a file by inode,
so any editor that writes-then-renames leaves the container serving what it
mounted at start:

```bash
docker compose -f compose.proxy.yaml up -d --force-recreate
```

#### Local HTTPS

The proxy also serves every deployment over TLS on `PROXY_TLS_PORT` (default `443`), using a certificate Caddy issues from its own internal CA. Nothing external touches this: the edge proxy terminates real TLS and forwards to the HTTP port, so this exists for reaching a deployment directly from this network, and for the browser features that refuse to work outside a secure context.

The certificate is a wildcard for `*.<DEPLOY_DOMAIN>` signed by a CA that nothing trusts until you say so. Pull the root out and trust it on the machine you are browsing from:

```bash
docker cp oms-proxy:/data/caddy/pki/authorities/local/root.crt ./caddy-root.crt

# macOS
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain caddy-root.crt
# Debian/Ubuntu
sudo cp caddy-root.crt /usr/local/share/ca-certificates/caddy-root.crt && sudo update-ca-certificates
```

Firefox keeps its own trust store and will not pick that up; either add the root under Settings → Privacy & Security → Certificates, or set `security.enterprise_roots.enabled` to true.

The CA lives in the `caddy-data` volume specifically so it survives the `--force-recreate` above. A `docker compose down -v` destroys it, and every machine that trusted the old root then has to trust the new one — so use plain `down`.

#### How the routing works, and why it never needs touching

The first label of the hostname **is** the container name — `develop.<domain>` →
`develop`, `pr-470.<domain>` → `pr-470`, and so on for every deployment. That is
a pure function, so the proxy holds one static route for all of them with no
generated per-deployment config.

Caddy resolves the upstream at *dial* time through docker's embedded DNS, so a
deployment that came up ten seconds ago is routable and a torn-down one returns
a 502 — with no reload and nothing to keep in step. That is also why the proxy
is a **container** and not a process on the box: the embedded resolver at
`127.0.0.11` exists only inside containers on a user-defined network, so a
host-side proxy could not resolve `pr-470` at all.

Two things follow:

- **`oms-edge` is the access boundary.** Anything attached to it is reachable by
  its container name as a subdomain, so do not attach unrelated containers.
- **The `server` service alias is claimed by every deployment at once**, since
  they share one network. Nothing resolves it — the pinned `container_name` is
  the only handle anything uses — but do not add something that relies on it.

**If you are considering replacing Caddy**, the two obvious candidates were
weighed and rejected:

- **Traefik** is the reflexive choice for routing to containers that come and
  go, and it works — but it is the right tool when routes must be *discovered*,
  and here they are computable from the hostname. It charges a Docker socket
  mounted into the proxy (root-equivalent on this box), or a socket-proxy
  sidecar, plus per-container labels that would make the compose file know the
  public hostname rather than only its own name.
- **nginx** does the same job with `resolver 127.0.0.11` and a variable
  `proxy_pass`, but needs three things hand-tuned that are Caddy defaults, each
  a silent failure if missed: a `map` for `Connection: upgrade` (graphql
  subscriptions), `client_max_body_size 100m` (the server's own gate is 100MB,
  so nginx's 1MB default becomes the tighter and wrong one), and
  `proxy_buffering off` (`/support/database` streams a whole `pg_dump`).

**This runbook sets up a build box.** Every lane on it is a `build` lane, and
that is all the rest of this page configures.

**The deploy lane is a one-off, done by hand on the deploy box.** One lane is
usually enough — the job is a one-minute `docker compose up` — so the
lane-scaling machinery below is not worth carrying there. Unpack a runner as in
the next section, register it once with `deploy` in place of `build`, and give
it the same systemd unit:

```bash
--labels self-hosted,Linux,"$(uname -m)",deploy
```

**A second deploy lane is safe**, which it was not before. Deployments used to
be allocated a host port from whatever was free, so two lanes could pick the
same one and the second `compose up` would fail on the binding. Nothing
publishes a port now, so there is nothing to allocate and nothing to serialise.

That box needs `docker`, `docker-compose-v2` and `git` from the package list
above, and nothing else — no buildx, no binfmt, no `/cache`. It never compiles.
It does need its reverse proxy stood up once, as above.

The only rule either way: a lane somewhere must carry each label, or the
matching jobs queue for ever with no error.

## systemd template

One unit file drives every lane; `%i` is the instance number.

Written with a heredoc rather than pasted as a file, so `$USER` and `$HOME`
resolve to whoever you are. `%i` is not shell-special, so it passes through
untouched and stays systemd's instance number.

```bash
sudo tee /etc/systemd/system/actions-runner@.service >/dev/null <<EOF
[Unit]
Description=GitHub Actions runner %i
After=network-online.target docker.service
Wants=network-online.target
Requires=docker.service

[Service]
Type=simple
User=$USER
Group=$(id -gn)
WorkingDirectory=$HOME/actions-runner-%i
ExecStart=$HOME/actions-runner-%i/run.sh
Restart=always
RestartSec=5
# The agent needs to finish the job it is holding before exiting, or the run
# is marked failed rather than requeued.
KillMode=process
KillSignal=SIGTERM
TimeoutStopSec=5min

[Install]
WantedBy=multi-user.target
EOF
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now actions-runner@1 actions-runner@2 actions-runner@3 actions-runner@4
```

Adding a lane later is `systemctl enable --now actions-runner@5` once instance 5
is unpacked and registered. Removing one is `disable --now`.

```bash
systemctl status 'actions-runner@*'
journalctl -u actions-runner@1 -f
```

## Scaling lanes without re-registering: JIT runners

The setup above needs `config.sh` run per instance with a fresh registration
token, which makes adding or removing a lane a manual chore. **JIT (just-in-time)
runners remove that step entirely** but are more complex to set up.

The runner fetches a one-shot config at startup, takes exactly one job,
de-registers itself, and exits. systemd restarts it, which fetches a new config.
So:

| | |
|---|---|
| add a lane | unpack instance N, `systemctl enable --now actions-runner@N` |
| remove a lane | `systemctl disable --now actions-runner@N` |
| register | never |
| de-register | never |

It is also ephemeral by construction, which removes the whole class of
workspace-state bugs — and that is **cheap here specifically because the caches
live in `/cache`, not in `_work`**. The usual objection to ephemeral runners
("you lose your caches") does not apply. The real cost is that
`actions/checkout` does a full clone each job instead of an incremental fetch:
tens of seconds on this repo.

### Wrapper

```bash
# $HOME/actions-runner-run-jit.sh
#!/bin/bash
set -euo pipefail
i="$1"
: "${OWNER_REPO:?}" "${GH_TOKEN:?}"
d="$HOME/actions-runner-$i"
cd "$d"

# Ephemeral means the *registration* is one-shot; the work folder is still on
# disk from last time. Wipe it so each job genuinely starts clean.
rm -rf "$d/_work"

JIT=$(gh api -X POST "repos/$OWNER_REPO/actions/runners/generate-jitconfig" \
  -f name="linux-$i" \
  -F runner_group_id=1 \
  -f 'labels[]=self-hosted' \
  -f 'labels[]=Linux' \
  -f "labels[]=$(uname -m)" \
  -f 'labels[]=build' \
  -q .encoded_jit_config)

exec ./run.sh --jitconfig "$JIT"
```

```bash
chmod +x $HOME/actions-runner-run-jit.sh
```

### Unit

```bash
sudo tee /etc/systemd/system/actions-runner@.service >/dev/null <<EOF
[Unit]
Description=GitHub Actions runner %i
After=network-online.target docker.service
Wants=network-online.target
Requires=docker.service

[Service]
Type=simple
User=$USER
Group=$(id -gn)
Environment=OWNER_REPO=msupply-foundation/open-msupply-internal
EnvironmentFile=/etc/actions-runner.env
WorkingDirectory=$HOME/actions-runner-%i
ExecStart=$HOME/actions-runner-run-jit.sh %i
# Exits after every job by design, so this is the normal path, not recovery.
Restart=always
RestartSec=5
KillMode=process
KillSignal=SIGTERM
TimeoutStopSec=5min

[Install]
WantedBy=multi-user.target
EOF
```

`/etc/actions-runner.env` holds `GH_TOKEN=...` — root-owned, `chmod 600`, and
readable by the service. Minting JIT configs needs **Administration: read and
write** on the repo, so prefer a GitHub App installation token over a personal
PAT; this repo family already uses a `tmf-ci-bot` App for exactly this kind of
privileged CI work.

### Provisioning an instance

Only the unpack is per-instance now:

```bash
# $HOME/actions-runner-provision.sh N
set -euo pipefail
i="$1"
V=$(curl -s https://api.github.com/repos/actions/runner/releases/latest | jq -r .tag_name | sed 's/^v//')
case "$(uname -m)" in x86_64) A=x64 ;; aarch64) A=arm64 ;; esac
mkdir -p ~/actions-runner-"$i"
curl -fsSL "https://github.com/actions/runner/releases/download/v${V}/actions-runner-linux-${A}-${V}.tar.gz" \
  | tar xz -C ~/actions-runner-"$i"
```

```bash
~/actions-runner-provision.sh 5
sudo systemctl enable --now actions-runner@5
```

### Caveats

- One API call per job to mint the config. At a hundred jobs a day this is
  nowhere near any rate limit, but a restart loop on a broken instance will
  burn calls — watch `journalctl` if a lane flaps.
- A JIT runner appears in the runners list only while it holds a job, so an
  idle lane looks absent. Check `systemctl status 'actions-runner@*'` for what
  is actually running, not the GitHub UI.

## Verifying

```bash
gh api repos/msupply-foundation/open-msupply-internal/actions/runners -q '.runners[]|[.name,.status,(.labels|map(.name)|join(","))]|@tsv'
```

Then run the benchmark workflow and compare its summary table against the
figures from any other machine:

```bash
gh workflow run integration-test-check.yaml --ref develop \
  -f cache=both -f change=layered -f cold=false
```
