# Dev Container

This directory contains configuration for a VS Code dev container, providing an isolated development environment with all required dependencies pre-installed and a strict firewall to try avoid prompt injection.

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

## Connecting to services on your host machine

The container runs in an isolated network. Services running on your host (PostgreSQL, mSupply server, etc.) are not reachable via `localhost` — use `host.docker.internal` instead.

### `server/configuration/local.yaml`

Update the sync URL and database host:

```yaml
sync:
  url: "http://host.docker.internal:8888"

database:
  host: "host.docker.internal"
```

You may also need to change the Open mSupply central server url for the central site in mSupply.

## Limitations

- **Android builds are not supported.** The container does not include the Android SDK or NDK. Mobile/Android development must be done outside the container.
- **Port forwarding:** Ports `3003` (frontend) and `8000` (backend) are forwarded to your host automatically. Other ports must be forwarded manually if needed.
- **Firewall:** The container has an allowlist-based firewall. Access is permitted to crates.io, npm, GitHub, VS Code Marketplace, and AI providers. Arbitrary outbound connections to other hosts are blocked.
