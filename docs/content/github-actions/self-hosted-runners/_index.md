+++
title = "Self-hosted Linux runner setup"
weight = 20
sort_by = "weight"
template = "docs/section.html"

[extra]
source = "docs"
+++

# Self-hosted Linux runner setup

Runbook for the box that runs the containerised CI jobs and hosts the deployments. Several runner *instances* live on one machine — each takes one job at a time, so instances are the unit of parallelism ("lanes").

## What the host needs

**No Rust, no Node, no Postgres, no build libraries.** All of that lives inside the image build ([`Dockerfile`](https://github.com/msupply-foundation/open-msupply-internal/blob/develop/Dockerfile)), so the host never accumulates toolchain state.

| | why |
|---|---|
| `docker` | starts the job containers |
| `docker-buildx` | the image build runs `docker buildx build`; plain `docker build` lacks the cache mounts and `$BUILDPLATFORM` pinning |
| `docker-compose-v2` | the deploy runs `docker compose`; without the plugin `docker compose -f ...` fails as `unknown shorthand flag: 'f'` |
| `qemu-user-static`, `binfmt-support` | arm64 image builds on release tags — see below |
| `git`, `curl`, `tar`, `jq` | `actions/checkout`, and fetching the runner |

```bash
sudo apt-get update
sudo apt-get install -y docker.io docker-buildx docker-compose-v2 \
  qemu-user-static binfmt-support git curl tar jq
sudo systemctl enable --now docker
```

The distro `docker.io` package is enough: nothing here is version-sensitive, and it updates through normal `apt` with no third-party repo on a machine that holds registry credentials.

**binfmt is host state.** Release tags also build `linux/arm64`. The compile stages cross-compile natively, but the runtime stages' `RUN` steps are emulated, and without binfmt they fail with `exec format error`. The distro packages register it via systemd so it survives a reboot (the `tonistiigi/binfmt` container does not). Only release tags build arm64, so a box without it passes everything else and fails the first real release. Check:

```bash
docker --version && docker buildx version
docker run --rm --platform linux/arm64 debian:trixie-slim uname -m   # -> aarch64
```

## Sizing

Roughly **4 cores and 4–8 GB RAM per lane**, plus a small server's worth of RAM per deployment. RAM is what gets under-bought: rustc peaks while linking, and several lanes peaking together triggers the OOM killer. Disk: NVMe, and generous — `/var/lib/docker`, the caches, a target dir per lane and a database per deployment all grow. 500 GB is not excessive.

## User and directories

The runners run as the box's existing login (`ubuntu`). Everything below is written in `$USER` and `$HOME`, so it is copy-pasteable.

```bash
sudo usermod -aG docker "$USER"   # root-equivalent; fine on a dedicated CI box
newgrp docker                     # or log in again - `docker ps` fails until then

# Outside the runner workspaces, so they survive workspace wipes and lane changes.
sudo mkdir -p /cache/sccache /cache/target
sudo chown -R "$USER:$(id -gn)" /cache

# Where each deployment's machine-id lives - see "Deployment state" below.
sudo mkdir -p /opt/omsupply/deployments
sudo chown "$USER:$(id -gn)" /opt/omsupply/deployments
```

- `/cache/target` is split **per runner name** by the workflow: cargo locks a target dir, so lanes sharing one would serialise.
- `/cache/sccache` is reserved for the containerised check jobs; nothing writes to it yet.
- `/cache/pnpm` is created by the e2e nightly. `rm -rf` on it is always safe; it only costs a re-download.

## Lanes

A lane carries exactly one role:

| label | lane | what runs there |
|---|---|---|
| `build` | `actions-runner-1` … `-4` | the image build — CPU-bound, ~19 minutes cold |
| `deploy` | `actions-runner-deploy` | every plan, deploy and teardown job of the deployment workflows — about a minute each |
| `e2e` | `actions-runner-e2e` | the nightly front-end e2e suite (`frontend-e2e-nightly.yaml`), which also asks for `x64` |

A label nothing carries makes its jobs queue for ever with no error.

### Install and register

```bash
V=$(curl -s https://api.github.com/repos/actions/runner/releases/latest | jq -r .tag_name | sed 's/^v//')
case "$(uname -m)" in x86_64) A=x64 ;; aarch64) A=arm64 ;; esac
curl -fsSL -o /tmp/runner.tar.gz \
  "https://github.com/actions/runner/releases/download/v${V}/actions-runner-linux-${A}-${V}.tar.gz"
```

Then, per lane — the registration token expires after an hour, so mint one each time:

```bash
OWNER_REPO=msupply-foundation/open-msupply-internal
lane=1; labels=build          # deploy lane: lane=deploy labels=deploy; e2e: lane=e2e labels=e2e
mkdir -p ~/actions-runner-$lane && tar xzf /tmp/runner.tar.gz -C ~/actions-runner-$lane
TOKEN=$(gh api -X POST repos/$OWNER_REPO/actions/runners/registration-token -q .token)
~/actions-runner-$lane/config.sh --unattended --replace \
  --url https://github.com/$OWNER_REPO --token "$TOKEN" \
  --name "linux-$lane" --labels self-hosted,Linux,"$(uname -m)",$labels
```

### systemd

The build lanes share one template; `%i` is the lane. Written with a heredoc so `$USER` and `$HOME` resolve to you.

```bash
sudo tee /etc/systemd/system/actions-runner@.service >/dev/null <<EOF
[Unit]
Description=GitHub Actions runner %i
After=network-online.target docker.service
Wants=network-online.target
Requires=docker.service

[Service]
User=$USER
WorkingDirectory=$HOME/actions-runner-%i
ExecStart=$HOME/actions-runner-%i/run.sh
Restart=always
RestartSec=5
# One cold build cannot starve the deployments and the other lanes: past this
# the kernel reclaims from the lane rather than from the rest of the machine.
MemoryHigh=10G
# run.sh traps SIGTERM and passes it to the runner, which finishes or cancels
# the job it holds instead of dying mid-job. `mixed` sends the SIGTERM to
# run.sh alone, and SIGKILLs whatever is left only after TimeoutStopSec.
Environment=RUNNER_MANUALLY_TRAP_SIG=1
KillMode=mixed
TimeoutStopSec=5min

[Install]
WantedBy=multi-user.target
EOF
sudo systemctl daemon-reload
sudo systemctl enable --now actions-runner@1 actions-runner@2 actions-runner@3 actions-runner@4
```

The deploy lane has a unit of its own, with the same stop behaviour but **no memory cap** — it is the lane that tears a stack down when the box is full:

```bash
sudo tee /etc/systemd/system/actions-runner-deploy.service >/dev/null <<EOF
[Unit]
Description=GitHub Actions runner deploy
After=network-online.target docker.service
Wants=network-online.target
Requires=docker.service

[Service]
User=$USER
WorkingDirectory=$HOME/actions-runner-deploy
ExecStart=$HOME/actions-runner-deploy/run.sh
Restart=always
RestartSec=5
Environment=RUNNER_MANUALLY_TRAP_SIG=1
KillMode=mixed
TimeoutStopSec=5min

[Install]
WantedBy=multi-user.target
EOF
sudo systemctl daemon-reload
sudo systemctl enable --now actions-runner-deploy
```

```bash
systemctl status 'actions-runner*'
journalctl -u actions-runner@1 -f
```

Adding a build lane is installing and registering `actions-runner-5`, then `systemctl enable --now actions-runner@5`. A second deploy lane is also safe — nothing publishes a host port, so there is nothing for two lanes to collide on.

**Not used: JIT runners.** GitHub can mint a one-shot config per job (`generate-jitconfig`), which makes lanes ephemeral and removes registration entirely. It needs a token with **Administration: write** held on the box, which we do not want there, so the lanes are registered once by hand instead.

## The deploy box

Every deployment runs here: the named ones from `docker-named-deployment.yaml` (`develop`, the RC servers, ad-hoc ones) and every PR preview from `docker-pr-preview.yaml`. How to *use* them is on the [Docker page](../../docker/).

Each is its own compose project — one container running the server and its own postgres, plus volumes — reached at `https://<name>.<DEPLOY_DOMAIN>`, where `<name>` is also the container name. A deployment costs one image however often it redeploys (superseded tags are removed once the new one is routable); teardown and `docker-expire.yaml` remove the rest.

**Today `build`, `deploy` and `e2e` share one machine and one daemon.** The workflows assume nothing about that — splitting them is moving the deploy lane, not changing a workflow — but while they share:

- **`DEPLOY_SHARED_DAEMON=true`** skips pushing preview and named-deployment images to Docker Hub only to pull them straight back. Release tags and nightlies always push. Unset it **the moment the boxes are split**, or every deploy fails at the pull.
- **Never `docker image prune -a`.** An unreferenced image may be one built and not yet pushed, or a base image the next compile needs. The workflows delete images by exact reference for that reason.

### Repository variables

| variable | default | what it does |
|---|---|---|
| `DEPLOY_DOMAIN` | *none — required* | the base every hostname hangs off, e.g. `preview.example.com`. Must match the proxy's `.env`. |
| `DEPLOY_STATE_DIR` | `/opt/omsupply/deployments` | where each deployment's `machine-id` file is kept; must exist and be writable by the runner user |
| `DEPLOY_REFERENCE_FILE` | `e2e` | the dataset a new deployment is seeded from. `reference1` does not load on current servers. |
| `DEPLOY_SHARED_DAEMON` | unset | see above |
| `BUNDLE_RETAIN_DAYS` | `30` | how long a branch's plugin bundles are kept on the dashboard — see [Plugin bundles](#plugin-bundles) |

### Deployment state

**Do not wipe `DEPLOY_STATE_DIR`.** It holds one `machine-id` per deployment, mounted at `/etc/machine-id`. Without a stable one a redeploy changes the site's hardware id and v7 pairing rejects it — invisibly, until someone pairs. Removing it is the teardown's job.

Everything else a deployment needs to remember is a **label on its container**, read back by the plan job — which is why that job runs on this box:

| label | |
|---|---|
| `oms.branch` | the branch it follows, so a push updates it. Empty means pinned to a tag or commit. |
| `oms.expires` | when `docker-expire.yaml` may reap it, or `never` |
| `oms.profile` | `release` or `debug`, so an auto-update rebuilds it the same way |
| `oms.central` | whether it is a central server, so a redeploy cannot demote it |
| `oms.actor` | who first deployed it, carried forward on every redeploy and update, for the dashboard |

The labels come from `docker/compose.deploy.yaml` as of the commit whose workflow is running — develop's for a dispatch — not the commit being deployed. That is also how older release tags deploy; see the [Docker page](../../docker/).

**`docker-expire.yaml` reaps expired deployments daily** and its summary lists everything deployed and when each expires — the quickest answer to "what is on this box". Run it with `dry_run` to preview.

**Teardown marks the GitHub deployment inactive** (clearing the "Active" badge and dead link) but leaves the empty environment row in repository settings — deleting it needs Administration: write.

### Proxy and dashboard

The reverse proxy in front of every deployment and the deployments dashboard live in [`.github/deploy/`](https://github.com/msupply-foundation/open-msupply-internal/tree/develop/.github/deploy) and are deployed by **`docker-deploy-services.yaml`**. It runs on every push to `develop` that changes them, and can be run by hand. Each directory builds small images — stock Caddy or node with its files baked in, tagged with the directory's git tree hash — which the workflow brings up on the deploy box. The dashboard builds two: one for the page and its server, and one with only `snapshot.mjs` for the container that holds the docker socket.

- **Nothing is copied onto the box.** `docker ps` shows which version each one runs: the image tag is the tree hash, `git rev-parse <commit>:.github/deploy/proxy`.
- **The box keeps one file per service, its `.env`:** `~/proxy/.env` and `~/dashboard/.env`. Nothing in CI writes them. `DEPLOY_DOMAIN` and `GITHUB_REPOSITORY` are passed in by the workflow, so neither belongs there.
- **Only what changed is recreated.** A changed file is a new image, and compose recreates a container only when its image or settings change. Recreating the dashboard signs everyone out; recreating the proxy drops in-flight requests to every deployment for a second or two.
- **A bad change does not take the box down.** A Caddyfile that does not validate, a `.mjs` that does not parse, or a dashboard page that fails its typecheck or tests fails the image build, before anything running is touched; the dashboard's tests run before that. If a new version still does not come up healthy, the previous image — kept on the box — is brought back, and the run fails.
- **Trying a change before it merges:** run the workflow from your branch. That branch's copy stays on the box until the next run from `develop` — at the latest the daily scheduled one, which also puts back anything changed on the box by hand.

### Reverse proxy

| file | |
|---|---|
| `.github/deploy/proxy/compose.proxy.yaml` | the Caddy container, its ports, its CA volume and the shared network |
| `.github/deploy/proxy/proxy.Caddyfile` | the one route for every deployment, and why it is Caddy (see its comments) |

Set up once, outside CI:

1. **A wildcard DNS record** for `*.<DEPLOY_DOMAIN>`, pointing at whatever terminates TLS.
2. **One vhost on the edge proxy** for `*.<DEPLOY_DOMAIN>`, forwarding to this box on port 80. Skip it if the box is reached directly.
3. **Run `docker-deploy-services.yaml`.** It creates the `oms-edge` network if it is missing and brings the proxy up.

It takes 80 and 443. If something already holds them, set `PROXY_PORT` / `PROXY_TLS_PORT` in `~/proxy/.env` and rerun the workflow — compose sees the changed value and recreates the proxy. CI reads the port back from the container and needs no variable.

Routing is a pure function of the hostname — `pr-470.<domain>` goes to the container `pr-470` on port 8000 — so a new deployment is routable the moment it is up and nothing is ever reloaded. Two consequences: **anything attached to `oms-edge` is reachable as a subdomain**, so attach nothing unrelated; and a deploy creates `oms-edge` if missing but **never the proxy**, so a box without one gives healthy, unroutable deployments (the deploy's route check says so).

#### Local HTTPS

The proxy also serves every deployment on 443 with a wildcard certificate from Caddy's own CA — for reaching deployments directly from this network, and for browser features that need a secure context. Trust the root on the machine you browse from:

```bash
docker cp oms-proxy:/data/caddy/pki/authorities/local/root.crt ./caddy-root.crt
# macOS
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain caddy-root.crt
# Debian/Ubuntu
sudo cp caddy-root.crt /usr/local/share/ca-certificates/ && sudo update-ca-certificates
```

Firefox has its own store: import the root, or set `security.enterprise_roots.enabled`. The CA lives in the `caddy-data` volume, so use plain `docker compose down`, never `down -v`, or every machine has to trust a new root.

### Deployments dashboard

Shows every deployment on the box — the commit actually running, how far behind its branch, expiry, and whether a deploy is in flight — and lets QA and product start, extend, reseed and remove servers without the GitHub form. Its buttons dispatch the same workflows, with the signed-in person's own token.

Two more tabs: **Plugin bundles** (see [below](#plugin-bundles)) and **Releases**, which lists every open-mSupply release, release candidate and nightly with its Docker images (click one to copy its `docker pull`), Windows installers and Android APKs. A third container, `releases`, builds that list every ten minutes from Docker Hub's public tags and the public `msupply-releases` B2 bucket, and writes it to a file the dashboard serves. It needs no credentials: the bucket can't be listed without a key, so each file is looked up by the name the release workflows upload it under. It lists whatever Docker Hub still holds: every release, and a month of nightlies and RCs, per `cleanup-docker-tags.yaml`. APKs are named after `package.json`'s version rather than the tag, so they're looked for under each way the tag spells its version; that misses only a one-off tag whose version differs from its branch's.

Its files are in `.github/deploy/dashboard/`. How it works and why — the container split around the docker socket, sign-in and access, where each field comes from — is in the header comments of `compose.dashboard.yaml`, `snapshot.mjs`, `releases.mjs` and `web.mjs`. The page itself is a Solid app in `ui/`, built into the image by the `Dockerfile`'s first stage; `ui/README.md` says how to run it locally.

**1. Create the GitHub App** people sign in through, once, under the organisation (Settings → Developer settings → GitHub Apps → New):

- **Callback URL:** `https://dashboard.<DEPLOY_DOMAIN>/auth/callback` (add `http://localhost:8000/auth/callback` to try it locally)
- **Webhook:** off. **Installable:** only this account. Leave token expiry on.
- **Repository permissions:** Actions read & write (the runs, and the buttons), Contents read (commit subjects, "behind"). Nothing else.
- **Install** it on the organisation for this repository only, and **generate a client secret**.

**2. Give the box its secret**, the one file CI does not write:

```bash
mkdir -p ~/dashboard
cat > ~/dashboard/.env <<'EOF'
GITHUB_CLIENT_ID=Iv23li...
GITHUB_CLIENT_SECRET=...
EOF
chmod 600 ~/dashboard/.env
```

**3. Run `docker-deploy-services.yaml`**, then open `https://dashboard.<DEPLOY_DOMAIN>`. The client secret is the only credential on the box — no token is stored; everything is asked with the viewer's own. Read access to the repository shows the page, write access adds the buttons.

- **No proxy change is needed**: the container is named `dashboard`, listens on 8000 and sits on `oms-edge`.
- **Reserved names:** `dashboard`, `oms-dashboard`, `oms-dashboard-snapshot`, `oms-dashboard-releases` and `oms-proxy` are refused by the named-deployment workflow and the dashboard for every action, since a teardown is `docker compose -p <name> down -v`. The list is `BOX_SERVICES` in `.github/scripts/deploy-plan.js` and `web.mjs`.
- **Buttons that dispatch a workflow branch** before it merges: add `DISPATCH_REF=<branch>` to `~/dashboard/.env` and rerun the workflow. The buttons dispatch on `develop` otherwise.

### Plugin bundles

The dashboard's **Plugin bundles** tab (`https://dashboard.<DEPLOY_DOMAIN>/plugins`) lists ready-to-install bundles of the country plugins in `frontend/plugins/`, **one version line per plugin**: its released versions newest first, which version `develop` and each RC carry, and branch builds as pre-releases. Each has a download button; the file installs through the server's plugin upload or `remote_server_cli install-plugin-bundle`.

They come from **`publish-bundles.yaml`**:

- **Releasing a version:** bump the plugin's `version` (both halves, if it has a backend; `pnpm build:plugins` refuses halves that disagree) and merge it. The first build of a new version on `develop`, an RC branch or a release tag is published, and never changes after. A build whose bytes differ from the released version's is not published; the run warns, and the dashboard flags the branch. Bytes are the test, not source: a toolchain change (a vite or build-preset bump in the lockfile, a new `HOST_RUNTIME`) changes every bundle, and each plugin then needs a version bump to release, since what gets installed has changed.
- **RC branches and release tags** release a version the same way, once the branch has this workflow. RC branches cut before it can be published by running the workflow by hand from `develop` on the RC; a plugin whose halves still disagree there (CIV before 3.0.0) is skipped with a warning and the rest publish.
- **Pre-releases:** build a branch from the dashboard's Plugin bundles tab (its **Build a branch** button, for anyone with write access), or run the workflow by hand from Actions. The tab shows builds in flight and any that failed in the last day. Anything that differs from a release shows as a pre-release, the newest per branch, pruned after `BUNDLE_RETAIN_DAYS` (default 30).
- **Compatibility** is recorded beside each version, not as part of it. Today it is derived from the version (the server loads a plugin whose major.minor is at most its own) and from the frontend half's host runtime; see `compatOf` in `.github/scripts/publish-bundles.mjs`.
- **How:** the build runs `pnpm build:plugins` on a hosted runner and drops the `plugins/examples` bundles. A short job on the `deploy` lane then runs `publish-bundles.mjs` in a throwaway `node` container, which writes into the **`oms-bundles` volume**: `index.json` plus one file per distinct bundle, named by its sha256. The dashboard mounts it read-only. Both this workflow and `docker-deploy-services.yaml` create the volume if it is missing, so there is nothing to set up by hand.

**The store is a cache, not the record.** The plugin build is reproducible (the same commit gives byte-identical bundles), so a pruned bundle, or a lost volume, is rebuilt by running the workflow on the commit it came from. Nothing on the box needs backing up for this.

## Verifying

```bash
gh api repos/msupply-foundation/open-msupply-internal/actions/runners -q '.runners[]|[.name,.status,(.labels|map(.name)|join(","))]|@tsv'
```

Then run the benchmark workflow and compare its summary against other machines:

```bash
gh workflow run integration-test-check.yaml --ref develop \
  -f cache=both -f change=layered -f cold=false
```

## Decisions

Why the box is set up this way, so nobody has to rediscover it. Decisions recorded in the code are listed with where to look.

- **Caddy as the reverse proxy, not Traefik or nginx.** Routes here are computable from the hostname, so nothing needs *discovering*. Traefik is the tool for discovery, and charges for it: the docker socket mounted into the proxy (root on the box) or a socket-proxy sidecar, plus per-container labels that would make each compose file know its public hostname. nginx works, but needs three settings hand-tuned that Caddy has by default, each a silent failure if missed — see the comments in `.github/deploy/proxy/proxy.Caddyfile`.
- **The proxy is a container, not a process on the box.** Docker's embedded DNS (`127.0.0.11`), which resolves a deployment by name at dial time, exists only inside containers on a user-defined network.
- **The proxy and the dashboard are deployed by a workflow of their own, only from `develop`.** Each fronts every deployment at once, so neither may move with whichever deploy runs next — a preview deploys from its pull request's commit. They were stood up by hand at first, and the box drifted: the dashboard went on running a version that could not read the image tags deployments had moved to. See the header of `docker-deploy-services.yaml`.
- **No dedicated runner account.** On a box that does nothing but CI it buys no isolation worth the extra moving part, and every path then has to be written for a user you are not logged in as, which is where runbooks rot.
- **Lanes registered by hand, not JIT.** JIT runners are ephemeral and never need registering, but minting their config needs a token with Administration: write living on the box. Registration is a one-off per lane; the token is a standing credential.
- **Distro `docker.io`, not Docker's own repo.** Nothing these jobs do is version-sensitive, and the distro package updates through normal `apt` with no third-party repo or GPG key on a machine that holds registry credentials.
- **Lane roles are exclusive.** A lane carries one label so a 19-minute build never queues ahead of a one-minute deploy or teardown. That is why `e2e` became a role of its own rather than borrowing `build`; the reasoning is in the header of `frontend-e2e-nightly.yaml`.
- **One machine-id per deployment**, not the host's: two deployments sharing one collide when both pair to the same central server. See `docker-deploy.yaml`.
- **The proxy's host port is read back, not configured.** A `PROXY_PORT` repository variable used to duplicate what the proxy already knew, and a mismatch reported every deployment as unroutable. If it is still set on the repository it is inert. See `docker-deploy.yaml`.
- **`DEPLOY_SHARED_DAEMON` skips the registry rather than adding a local one.** The image then exists only on this box's disk: a prune or a rebuilt box means recompiling rather than pulling, but costs no data, since databases are volumes. `skip_if_exists` probes the daemon instead of the registry while it is set. See `docker-named-deployment.yaml`.
- **`e2e`, not `reference1`, as the default dataset.** `reference1` is a 2023 V5/V6 export, and `SyncBufferRow.source_site_id` is a plain `i32` with no `#[serde(default)]`, so it fails to deserialise (`missing field 'source_site_id'`) before integration. Fixing it is a server change: that `#[serde(default)]` plus a re-export. `e2e` is exercised nightly, so it cannot rot unnoticed.
- **The dashboard's design** — the socket-holding container with no network and no listener, sign-in with the viewer's own token, and buttons that dispatch the existing workflows so there is one writer — is in the header comments of `.github/deploy/dashboard/compose.dashboard.yaml`, `snapshot.mjs` and `web.mjs`.
- **Plugin bundles are organised by each plugin's own version, not by branch or commit**, and released by bumping the version, with no git tags yet. Compatibility with core is kept as a separate field so it can stop being tied to the version number later.
- **Plugin bundles live on this box, not in git** (#645). Committing them back from CI would put a bot commit on `develop` and the RC branches after every plugin change, and would leave QA's branch builds with nowhere to go. A reproducible build means the box only ever holds a cache. They are served by the dashboard because it already has the sign-in and the route. See [Plugin bundles](#plugin-bundles).
- **How deployments are deployed** — compose files from the running workflow's commit, version overrides for old releases, and why the workflows are not split into `@develop` run files — is Fork 4 of `frontend/kdd/server-image-build/draft-kdd.md`.
