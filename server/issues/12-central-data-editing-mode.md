---
name: Feature request
about: Suggest an idea for this project
title: "Import/Export: Restrict editing central configs in mixed OMS + Legacy mode & define No Legacy Central server configuration"
labels: enhancement, needs triage
type: feature
assignees: ""
---

## Is your feature request related to a problem? Please describe

The import/export feature (see parent issue) allows bulk editing of central data (items, names, stores, master lists, units, etc.). However, when Open mSupply runs alongside a **legacy mSupply central server**, edits to central data in OMS could conflict with the legacy central — which is the source of truth for that data.

Currently, `CentralServerConfig` determines whether a server is central or remote, and the `EditCentralData` permission gates mutations. But there is no distinction between:

1. **Mixed mode** — OMS central running alongside a legacy mSupply 4D central server (legacy is source of truth for central data)
2. **No Legacy mode** — OMS central running standalone as the sole central server (OMS is source of truth)

In mixed mode, central data like items, names, stores, and master lists flow from the legacy central via sync. Allowing users to edit this data via import in OMS would create conflicts and data inconsistencies when the next sync occurs.

## Describe the solution you'd like

### 1. Define a new configuration state for "No Legacy Central"

Extend `CentralServerConfig` (or add a parallel setting) to distinguish between:

| Mode | Description | Central data editable in OMS? |
|---|---|---|
| **Remote** | OMS remote site syncing to a central | No — data comes from central |
| **Central (mixed/legacy)** | OMS central running alongside legacy mSupply central | No — legacy central is source of truth for central data (items, names, stores, master lists, units). OMS-only data may still be editable |
| **Central (no legacy)** | OMS central running standalone, no legacy mSupply | Yes — OMS is the sole source of truth |

### 2. Guard the import/export of central data tables

The following tables should only be importable when running in **Central (no legacy)** mode:

- `item`
- `name`
- `store`
- `unit`
- `master_list`
- `master_list_line`
- `master_list_name_join`
- `name_store_join`
- `item_store_join`
- `user` (synced from legacy central)
- `user_permission` (synced from legacy central)

**Export should always be allowed** regardless of mode — it's read-only and useful for auditing.

### 3. Configuration mechanism

The mode should be set during server initialisation. See **Issue #13 — Initialise as Central Server** for the UI flow that allows a user to initialise OMS as a standalone central server (no legacy). This sets the server into Central (no legacy) mode automatically.

For servers already initialised via the sync-based flow (mixed mode), the mode is determined by the existing sync relationship with a legacy mSupply central.

### 4. User-facing behaviour

- In **mixed mode**: Import buttons/endpoints for central data tables should be **disabled or hidden**. If called via API, return a clear error: "Central data import is not available when running alongside a legacy mSupply central server."
- In **no legacy mode**: Import and export both available.
- The mode should be visible somewhere in the admin UI so users understand why import is restricted.

### Describe alternatives you've considered

- **Rely solely on `EditCentralData` permission**: This gates who can edit, but not whether editing is safe given the server's sync topology. A user with `EditCentralData` in mixed mode could still create conflicts.
- **Per-table sync direction flags**: More granular but significantly more complex to configure and reason about.
- **Block at sync level**: Allow edits but discard them during sync if they conflict with legacy data. This is fragile and confusing for users.

### Additional context

This is a prerequisite for the central data import/export feature. Without this guard, importing data on a mixed-mode central server would cause sync conflicts with the legacy mSupply central.

The existing `CentralServerConfig` enum (`NotConfigured`, `IsCentralServer`, `CentralServerUrl`, `ForcedCentralServer`) and the `EditCentralData` permission type provide the foundation to build on.

Related:
- The `msupply_central_site_id` field in `SiteInfoV5` identifies the legacy central — its presence (and whether it differs from the current site) could help determine the mode.
- **Issue #13 — Initialise as Central Server**: Defines the UI flow for setting up a standalone OMS central, which is how a server enters "Central (no legacy)" mode.

### Acceptance Criteria

- [ ] A configuration mechanism exists to distinguish "no legacy central" from "mixed mode central"
- [ ] Central data import endpoints are blocked in mixed mode with a clear error message
- [ ] Central data export is always available regardless of mode
- [ ] The current mode is visible in the admin UI
- [ ] Existing `EditCentralData` permission continues to work as before (this is additive, not a replacement)
- [ ] Documentation updated to explain the configuration

### Moneyworks Jobcode

OMS:DFGEN
