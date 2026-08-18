# e2e reference datafile

Seed data for the deterministic Playwright suites (defined in
[open-msupply-frontend](https://github.com/msupply-foundation/open-msupply-frontend)
under `e2e/`; run against this repo with `yarn e2e:local`).
Restore it into a fresh database with:

```bash
cd server
MSUPPLY_NO_TEST_DB_TEMPLATE=1 cargo run --bin remote_server_cli -- initialise-from-export -n e2e -r
```

`-r` refreshes all dates relative to now and leaves sync disabled. Login:
`Admin` / `pass` (case-insensitive), store `GRY` (Gryffindor District Store,
exported as site 900). Three purpose-built auth-profile users (all `pass`,
for the login/startup suites): `single` (FEAT only — auto-entry), `nostore`
(authenticates but has no store on this site — the no-site-access error),
`limited` (GRY, query-only permissions — permission-denied flows).

## What's in it (and what isn't)

Central-owned **nouns** the remote API cannot create: items, units, reason
options, master lists (+ GRY's joins, so ~23 items are visible), currencies,
users, stores, periods, programs. Plus injected login wiring
(`user_store_join` / `user_permission` — a v7 pull doesn't deliver those) for
Admin on GRY + FEAT and the three auth-profile users above.

Deliberately **no stock, no documents** — store-local state is created through
the GraphQL API by `e2e/specs/data.setup.ts` (in open-msupply-frontend) at suite start
("seed nouns, create verbs"). Don't add stock here; extend the arrange step.

### Fixtures a suite cannot arrange for itself

Some behaviours are only observable against a _gate_ — a permission the user
lacks, or a preference in its other state. Neither can be arranged through the
remote API mid-run: `MutatePreferences` is not granted here, and the suites run
`fullyParallel`, so flipping a global preference would change the UI under
every other suite. They therefore live here.

| Fixture                                            | What it is for                                                       |
| -------------------------------------------------- | -------------------------------------------------------------------- |
| `StockViewer` / `pass` on GRY                      | the reduced-permission user — see below                              |
| 3 active VVM statuses (`Stage1`–`Stage3`)          | so the VVM status picker has something to offer                      |
| `allow_tracking_of_stock_by_donor`, on             | the donor field's on-state (global)                                  |
| `backdating`, shipments + adjustments on, `maxDays` 30 | backdated shipments and adjustments, and the window's bound (global) |
| `E2E Facility Customer`, joined to GRY             | a NON-STORE customer — the outbound received-count / difference columns only appear for one |
| `E2E On-Hold Customer`, joined to GRY              | an on-hold customer, listed but not selectable in the customer picker |
| `manage_vvm_status_for_stock` on GRY               | the outbound line table's VVM-status column                          |
| `manage_vaccines_in_doses` on GRY                  | the outbound line table's doses-per-unit column                      |

**`StockViewer`** holds `StoreAccess`, `StockLineQuery`, `StockLineMutate` and
`LogQuery`. What it _lacks_ is the point: no `InventoryAdjustmentMutate`, no
`CreateRepack`, no `ViewAndEditVvmStatus`. Grant it more and the gated
behaviours it exists for stop being observable.

**`backdating` now has `shipmentsEnabled` true as well as
`inventoryAdjustmentsEnabled`.** It started adjustments-only, deliberately, so
that no shipment-dated suite changed behaviour; the outbound suite's
picked-date (backdating) anchor then needed the shipment half, and because the
preference is `PreferenceType::Global` there is exactly one value to have — a
second store cannot carry a different one, so the two needs share one row.

Both preferences are `PreferenceType::Global` and so apply to every store. One
consequence, now for shipments as well as adjustments: with backdating enabled,
"rejected because backdating is disabled" is no longer observable here.

**The two extra customers are non-store `FACILITY` names** joined to GRY, which
is what makes them usable as outbound customers. `E2E Facility Customer` exists
because the received-count and Difference columns are only editable on a
non-store customer's shipment; `E2E On-Hold Customer` carries `on_hold: true`,
so the picker must offer it disabled rather than omit it.

## Format

A v7 `initialise-from-export` file: `sync_buffer_rows` in v7 wire shape
(`data` = translated OMS row JSON), `site_id: 900`, `central_site_id: 6`.
The `central_site_id` field routes integration through the v7 path — see
`InitialisationData` in `server/cli/src/cli.rs`.

## Regenerating

Only needed when reference data must change (new reason types, more items) or
after a sync-schema change. Small edits can be made directly to `export.json`
— it's deliberately reviewable. Full recapture:

1. Run the demo central (postgres `omsupply_central_2_july`, port 8890) with
   `APP__SERVER__OVERRIDE_IS_CENTRAL_SERVER=true` (v7 `get_token` requires
   central mode).
2. The central needs the capture site + store assignment (one-off, already
   done): a `site` row `id=900, name='e2e', sync_version='V7'` whose
   `hashed_password` is bcrypt of sha256("e2e_password"), and store GRY
   (`80004C94…`) with `site_id = 900`.
3. Bootstrap a scratch remote as that site — the trick is pre-setting the
   sync version so the fresh remote speaks v7 (no legacy server involved):

   ```bash
   APP__DATABASE__DATABASE_NAME=oms_e2e_capture APP__DATABASE__PORT=5433 \
     cargo run --bin remote_server_cli --features=postgres -- initialise-database
   APP__DATABASE__DATABASE_NAME=oms_e2e_capture APP__DATABASE__PORT=5433 \
     cargo run --bin remote_server_cli --features=postgres -- migrate
   psql -p 5433 -U postgres -d oms_e2e_capture \
     -c "INSERT INTO key_value_store (id, value_string) VALUES ('SETTINGS_SYNC_VERSION','V7');"
   APP__DATABASE__DATABASE_NAME=oms_e2e_capture APP__DATABASE__PORT=5433 \
     APP__SERVER__PORT=8011 APP__SERVER__BASE_DIR=app_data/e2e_capture \
     APP__SYNC__URL=http://localhost:8890 APP__SYNC__USERNAME=e2e \
     APP__SYNC__PASSWORD_SHA256=8f3e9e24be9af303a8d496d5f5528d3e8c3daa1877dd96297966a9c29928910d \
     APP__SYNC__INTERVAL_SECONDS=60 \
     cargo run --features=postgres   # wait for initialisationStatus INITIALISED, then stop it
   ```

4. Re-emit this folder from the captured buffer:

   ```bash
   python3 client/playwright/scripts/build-e2e-export.py
   ```

5. Round-trip (`initialise-from-export -n e2e -r`) and run the stocktake
   suite before committing the new export.
