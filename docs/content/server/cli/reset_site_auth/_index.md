+++
title = "Reset Site Auth"
weight = 30
sort_by = "weight"
template = "docs/section.html"

[extra]
source = "code"
+++

# Reset Site Auth

The `reset-site-auth` cli command clears the sync **token** and/or **hardware id** for one or
more sites. It mirrors the "reset token" / "reset hardware id" actions available in the central
server's site admin UI, for cases where the UI isn't convenient (e.g. automated testing, resetting many sites at
once, or from a terminal during support).

- **Clearing the token** invalidates a site's stored auth, forcing it to re-authenticate on its
  next sync.
- **Clearing the hardware id** lets a site sync from a different machine (the hardware id is
  re-recorded on its next sync).

`NOTE` This command **only runs on a central server**, where the `site` table holds the
downstream sites' tokens and hardware ids. It aborts unless `server.override_is_central_server`
is set in the configuration `.yaml`.

For the full cli argument list and up to date description please run the command with just
`--help`.

### Usage

Target sites by name with `--site-names` (comma-separated; names are matched **exactly**,
case-sensitive, and may contain spaces). Choose what to clear with `--token` and/or
`--hardware-id` — at least one is required; pass both to clear both.

```
# In development
cargo run --bin remote_server_cli --features postgres -- \
  reset-site-auth --site-names "Site A,Site B" --token --hardware-id

# In production
omSupply-cli reset-site-auth --site-names "Site A,Site B" --token --hardware-id

# Reset just the token for a single site (short flags: -n, -t)
omSupply-cli reset-site-auth -n "Clinic North" -t

# Reset just the hardware id (-i)
omSupply-cli reset-site-auth -n "Clinic North" -i
```

All names are resolved **before** anything is mutated, so a typo or unknown name aborts the whole
command without clearing any site. Resetting the **current** site's own auth is not allowed and
aborts with an error.

### Options

| Flag | Description |
| --- | --- |
| `-n`, `--site-names` | Comma-separated list of site names to reset (matched exactly, case-sensitive). Names may contain spaces, e.g. `--site-names "Site A,Site B"`. |
| `-t`, `--token` | Reset the sync token. Pass together with `--hardware-id` to reset both. |
| `-i`, `--hardware-id` | Reset the hardware id. Pass together with `--token` to reset both. |

`NOTE` If neither `--token` nor `--hardware-id` is given the command errors — it never defaults to
clearing both.

### Extra

- Each reset is logged at `info` level, naming the site and what was cleared.
- Sites not listed in `--site-names` are left untouched.
