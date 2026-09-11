# Cold chain — Sensors — build report

Built from [`spec/cold-chain-sensors/`](../../../spec/cold-chain-sensors/) per [`spec/IMPLEMENTING.md`](../../../spec/IMPLEMENTING.md).

**Target stack:** SolidJS + Vite, with the shared component library in [`src/ui/`](../../ui/), resolved through the roles in [`spec/ui-standards/components.md`](../../../spec/ui-standards/components.md).

One routed screen (the list) and one modal over it, plus its save confirmation. No create, no delete, no detail view — devices register themselves through the cold-chain API, and retirement is the active flag.

## Anchor coverage

`listState` = `list/listState.test.ts` · `sensorEdit` = `list/sensorEdit.test.ts` · `sensorDisplay` = `list/sensorDisplay.test.ts` · `access` = `access.test.ts` · `volume` = `src/domain/location/volume.test.ts` (the shared picker's own tests, where this field's behaviour lives). **live** = driven through the built screen against a real `remote_server` (v3.02.00) on seeded data — see [Live verification](#live-verification).

Anchors are `OMS-REG-CCE-03.<n>` — the behaviours of [`spec/cold-chain-sensors/cases/`](../../../spec/cold-chain-sensors/cases/). The `AC-*` criteria this vertical was built from were folded into that case; [`acceptance.md`](../../../spec/cold-chain-sensors/acceptance.md) holds the retired-ID mapping.

| Behaviour                                                        | Covered by                                                                                                           |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **.1** store scope                                               | `listState` — storeId sent, no filter key can widen it; **live**                                                     |
| AC-S2 _(retired)_ another store                                  | _server-owned_ — see [exemptions](#exempt-but-listed)                                                                |
| AC-S3 _(retired)_ no such sensor                                 | _server-owned_ — see [exemptions](#exempt-but-listed)                                                                |
| **.14** default order                                            | `listState`; **live** (serial ↓ on arrival)                                                                          |
| **.3** / **.4** sortable set                                     | `listState` — `SORTABLE_KEYS` is exactly name + serial, and the columns read it; **live**                            |
| AC-L3 _(retired)_ name filter honoured, unsurfaced               | `listState`                                                                                                          |
| **.15** type filter                                              | `listState`; **live**                                                                                                |
| **.16** location filter                                          | `listState`; **live**                                                                                                |
| **.17** serial filter                                            | `listState`; **live**                                                                                                |
| **.18** active-only default                                      | `listState`; **live**                                                                                                |
| **.19** revealing inactive                                       | `listState` — sends no `isActive`, never `false`; **live**                                                           |
| **.20** empty state                                              | `listState` (empty chips never query as blanks); **live** (`nothing-here`)                                           |
| AC-L10 _(retired)_ page ≥ 1 row                                  | `listState` (client never sends < 1); server rejection _server-owned_                                                |
| **.17** exact serial finds nothing                               | `listState` — the screen only ever sends `like`                                                                      |
| **.21** / **.22** who may be renamed                             | `sensorEdit`, all four kinds; **live** (Berlinger enabled, mSupply disabled)                                         |
| **.23** rename lands                                             | `sensorEdit` (input shape); **live** (saved, list refreshed)                                                         |
| **.24** names are not unique                                     | `sensorEdit`                                                                                                         |
| **.25** / **.26** confirm follows the draft                      | `sensorEdit`, both directions; **live**                                                                              |
| **.27** confirmation before the write                            | **live** — `confirmation-modal` with the specified copy                                                              |
| **.28** dismiss discards                                         | `sensorEdit` (nothing built until confirm); **live**                                                                 |
| **.29** picker offers this store only                            | **live** — three store locations offered, another store's absent                                                     |
| **.11** / **.12** / **.13** assign                               | `sensorEdit` (`{value: id}`); **live**                                                                               |
| **.30** clear                                                    | `sensorEdit` (`{value: null}`, never omitted); **live**                                                              |
| **.31** placing attributes an unattributed history               | **live** — the sensor's existing, unplaced reading re-pointed at the new location                                    |
| **.51** a move leaves the attributed record                      | _found by the deterministic suite_ — the re-pointing is guarded on a null location (contract § assigning a location) |
| **.32** clearing does not                                        | **live** — the reading stayed on the old location                                                                    |
| **.33** / **.34** activity trail, both ways                      | **live** — two `SENSOR_LOCATION_CHANGED` rows with from/to                                                           |
| **.35** / **.36** picker shows % used, offers no fullness filter | `volume` — a suppressed filter narrows nothing; **live** — `0% used` per option, no `location-fullness-*` control    |
| **.10** device values read-only                                  | `sensorEdit` (draft holds three keys); **live** (a11y tree: no inputs for them)                                      |
| **.37** a save moves neither battery nor interval                | `sensorEdit` — the writable surface is four keys and no more                                                         |
| **.52** a save carries only what changed                         | `sensorEdit` — a sparse patch, one case per field; e2e (a concurrent move survives an unrelated save)                |
| **.38** serial trimmed                                           | `sensorDisplay`; **live**                                                                                            |
| **.39** / **.40** retire and restore                             | `sensorEdit`; **live**, both directions                                                                              |
| **.41** nothing deletes a sensor                                 | _structural_ — no delete operation exists in the schema, so none is built; **live** (no affordance on list or modal) |
| **.42** / **.43** latest reading, incl. a genuine 0              | `sensorDisplay`; **live**                                                                                            |
| **.44** / **.45** ongoing breach only                            | `sensorDisplay`; **live** (open breach shows, ended one does not)                                                    |
| **.46** / **.47** equipment at the location                      | `sensorDisplay`; **live**                                                                                            |
| **.48** excursion reads as cold consecutive                      | `sensorDisplay`                                                                                                      |
| **.49** hand-off opens the editor                                | **live** — `?edit=<id>` opened it, pre-loaded                                                                        |
| **.50** hand-off is single-use                                   | **live** — param stripped; a re-render did not re-open it                                                            |
| AC-G1 _(retired)_ read permission withheld                       | `access` — nav entry absent, route `denied`; server refusal _server-owned_                                           |
| AC-G2 _(retired)_ change permission withheld                     | _server-owned_ — the client has no separate gate for it                                                              |
| AC-G3 _(retired)_ unauthenticated                                | _owned by [`startup/`](../../../spec/startup/)_ — the shared auth path, not this vertical                            |
| AC-G4 _(retired)_ both permissions held                          | `access`; **live** (the whole screen)                                                                                |
| Flow — name and place an arrival                                 | **live** — hand-off → rename → assign → confirm, and the readings followed                                           |
| Flow — move to another fridge                                    | **live** — assign, re-attribution, activity trail                                                                    |
| Flow — retire and bring back                                     | **live**                                                                                                             |
| Flow — discard an edit                                           | `sensorEdit`; **live**                                                                                               |

### Exempt but listed

- **AC-S2, AC-S3, AC-L10, AC-G2** (all retired into rules/contract, not behaviours — [mapping](../../../spec/cold-chain-sensors/acceptance.md)) — a server rejection with no client path to reach it. The list only ever shows the active store's sensors, so the UI cannot address another store's sensor or a non-existent id, and it never sends a page below one. Each was fired directly at the running server during the reverse-spec pass and is recorded in [`contract.md`](../../../spec/cold-chain-sensors/contract.md#the-error-union-is-decorative); none has a colocated test because there is nothing in this code to exercise.
- **AC-G3** (retired; owned by startup) — unauthenticated access is the shared startup gate, covered by that vertical.
- **`.36`** — that the fullness tabs are not _rendered_ needs a rendered widget, and vitest here runs in the node environment with no DOM and no component-render harness at all, so no colocated test can hold it. Its consequence is held instead: `visibleLocations` proves a suppressed filter narrows nothing, which is the half that fails invisibly. The render half is live-verified and owed to the e2e suite, which already contracts `location-fullness-*` ids for it.

## Flags

### Spec gaps hit

Two gaps this build hit have since been closed on the spec branch and are no
longer listed: `ui-surface.md`'s self-contradiction over which columns take a
dash (closed by the merge of `41ee52b7`, which made the note read 6–7 and put
Date time with the blanks — what this build already rendered), and its naming of
the current app's **Remove** entry rather than the clearing affordance the role
owns (closed by `b51d78d5`). This list holds the gaps that still stand.

1. **A genuine 0 °C reading is unspecified.** `.43` covers a sensor that has _never_ reported; it does not say what a real reading of exactly 0 shows. Built to show `0°C` — see [deliberate differences](#deliberate-differences-from-the-current-app).
2. **The active-only control's placement is not reproducible as written.** `ui-surface.md` puts it at the toolbar's trailing end; in this library that end is the table's own control cluster (Columns · Settings · full screen), which a vertical does not compose into. It is rendered at the trailing end of the **filter region** instead — the same bar, inside the slot a vertical owns.

### `⚠️ VERIFY` items encountered

None — the spec carries no `⚠️ VERIFY` markers.

### C2 (real-backend) status

**Met for every anchor with a client path.** Unusually for a build here, the whole vertical was driven against a real `remote_server` on seeded data rather than covered at the logic level alone (see [Live verification](#live-verification)). The remaining server-only anchors are the [exemptions](#exempt-but-listed) above.

### Shared code changed

Two changes in `src/domain/location`, both reaching past this vertical:

- **`LocationVolumeSelect` gains `fullnessFilter`**, default `true`. Additive
  and defaulted, so its four existing consumers (stocktakes ×2, inbound ×2) are
  untouched; this field passes `false`. The registry entry moved with it — the
  fullness filter is documented as suppressible rather than always-on, for the
  case where a field references a location without placing stock in it; that
  wording rides the spec commit, not this one. The gate itself is the pure
  `visibleLocations` (`./volume`), so it is unit-tested beside the filter it
  suppresses rather than asserted through the widget.
- **Both location queries now sort by name.** `ui-surface.md` S2 asks for "the
  active store's locations, ordered by name", and the current app sorts them
  explicitly — but `location.graphql` sent no `sort`, and absent one the server
  orders by `id`, a UUID (`repository/src/db_diesel/location.rs`). Every
  location picker in this app was therefore listing in an order no user can
  read. Fixed at the query rather than in this one field, because no caller
  wants the other behaviour: it also reorders the stocktake, inbound and
  stock-movement pickers, each toward the current app. Query strings only — no
  generated type moved, so nothing downstream had to change.

### Registry roles used

All built (no ⛔ roles): data table (list) · filter bar · empty state · list pagination · switch · short text · labelled field row · read-only labelled value · location lookup (volume-aware, fullness filter suppressed) · modal dialog · confirmation dialog · modal footer buttons · inline status marker.

### Deliberate differences from the current app

Each follows the spec rather than the reference screen, and each is worth a reviewer's eye:

- **A 0 °C reading shows as `0°C`, not as "no reading".** The current app gates
  the cell on a truthiness check (`!!temperature`), so a genuine zero renders as
  its absent-value dash — on both the list and the editor. Confirmed live on both
  front ends, side by side, against the same sensor (a stored reading of `0.0`).
  Worth filing against the current app in its own right: 0 °C is the reading a
  cold-chain user least wants silently hidden.
- **A location with no capacity recorded shows nothing, not `-% used`.** The
  shared picker renders an empty label where the percentage is undefined, which
  is the house treatment for an absent value and is consistent across every
  screen that uses it. The current app prints a dash beside the words "% used".
- **The device kind reads `LogTag` everywhere.** The current app labels the column by enum-casing the wire value ("Log Tag") while its own type filter offers "LogTag" — the same kind under two names on one screen. This build uses `label.log-tag` for both, as `ui-surface.md` specifies.

## Live verification

Driven with Playwright against this build on a dev server proxied to a real `remote_server` (v3.02.00, sqlite), on the seeded `rspec-*` sensors, locations, readings, breaches and equipment. Both screens, every filter, sort, the active-only toggle, the editor for a device-named and a user-named kind, the confirmation, four real saves, and the arrival hand-off. **No console or page errors at any point.**

Accessibility (C4) checked from the rendered tree, not the DOM: the list is a real `table`/`row`/`columnheader` structure; the toggle is `switch [checked]`; the modal is `dialog "Sensor details"` with a labelled textbox, combobox and switch, and `OK [disabled]` while the draft is unchanged. The breach cell reads `img "Hot Consecutive"` beside the text "Consecutive" — the tone never carries the meaning alone.

## Implementation notes worth a reviewer's eye

- **The list's resource is read through `gated()`, not `.latest`.** Both put the
  table's own loading treatment on screen instead of blanking the page, but
  `.latest` still suspends on the _first_ pending read — which is precisely this
  screen's arrival. `gated()` is the canonical spelling of the read-safety gate
  ([`src/api/gated.ts`](../../api/gated.ts)) and provably never suspends. The
  location picker's options are read the same way, because they first fetch when
  the modal opens — a remount there would reset the form.
- **The arrival hand-off is a `createEffect`, not a memo.** Opening the modal and
  rewriting the address are side effects, not a derived value. It settles:
  clearing the parameter re-runs the effect once and the re-run returns
  immediately.

## Follow-ups

- ~~**`e2e/TESTIDS.md` owes a Sensors section**~~ — written with the deterministic suite (`e2e/specs/cold-chain-sensors-regression.spec.ts`), which also added `sensor-location-input-clear` (derived on the shared Combobox's clear button, so every field built on it gets one). The screen-specific ids this build places: `sensor-edit-modal`, `sensor-name-input`, `sensor-location-input`, `sensor-active-toggle`, `active-only-toggle`. Everything else is shared — `header-<col>` / `cell-<col>` over the column ids `name`, `status`, `cce`, `location`, `serial`, `battery`, `lastReading`, `lastRecording`, `sensorType`, `breach`; `filter-input-serial` / `filter-input-locationCode` / `filter-input-type`; `nothing-here`; `dialog-button-ok` / `dialog-button-cancel`; `confirmation-modal` / `confirmation-modal-ok`.
- **Header tooltips do not render yet.** Both descriptive columns declare their text through `meta.description` (`description.last-reading-datetime`, `description.breach-type`), which is where a column declares it; the header-cell tooltip render is an open host follow-up, not this vertical's.
- Blocked on no shared component.
