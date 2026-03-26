---
name: Feature request
about: Suggest an idea for this project
title: "Initialise as Central Server — standalone OMS central setup flow"
labels: enhancement, needs triage
type: feature
assignees: ""
---

## Is your feature request related to a problem? Please describe

Currently, the only way to initialise an Open mSupply server is via the sync-based flow, which requires a central server URL. There is no way to set up OMS as a standalone central server (without a legacy mSupply central) from the initialisation screen.

This blocks the ability to use OMS as the sole source of truth for central data, including the import/export feature for central data tables (see related issue: #12 — Central data editing mode).

## Describe the solution you'd like

### Initialisation screen — "Initialise as Central Server" option

On the existing initialisation screen, add an option to **"Initialise as Central Server"** alongside the current sync-based initialisation flow. When selected:

1. **Auto-create an admin user** with all permissions (server-level, not store-scoped).
2. **Auto-generate a password** and display it to the user on screen so they can log in. This password is shown once and must be copied/saved by the user.
3. **Permissions model**: Since there are no stores yet at initialisation, permissions must work without a store context. Either:
   - Use non-store-scoped permissions (e.g. `ServerAdmin` which already has no `store_id`), or
   - Auto-create a **"Central Config" store** that acts as the admin store for central data management. This store would be the context for `EditCentralData` and other central permissions.
4. The server is configured as **Central (no legacy)** mode as part of this flow — no sync URL is needed.
5. After initialisation, the user logs in with the generated credentials and can begin creating stores, importing data, etc.

### Describe alternatives you've considered

- **yaml-only configuration**: Require the admin to set `override_is_central_server: true` in the yaml and manually create an admin user via the database. Works but is not user-friendly and error-prone.
- **CLI setup command**: A command-line tool to initialise as central. More accessible than yaml but still requires terminal access.

### Additional context

This issue is a prerequisite for the central data import/export feature. Related issues:

- **Issue #12**: Restrict editing central configs in mixed OMS + Legacy mode & define No Legacy Central server configuration — defines the modes and guards that depend on this initialisation flow.
- **Issue #00**: General import/export pattern — the overall framework that this unblocks for standalone central servers.

### Acceptance Criteria

- [ ] Initialisation screen offers an "Initialise as Central Server" option
- [ ] Selecting it auto-creates an admin user with all necessary permissions
- [ ] A password is auto-generated and displayed to the user once
- [ ] Permissions work without a store context (either non-store permissions or auto-created Central Config store)
- [ ] Server is configured as Central (no legacy) mode — no sync URL required
- [ ] User can log in with the generated credentials and access the admin UI
- [ ] Existing sync-based initialisation flow is unaffected

### Moneyworks Jobcode

OMS:DFGEN
