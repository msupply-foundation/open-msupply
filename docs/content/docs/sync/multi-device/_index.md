+++
title = "Multi-device sites"
weight = 45
sort_by = "weight"
template = "docs/section.html"
+++

# Multi-device sites {#multi-device-sites}

A **multi-device site** lets several devices sync as the **same site**. They share one token, and the usual "one device per site" hardware check is skipped. A multi-device site syncs only a restricted set of tables — cold-chain monitoring is the main use case — so stock and ordering data stays behind.

It's turned on from the central server, under Manage → Sites.

The flag lives in two places:

- **Central** — the authoritative `site.is_multi_device` column (toggled on or off from the UI).
- **Remote** — a remote has no `site` row for itself, so each sync it reads `is_multi_device_site` from the `site_status` endpoint and caches it in `key_value_store` as `SettingsSyncSiteIsMultiDevice`.

## Allowed tables {#allowed-tables}

Each table's sync style carries a `multi_device_site: bool` flag that acts as an **allowlist**: a table syncs to a multi-device site only if its flag is `true`. Any new table defaults to `false` until someone explicitly opts it in. For the full per-table breakdown, see the [Sync styles reference](../sync_styles/).

```rust
TemperatureLog => SyncStyle {
    authoring: vec![Remote],
    distribution: vec![D::Remote],
    transport: V5,
    multi_device_site: true,   // opt in to sync to multi-device sites
},
```

If an allowed table has changelog foreign-key parents, those parents must be allowed too — otherwise integration hits a foreign-key error when a child record arrives without its parent. The `multi_device_synced_tables_include_fk_parents` test enforces this and flags any table that's been missed.

## Device authentication {#authentication}

A device authenticates like any V7 site: name + password to `get_token`, then a bearer token plus `hardware-id`/`app-version` headers. On a multi-device site, `get_token` skips the single-device guards — instead of rejecting a device once a token exists (`TokenAlreadyAllocated`), it returns the site's **existing token** so every device shares one, and it skips the hardware-id check too (the per-site equivalent of `relax_hardware_id_token_checks`). The stored `hardware_id` updates to the latest device on each login, so any device with the site's credentials can sync.

```rust
// Multi device is the per-site equivalent of the relax flag.
let skip_guards = relax_checks || site.is_multi_device;
if !skip_guards && site.token.is_some() {
    return Err(SyncError::TokenAlreadyAllocated);
}
// Multi device sites share a token: reuse the existing one, else mint a new one.
let token = match (site.is_multi_device, site.token.clone()) {
    (true, Some(existing)) => existing,
    _ => util::uuid::uuid(),
};
```

## Multi-device sync {#multi-device-sync}

The remote reads its cached flag and swaps the changelog filters:

- **Push** — `all_data_edited_on_multi_device_site`: own records, restricted to allowed tables.
- **Pull** — `multi_device_all_data_for_site`: allowed tables, and **drops the anti-circular `source_site_id != site_id` filter** so a record one device pushed still relays to the site's other devices (they share a `site_id`).

Integration rejects any non-allowed row (`NonMultiDeviceDataOnMultiDeviceSite`) as a backstop:

```rust
if is_multi_device && !sync_style.multi_device_site {
    return Err(ValidationError::NonMultiDeviceDataOnMultiDeviceSite);
}
```

## Turning it off {#turning-off}

Turning multi-device off returns the site to a single device syncing the full table set. It doesn't clear the token or hardware-id, so the site keeps working — but only the device whose `hardware_id` is currently stored on central can still sync. The other devices are locked out, and initialising a fresh device errors (central reports the site as already registered). To hand over to a different device, central can reset the `hardware_id`.

> **Note.** A remote refreshes its cached SettingsSyncSiteIsMultiDevice flag only when it syncs. After multi-device is turned off, the retained device keeps syncing and picks up the new value; the other devices stop syncing, so they keep their previous cached value.
