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

**binfmt is host state.** Release tags also build `linux/arm64`. The compile stages cross-compile natively, but the runtime stages' `RUN` steps are emulated, and without binfmt they fail with `exec format error`. The distro packages register it via systemd so it survives a reboot (the `tonistiigi/binfmt` container does not). Only release tags build arm64, so a box without it passes everything else and fails the first real release. The image workflow's `Check arm64 emulation` step now fails an arm64 build up front with an error naming the runner and these packages, rather than with `exec format error` deep in the build log. Check:

```bash
docker --version && docker buildx version
docker run --rm --platform linux/arm64 debian:trixie-slim uname -m   # -> aarch64
```

### Build cache limits

**Set them before the first build.** With no `/etc/docker/daemon.json`, BuildKit's default garbage collection caps *cache mounts* — where the image build keeps its cargo target dirs and registry — at about 2.5 GB, and drops anything unused for 48 hours. One target dir is several times that, so it is evicted almost as soon as it is written and every image build compiles from cold (~20 minutes instead of seconds). Nothing reports this: the builds just stay slow.

`/etc/docker/daemon.json` is the daemon's file — `~/.docker/config.json` is the client's (registry logins), and build settings there are ignored. The limits are tracked in [`.github/deploy/host/daemon.json`](https://github.com/msupply-foundation/open-msupply-internal/blob/develop/.github/deploy/host/daemon.json), and the daily [host check](#systemd) gives the commands to write it when the box's differs. Then:

```bash
sudo systemctl restart docker
docker buildx inspect | grep -iA6 'gc policy'   # must show the repo's rules, not the defaults
```

- **Restart when nothing is building or deploying.** Every container stops; the deployments, the proxy and the dashboard are `restart: unless-stopped`, so they come back on their own.
- **The first rule is the cargo caches**: the target dirs (per database, architecture and profile; CI's test builds share the debug ones) and the registry. 60 GB is a starting point — `docker buildx du --verbose` shows what they actually take.
- **The second bounds the whole build cache** and keeps 30 GB of the disk free for images and deployments' databases.
- `docker builder prune --filter type=exec.cachemount` empties the cargo caches by hand; the next build of each is cold.

## Sizing

Roughly **4 cores and 4–8 GB RAM per lane**, plus a small server's worth of RAM per deployment. RAM is what gets under-bought: rustc peaks while linking, and several lanes peaking together triggers the OOM killer.

**Nothing on the host caps a lane's memory.** A job's real work does not run in the runner's process tree: `docker buildx build` compiles inside dockerd's BuildKit, and `docker run` containers run under containerd. A limit on the runner's systemd unit only ever covers the runner and the `docker` client, so it cannot stop a build. What bounds memory is how much each build runs at once (cargo's job count) and limits set on the containers themselves — add lanes only as far as the busiest days leave headroom, and watch available memory when you do.

**Add swap.** With none, a brief spike past free memory goes straight to the OOM killer, which may pick a deployment's postgres; with some, it slows down instead:

```bash
sudo fallocate -l 16G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

`docker-deploy-services.yaml`'s daily [host check](#systemd) reports a box with no swap. Disk: NVMe, and generous — `/var/lib/docker`, the caches, a target dir per lane and a database per deployment all grow. 500 GB is not excessive.

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

# The Launchpad's store: plugin bundles, report bundles, schemas.
sudo mkdir -p /opt/omsupply/bundles
sudo chown "$USER:$(id -gn)" /opt/omsupply/bundles
```

- `/opt/omsupply/bundles` is a host directory rather than a docker volume so no prune, `down -v` or reinstalled daemon can take it. The workflows refuse to run without it rather than let docker create an empty one. See `.github/scripts/bundle-store.sh`.

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

The units are tracked in [`.github/deploy/host/`](https://github.com/msupply-foundation/open-msupply-internal/tree/develop/.github/deploy/host): one template for the build and e2e lanes (`actions-runner@.service`, `%i` is the lane) and one for the deploy lane, with `@USER@` and `@HOME@` standing for the runner user's.

**`docker-deploy-services.yaml` checks the box against them on its daily run.** When they differ, its job summary shows the diff and the commands to apply it — the files written out in full, so they paste onto a box with no checkout — with the restarts they need left for a moment when nothing is running. Nothing is applied automatically. To change a unit, change the repo's copy, merge, then paste what the next run's summary gives; an edit made only on the box is reported until the repo agrees.

On a new box, before any lane can run that workflow, copy the two files from the repo by hand with `@USER@`/`@HOME@` filled in, then:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now actions-runner@1 actions-runner@2 actions-runner@3 actions-runner@4 actions-runner-deploy
```

```bash
systemctl status 'actions-runner*'
journalctl -u actions-runner@1 -f
```

Adding a build lane is installing and registering `actions-runner-5`, then `systemctl enable --now actions-runner@5`. A second deploy lane is also safe — nothing publishes a host port, so there is nothing for two lanes to collide on.

**Not used: JIT runners.** GitHub can mint a one-shot config per job (`generate-jitconfig`), which makes lanes ephemeral and removes registration entirely. It needs a token with **Administration: write** held on the box, which we do not want there, so the lanes are registered once by hand instead.

## The deploy box

Every deployment runs here: the named ones from `docker-named-deployment.yaml` (`develop`, the RC servers, ad-hoc ones) and every PR preview from `docker-pr-preview.yaml`. How to *use* them is on the [Docker page](../../docker/).

Each is its own compose project — one container running the server and its own postgres, plus volumes — reached at `https://<name>.<DEPLOY_DOMAIN>` (`http://` while they are [on the VPN only](#vpn-only-deployments)), where `<name>` is also the container name. A deployment costs one image however often it redeploys (superseded tags are removed once the new one is routable); teardown and `docker-expire.yaml` remove the rest — including images that were built but never deployed, which no deploy or teardown ever sees.

**Today `build`, `deploy` and `e2e` share one machine and one daemon.** The workflows assume nothing about that — splitting them is moving the deploy lane, not changing a workflow — but while they share:

- **`DEPLOY_SHARED_DAEMON=true`** skips pushing preview and named-deployment images to Docker Hub only to pull them straight back. Release tags and nightlies always push. Unset it **the moment the boxes are split**, or every deploy fails at the pull.
- **Never `docker image prune -a`.** An unreferenced image may be one built and not yet pushed, or a base image the next compile needs. The workflows delete images by exact reference for that reason.

### Repository variables

| variable | default | what it does |
|---|---|---|
| `DEPLOY_DOMAIN` | *none — required* | the base every hostname hangs off, e.g. `preview.example.com`. Must match the proxy's `.env`. |
| `DEPLOY_SCHEME` | `https` | how deployments are reached, for every link to one: the deploy's URL, the PR comment and the dashboard. `http` while they are [on the VPN only](#vpn-only-deployments); the dashboard itself is always `https`. |
| `DEPLOY_STATE_DIR` | `/opt/omsupply/deployments` | where each deployment's `machine-id` file is kept; must exist and be writable by the runner user |
| `DEPLOY_REFERENCE_FILE` | `e2e` | the dataset a new deployment is seeded from. `reference1` does not load on current servers. |
| `DEPLOY_SHARED_DAEMON` | unset | see above |
| `DEPLOY_BUNDLES_DIR` | `/opt/omsupply/bundles` | the Launchpad's store of plugin bundles, report bundles and schemas; must exist |
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

**`docker-expire.yaml` reaps expired deployments daily** and its summary lists everything deployed and when each expires — the quickest answer to "what is on this box". Run it with `dry_run` to preview. The same sweep also:

- **tears down the preview of any closed pull request**, whatever its label says. A PR's own close normally does that, but GitHub runs no `pull_request` workflow on a PR with merge conflicts, so before the close moved to `pull_request_target` a preview closed in conflict ran on for good.
- **removes `msupplyfoundation/omsupply` images no container is running that are over a day old** — a build whose deploy was cancelled by the next push, or failed, leaves one, and at several GB each they were most of what filled the disk. Removing one costs at most a rebuild if that commit is deployed again.

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
| `.github/deploy/proxy/compose.proxy.yaml` | the Caddy container, its two ports and the shared network |
| `.github/deploy/proxy/proxy.Caddyfile` | the one route for every deployment, the gate on the internet door, and why it is Caddy (see its comments) |

Set up once, outside CI. This is the full setup, with deployments on the internet behind the gate; for the dashboard alone on the internet, see [VPN-only deployments](#vpn-only-deployments).

1. **DNS records** for `<DEPLOY_DOMAIN>` (the dashboard) and `*.<DEPLOY_DOMAIN>` (the deployments), both pointing at whatever terminates TLS.
2. **The two doors**, both plain HTTP with `Host` kept:
   - **the office and the VPN → port 80**, the open door: sync, LAN tablets and CI's route check use it. People reach it directly, which is why it is on 80 — its addresses carry no port.
   - **the internet → the edge → port 8080**, the gated door: every request needs a GitHub sign-in (see [the gate](#the-gate-in-front-of-every-deployment)). Only the edge connects here, so the port can be anything.

   The edge must **never send the internet to 80**. If office machines reach the edge through the office's public address, that address counts as the office.
3. **Run `docker-deploy-services.yaml`.** It creates the `oms-edge` network if it is missing and brings the proxy up.

It takes 80 and 8080. If something already holds them, set `PROXY_PORT` (open) / `PROXY_GATED_PORT` (gated) in `~/proxy/.env` and rerun the workflow — compose sees the changed value and recreates the proxy. `PROXY_BIND` publishes the open door on one address only; it is only needed if the box has an interface the internet can reach, since docker's published ports bypass `ufw`/firewalld. Behind NAT, leave it unset. CI reads the open door's address back from the container and needs no variable.

Routing is a pure function of the hostname — `pr-470.<domain>` goes to the container `pr-470` on port 8000, and the bare `<domain>` to the dashboard — so a new deployment is routable the moment it is up and nothing is ever reloaded. Two consequences: **anything attached to `oms-edge` is reachable as a subdomain**, so attach nothing unrelated; and a deploy creates `oms-edge` if missing but **never the proxy**, so a box without one gives healthy, unroutable deployments (the deploy's route check says so).

#### VPN-only deployments

The setup without a wildcard: the dashboard is on the internet, the deployments are reachable from the office and the VPN only. The gate still stands in front of the dashboard, and is ready for the deployments when they follow — the wildcard record, its certificate and one more edge route, with nothing on the box changing.

`DEPLOY_DOMAIN` is still the public domain — the dashboard is the domain itself, the deployments are one label under it — and the office and VPN DNS answers for the deployments itself.

1. **Public DNS and a certificate for `<DEPLOY_DOMAIN>` alone.** No wildcard, no DNS-01.
2. **One edge route**, for that hostname only, to port 8080 with `Host` kept.
3. **Office and VPN DNS:** `*.<DEPLOY_DOMAIN>` to the box, and the bare `<DEPLOY_DOMAIN>` left to public DNS (or pointed at the edge's internal address). It must not go to the box: there the dashboard is ungated plain http, and sign-in comes back to https and breaks. dnsmasq's `address=` covers the bare domain along with its subdomains, so with dnsmasq override the bare domain with a `host-record`, which wins over `address=`:

   ```
   address=/<DEPLOY_DOMAIN>/<box internal address>
   host-record=<DEPLOY_DOMAIN>,<edge internal address>
   ```
4. **Set the `DEPLOY_SCHEME` repository variable to `http`**, and rerun `docker-deploy-services.yaml` so the dashboard's links follow.

Deployments are plain HTTP on the VPN, which encrypts the hop already. What that costs is the browser's secure-context features — in practice the copy-to-clipboard buttons, which fail on http. There is deliberately no local certificate: one from a private CA works only on machines that trust its root, and nobody installs it.

#### The gate in front of every deployment

Deployments are seeded with datasets whose logins are known, and a logged-in user can download a deployment's whole database — so the internet door lets nothing through without a GitHub sign-in. Caddy puts each request to the dashboard's `/auth/check` first (`forward_auth`), and only the dashboard's own `/auth/*` is let through unasked.

- **Who gets in:** anyone who can see this repository — the dashboard's own rule. Write access is still what the dashboard's buttons need.
- **How:** signing in sets a second cookie, `oms_gate`, for the whole domain. It holds no token — a deployment runs some branch's code, so nothing sent to one may be worth stealing — and the proxy strips it before a request reaches a deployment. It ends when the dashboard session does: after at most 12 hours, on sign-out, or when the dashboard restarts.
- **A page load** is sent to sign in and brought back to where it was going. **Anything else** — the app's own requests, a remote site syncing — gets a 401.
- **No exception for sync:** sync credentials are in the seeded datasets, so they protect nothing. A remote site has to be in the office or on the VPN.
- **If the dashboard is down**, every deployment is unreachable through the internet door. The open door does not depend on it.

There is no local HTTPS on the box any more: everything comes through the edge, which serves the real certificate. A box set up before this keeps the `oms-proxy_caddy-data` and `oms-proxy_caddy-config` volumes, which held the old internal CA — `docker volume rm` them, and anyone who trusted its root can remove it.

### Deployments dashboard

Shows every deployment on the box — the commit actually running, how far behind its branch, expiry, and whether a deploy is in flight — and lets QA and product start, extend, reseed and remove servers without the GitHub form. Its buttons dispatch the same workflows, with the signed-in person's own token.

Two more tabs: **Plugin bundles** (see [below](#plugin-bundles)) and **Releases**, which lists every open-mSupply release, release candidate and nightly with its Docker images (click one to copy its `docker pull`), Windows installers and Android APKs. A third container, `releases`, builds that list every ten minutes from Docker Hub's public tags and the public `msupply-releases` B2 bucket, and writes it to a file the dashboard serves. It needs no credentials: the bucket can't be listed without a key, so each file is looked up by the name the release workflows upload it under. It lists whatever Docker Hub still holds: every release, and a month of nightlies and RCs, per `cleanup-docker-tags.yaml`. APKs are named after `package.json`'s version rather than the tag, so they're looked for under each way the tag spells its version; that misses only a one-off tag whose version differs from its branch's.

Its files are in `.github/deploy/dashboard/`. How it works and why — the container split around the docker socket, sign-in and access, where each field comes from — is in the header comments of `compose.dashboard.yaml`, `snapshot.mjs`, `releases.mjs` and `web.mjs`. The page itself is a Solid app in `ui/`, built into the image by the `Dockerfile`'s first stage; `ui/README.md` says how to run it locally.

**1. Create the GitHub App** people sign in through, once, under the organisation (Settings → Developer settings → GitHub Apps → New):

- **Callback URL:** `https://<DEPLOY_DOMAIN>/auth/callback` (add `http://localhost:8000/auth/callback` to try it locally)
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

**3. Run `docker-deploy-services.yaml`**, then open `https://<DEPLOY_DOMAIN>`. Its old address, `https://dashboard.<DEPLOY_DOMAIN>`, redirects there. The same sign-in is the [gate in front of every deployment](#the-gate-in-front-of-every-deployment) on the internet door. The client secret is the only credential on the box — no token is stored; everything is asked with the viewer's own. Read access to the repository shows the page, write access adds the buttons.

- **The proxy finds it by name**: the bare domain goes to the container `dashboard` on port 8000, on `oms-edge`.
- **Reserved names:** `dashboard`, `oms-dashboard`, `oms-dashboard-snapshot`, `oms-dashboard-releases` and `oms-proxy` are refused by the named-deployment workflow and the dashboard for every action, since a teardown is `docker compose -p <name> down -v`. The list is `BOX_SERVICES` in `.github/scripts/deploy-plan.js` and `web.mjs`.
- **Buttons that dispatch a workflow branch** before it merges: add `DISPATCH_REF=<branch>` to `~/dashboard/.env` and rerun the workflow. The buttons dispatch on `develop` otherwise.

### Plugin bundles

The dashboard's **Plugin bundles** tab (`https://<DEPLOY_DOMAIN>/plugins`) lists ready-to-install bundles of the country plugins in `frontend/plugins/`, **one version line per plugin**: its released versions newest first, which version `develop` and each RC carry, and branch builds as pre-releases. Each has a download button; the file installs through the server's plugin upload or `remote_server_cli install-plugin-bundle`.

They come from **`publish-bundles.yaml`**:

- **Releasing a version:** bump the plugin's `version` (both halves, if it has a backend; `pnpm build:plugins` refuses halves that disagree) and merge it. The first build of a new version on `develop`, an RC branch or a release tag is published, and never changes after. A build whose bytes differ from the released version's is not published; the run warns, and the dashboard flags the branch. Bytes are the test, not source: a toolchain change (a vite or build-preset bump in the lockfile, a new `HOST_RUNTIME`) changes every bundle, and each plugin then needs a version bump to release, since what gets installed has changed.
- **RC branches and release tags** release a version the same way, once the branch has this workflow. RC branches cut before it can be published by running the workflow by hand from `develop` on the RC; a plugin whose halves still disagree there (CIV before 3.0.0) is skipped with a warning and the rest publish.
- **Pre-releases:** build a branch from the dashboard's Plugins page (its **Build from a branch** button, or **Build plugin bundles** on a server's own page, for anyone with write access), or run the workflow by hand from Actions. The Plugins page shows builds in flight and any that failed in the last day. Anything that differs from a release shows as a pre-release, the newest per branch, pruned after `BUNDLE_RETAIN_DAYS` (default 30).
- **Compatibility** is recorded beside each version, not as part of it. Today it is derived from the version (the server loads a plugin whose major.minor is at most its own) and from the frontend half's host runtime; see `compatOf` in `.github/scripts/publish-bundles.mjs`.
- **How:** the build runs `pnpm build:plugins` on a hosted runner and drops the `plugins/examples` bundles. A short job on the `deploy` lane then runs `publish-bundles.mjs` in a throwaway `node` container, which writes into the **Launchpad store** (`DEPLOY_BUNDLES_DIR`, see [User and directories](#user-and-directories)): `index.json` plus one file per distinct bundle, named by its sha256. The dashboard mounts it read-only.

**The store is a cache, not the record.** The plugin build is reproducible (the same commit gives byte-identical bundles), so a pruned bundle, or a lost store, is rebuilt by running the workflow on the commit it came from. Nothing on the box needs backing up for this.

### Report bundles

The dashboard's **Reports** page (`https://<DEPLOY_DOMAIN>/reports`) lists each client's custom reports from `private/reports/clients/`, ready to install: **one `reports.json` per client per build**, holding every version of each of the client's reports, since a server picks the version of each report that suits it. It installs through the central server's report upload (**Manage → Reports**) or `remote_server_cli upsert-reports`.

They come from **`publish-reports.yaml`**:

- **What is kept:** the newest build of `develop`, of each RC branch and of each release tag, for good. A push there publishes when `private/reports/` or the bundler (`scripts/reports/`) changed; a release tag always does.
- **Branch builds:** the Reports page's **Build from a branch** button (for anyone with write access), or the workflow run by hand. The newest per branch, pruned after `BUNDLE_RETAIN_DAYS` (default 30).
- **A client that fails to build** keeps its last bundle for that ref, and the run warns; the other clients still publish. A client removed from the tree loses its bundle for that ref.
- **Version bumps still matter.** A server installs a report by its id (`<code>_<version>_<is_custom>`) and keeps one it already has, so a report changed without a new version never reaches servers that had it. The store remembers the first `develop`/RC/tag build of each report version, and a later build that changes it is flagged on the page ("needs a version bump") and warned about in the run, naming the ref it differs from. Reports are compared as built, so a bundler or dependency change flags every report it changes. Two reports in one client with the same id are flagged too ("shares an id"): only one of them installs.
- **How:** the build runs `scripts/reports/build-reports.mjs --each private/reports/clients` on the `build` lane, in a pinned `node` container (pnpm's store in `/cache/pnpm`), as `build-standard-reports.yaml` does. A short job on the `deploy` lane then runs `publish-reports.mjs` in a throwaway `node` container, which writes into the same **Launchpad store** as the plugin bundles, under `reports/`, and takes the same lock.

The store is a cache here too: the report build is reproducible, so anything lost is rebuilt by running the workflow on the commit it came from. The run builds the ref's reports with its own copy of the bundler, so that works for any ref from the move to pnpm (#1444) on; nothing older can be built.

### Datasets

A new server, or one being reset, can start with more than the small sample data built into the image (`e2e`, `reference1`): any postgres custom-format dump (`pg_dump -Fc`) of an open-mSupply database added to the Launchpad, such as the reference system's (<https://reference.msupply.foundation>, 3 months, 12 months or 3 years of a fictional country's supply chain) or an anonymised client database.

- **Adding one:** run **`publish-dataset.yaml`** by hand with a name (e.g. `reference-3-months`), the dump's URL - or `file:///path` for one you have copied onto the box - a label and a line of description. It downloads the dump into the store under `datasets/<name>/`, and reads the open-mSupply version it was taken at and its users straight out of it with `pg_restore` — nothing is restored. It must be a custom-format dump without privileges (`pg_dump -Fc --no-owner --no-privileges`); anything else is refused. Restoring any dump runs the SQL it holds, so only add dumps from somewhere you trust. Adding a name that exists replaces it; removing one (`remove`) deletes its file. Servers started from either keep their data.
- **Choosing one:** the new-server form lists every dataset under **With example data**, and a server's **Reset data** has the same list, so a reset can switch data. Migrations only go forward, so a dataset is offered only to versions at least as new as the one it was taken at; the others are listed greyed out with why. A branch, a pull request or develop not yet deployed counts as current.
- **Logins:** every user's password is set to `pass` as the server is seeded, as in the sample data, whatever the dump's own passwords were. A server's **Log in** card lists the dataset's users.
- **How it is seeded:** `docker-deploy.yaml` restores the dump in a one-off container of the server's own image, on its new database volume, before the server first starts: the image's `entry-postgres.sh` restores it (images from v3.2 can), its migrations run, every password becomes `pass`, then `refresh-dates` (which also turns outgoing sync off) - see `.github/scripts/seed-from-dump.sh`. A seed that fails removes the volume, so the next deploy starts again rather than keeping a half-restored database.
- **Kept until removed.** Unlike the bundles and schemas, a dataset is not reproducible from the repository, so nothing prunes it — and nothing backs it up either, beyond the host directory being outside docker. Mind the disk: the 3-year reference database is 440 MB as a dump, and every server seeded from it holds its own copy, restored.

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
- **No local HTTPS.** There was a site on the box with Caddy's internal CA, for secure-context features when reaching a deployment directly. It needed every machine to trust its root, which nobody did, so VPN-only deployments are plain HTTP and the real certificate is the edge's.
- **Two front doors split by port, not by client address.** Every request reaches the proxy from the edge's address, so telling the internet from the office there would mean trusting `X-Forwarded-For`, and a mistake in that is a way past the gate. The edge knows the real client and picks the port. The open door is 80 because people reach it directly and type its addresses; the gated door is 8080 because only the edge connects to it, and is told the port once. See the header of `.github/deploy/proxy/proxy.Caddyfile`.
- **No sync exception in the gate.** Sync credentials ship in the seeded datasets, so letting `/central/*` through would open every deployment's sync to the internet. Remote sites sync from the office or the VPN.
- **A gate cookie separate from the dashboard's session.** It has to reach every deployment, and deployments run branch code, so it carries nothing but "signed in" — never the GitHub token. See the header of `.github/deploy/dashboard/web.mjs`.
- **The proxy's host port is read back, not configured.** A `PROXY_PORT` repository variable used to duplicate what the proxy already knew, and a mismatch reported every deployment as unroutable. If it is still set on the repository it is inert. See `docker-deploy.yaml`.
- **`DEPLOY_SHARED_DAEMON` skips the registry rather than adding a local one.** The image then exists only on this box's disk: a prune or a rebuilt box means recompiling rather than pulling, but costs no data, since databases are volumes. `skip_if_exists` probes the daemon instead of the registry while it is set. See `docker-named-deployment.yaml`.
- **`e2e`, not `reference1`, as the default dataset.** `reference1` is a 2023 V5/V6 export, and `SyncBufferRow.source_site_id` is a plain `i32` with no `#[serde(default)]`, so it fails to deserialise (`missing field 'source_site_id'`) before integration. Fixing it is a server change: that `#[serde(default)]` plus a re-export. `e2e` is exercised nightly, so it cannot rot unnoticed.
- **The dashboard's design** — the socket-holding container with no network and no listener, sign-in with the viewer's own token, and buttons that dispatch the existing workflows so there is one writer — is in the header comments of `.github/deploy/dashboard/compose.dashboard.yaml`, `snapshot.mjs` and `web.mjs`.
- **Plugin bundles are organised by each plugin's own version, not by branch or commit**, and released by bumping the version, with no git tags yet. Compatibility with core is kept as a separate field so it can stop being tied to the version number later.
- **Plugin bundles live on this box, not in git** (#645). Committing them back from CI would put a bot commit on `develop` and the RC branches after every plugin change, and would leave QA's branch builds with nowhere to go. A reproducible build means the box only ever holds a cache. They are served by the dashboard because it already has the sign-in and the route. See [Plugin bundles](#plugin-bundles).
- **How deployments are deployed** — compose files from the running workflow's commit, version overrides for old releases, and why the workflows are not split into `@develop` run files — is Fork 4 of `frontend/kdd/server-image-build/draft-kdd.md`.
