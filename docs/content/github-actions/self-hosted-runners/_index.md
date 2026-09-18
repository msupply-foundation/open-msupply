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

Only release tags are affected in practice: the develop CD build and every
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
| `deploy` | `docker compose up` against the develop environment — about a minute |

They are separate because the deploy job must land on the machine hosting the
develop environment, and that is a different box. Nothing in the deploy job
assumes a locally built image: it logs in and pulls by tag, so the two roles
never need to share a machine.

**This runbook sets up a build box.** Every lane on it is a `build` lane, and
that is all the rest of this page configures.

**The deploy lane is a one-off, done by hand on the deploy box.** One lane is
enough — the job is a one-minute `docker compose up` and there is never more
than one in flight — so the lane-scaling machinery below is not worth carrying
there. Unpack a runner as in the next section, register it once with `deploy`
in place of `build`, and give it the same systemd unit:

```bash
--labels self-hosted,Linux,"$(uname -m)",deploy
```

That box needs `docker`, `docker-compose-v2` and `git` from the package list
above, and nothing else — no buildx, no binfmt, no `/cache`. It never compiles.

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
