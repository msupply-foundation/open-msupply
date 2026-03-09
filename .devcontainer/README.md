# Dev Container

This directory contains configuration for a VS Code dev container, providing an isolated development environment with all required dependencies pre-installed and a strict firewall to try avoid prompt injection. Make sure to confirm the firewall is installed correctly when the container starts up (can try `ping google.com` to check).

## What's included

- Rust (v1.88)
- Node.js
- Fish shell
- VS Code extensions: Claude Code, rust-analyzer, ESLint, Prettier, GraphQL, and more

## Setup

1. Install [VS Code](https://code.visualstudio.com/) and the [Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers).
2. Install Docker and ensure its running. This can be the official Docker Desktop or an alternative like Orbstack. You can also use docker on a remote host. See advanced installation details on the devcontainers extension readme.
3. Open this repository in VS Code and click **Reopen in Container** when prompted (or run **Dev Containers: Reopen in Container** from the command palette) (or click the remote connection icon in the bottom left a full list of options like rebuild container).
4. Wait for the container to build and dependencies to install — this may take several minutes on first run.

When using a git worktree there is an [experimental setting](https://github.com/devcontainers/cli/issues/796#issuecomment-3906955615) to mount the parent git folder into the container so git still works (requires the worktree to be created with `--relative-paths` e.g. `git worktree add --relative-paths ../open-msupply-2 develop`).

If you run into any firewall issues it's possible this domain was missed in the firewall rules. Add the domain to the `.devcontainer.json` file under the firewall feature: `"hosts": "host.docker.internal,<new domain here>"`.

## Connecting to services on your host machine

The container runs in an isolated network. Services running on your host (PostgreSQL, mSupply server, etc.) are not reachable via `localhost` — use `host.docker.internal` instead. Any service on your host can be accessed so don't run anything that could lead to prompt injection.

### `server/configuration/local.yaml`

Update the sync URL and database host:

```yaml
sync:
  url: "http://host.docker.internal:8888"

database:
  host: "host.docker.internal"
```

You may also need to change the Open mSupply central server url for the central site in mSupply. If this is set to `localhost` the container will try to connect to itself and fail. Instead set it to your network ip `192.168.1.x`.

## Limitations

- **Android builds are not supported.** The container does not include the Android SDK or NDK. Mobile/Android development must be done outside the container.
- **Port forwarding:** Ports `3003` (frontend) and `8000` (backend) are forwarded to your host automatically. Other ports must be forwarded manually if needed.
- **Firewall:** The container has an allowlist-based firewall. Access is permitted to crates.io, npm, GitHub, VS Code Marketplace, and AI providers. Arbitrary outbound connections to other hosts are blocked.
