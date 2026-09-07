# Cold chain — Sensors — build report

Built from [`spec/cold-chain-sensors/`](../../../spec/cold-chain-sensors/) per [`spec/IMPLEMENTING.md`](../../../spec/IMPLEMENTING.md).

**Target stack:** SolidJS + Vite, with the shared component library in [`src/ui/`](../../ui/), resolved through the roles in [`spec/ui-standards/components.md`](../../../spec/ui-standards/components.md).

One routed screen (the list) and one modal over it, plus its save confirmation. No create, no delete, no detail view — devices register themselves through the cold-chain API, and retirement is the active flag.

## Anchor coverage

`listState` = `list/listState.test.ts` · `sensorEdit` = `list/sensorEdit.test.ts` · `sensorDisplay` = `list/sensorDisplay.test.ts` · `access` = `access.test.ts`. **live** = driven through the built screen against a real `remote_server` (v3.02.00) on seeded data — see [Live verification](#live-verification).

| AC                                                  | Covered by                                                                                                           |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **AC-S1** store scope                               | `listState` — storeId sent, no filter key can widen it; **live**                                                     |
| **AC-S2** another store                             | _server-owned_ — see [exemptions](#exempt-but-listed)                                                                |
| **AC-S3** no such sensor                            | _server-owned_ — see [exemptions](#exempt-but-listed)                                                                |
| **AC-L1** default order                             | `listState`; **live** (serial ↓ on arrival)                                                                          |
| **AC-L2** sortable set                              | `listState` — `SORTABLE_KEYS` is exactly name + serial, and the columns read it; **live**                            |
| **AC-L3** name filter honoured, unsurfaced          | `listState`                                                                                                          |
| **AC-L4** type filter                               | `listState`; **live**                                                                                                |
| **AC-L5** location filter                           | `listState`; **live**                                                                                                |
| **AC-L6** serial filter                             | `listState`; **live**                                                                                                |
| **AC-L7** active-only default                       | `listState`; **live**                                                                                                |
| **AC-L8** revealing inactive                        | `listState` — sends no `isActive`, never `false`; **live**                                                           |
| **AC-L9** empty state                               | `listState` (empty chips never query as blanks); **live** (`nothing-here`)                                           |
| **AC-L10** page ≥ 1 row                             | `listState` (client never sends < 1); server rejection _server-owned_                                                |
| **AC-L11** exact serial finds nothing               | `listState` — the screen only ever sends `like`                                                                      |
| **AC-N1 / AC-N2** who may be renamed                | `sensorEdit`, all four kinds; **live** (Berlinger enabled, mSupply disabled)                                         |
| **AC-N3** rename lands                              | `sensorEdit` (input shape); **live** (saved, list refreshed)                                                         |
| **AC-N4** names are not unique                      | `sensorEdit`                                                                                                         |
| **AC-E1 / AC-E2** confirm follows the draft         | `sensorEdit`, both directions; **live**                                                                              |
| **AC-E3** confirmation before the write             | **live** — `confirmation-modal` with the specified copy                                                              |
| **AC-E4** dismiss discards                          | `sensorEdit` (nothing built until confirm); **live**                                                                 |
| **AC-P1** picker offers this store only             | **live** — three store locations offered, another store's absent                                                     |
| **AC-P2** assign                                    | `sensorEdit` (`{value: id}`); **live**                                                                               |
| **AC-P3** clear                                     | `sensorEdit` (`{value: null}`, never omitted); **live**                                                              |
| **AC-P4** assignment re-attributes history          | **live** — the sensor's existing reading re-pointed at the new location                                              |
| **AC-P5** clearing does not                         | **live** — the reading stayed on the old location                                                                    |
| **AC-P6 / AC-P7** activity trail, both ways         | **live** — two `SENSOR_LOCATION_CHANGED` rows with from/to                                                           |
| **AC-V1** device values read-only                   | `sensorEdit` (draft holds three keys); **live** (a11y tree: no inputs for them)                                      |
| **AC-V2** a save moves neither battery nor interval | `sensorEdit` — the input carries four keys and no more                                                               |
| **AC-V3** serial trimmed                            | `sensorDisplay`; **live**                                                                                            |
| **AC-A1 / AC-A2** retire and restore                | `sensorEdit`; **live**, both directions                                                                              |
| **AC-A3** nothing deletes a sensor                  | _structural_ — no delete operation exists in the schema, so none is built; **live** (no affordance on list or modal) |
| **AC-D1 / AC-D2** latest reading, incl. a genuine 0 | `sensorDisplay`; **live**                                                                                            |
| **AC-D3 / AC-D4** ongoing breach only               | `sensorDisplay`; **live** (open breach shows, ended one does not)                                                    |
| **AC-D5 / AC-D6** equipment at the location         | `sensorDisplay`; **live**                                                                                            |
| **AC-D7** excursion reads as cold consecutive       | `sensorDisplay`                                                                                                      |
| **AC-I1** hand-off opens the editor                 | **live** — `?edit=<id>` opened it, pre-loaded                                                                        |
| **AC-I2** hand-off is single-use                    | **live** — param stripped; a re-render did not re-open it                                                            |
| **AC-G1** read permission withheld                  | `access` — nav entry absent, route `denied`; server refusal _server-owned_                                           |
| **AC-G2** change permission withheld                | _server-owned_ — the client has no separate gate for it                                                              |
| **AC-G3** unauthenticated                           | _owned by [`startup/`](../../../spec/startup/)_ — the shared auth path, not this vertical                            |
| **AC-G4** both permissions held                     | `access`; **live** (the whole screen)                                                                                |
| **AC-F1** name and place an arrival                 | **live** — hand-off → rename → assign → confirm, and the readings followed                                           |
| **AC-F2** move to another fridge                    | **live** — assign, re-attribution, activity trail                                                                    |
| **AC-F3** retire and bring back                     | **live**                                                                                                             |
| **AC-F4** discard an edit                           | `sensorEdit`; **live**                                                                                               |

### Exempt but listed

- **AC-S2, AC-S3, AC-L10 (server half), AC-G2** — a server rejection with no client path to reach it. The list only ever shows the active store's sensors, so the UI cannot address another store's sensor or a non-existent id, and it never sends a page below one. Each was fired directly at the running server during the reverse-spec pass and is recorded in [`contract.md`](../../../spec/cold-chain-sensors/contract.md#the-error-union-is-decorative); none has a colocated test because there is nothing in this code to exercise.
- **AC-G3** — unauthenticated access is the shared startup gate, covered by that vertical.

## Flags

### Spec gaps hit

1. **`ui-surface.md` contradicts itself on the absent-value treatment.** Column 8 (Date time) says "blank when there is none", while the note under the table says columns **6–8** carry a dash. Built to the per-column rows (battery and last reading dash, date time blank), which is also what the current app does. The note should read 6–7.
2. **`ui-surface.md` under-transcribes the location option.** It records the
   option as `<code> - <name>` and the Remove entry, but not the `% used` suffix
   the current app also renders there. The suffix is a consequence of that app
   reaching for the volume-aware picker, and the spec's choice of the plain role
   is the right answer to it — but the surface should say the option carries the
   code and name **and nothing else**, so the difference is a stated one rather
   than a surprise to anyone comparing screens.
3. **`ui-surface.md` names the current app's clearing mechanism, not a role.** It says a **Remove** entry (`label.remove`) at the foot of the location list clears the assignment. That is one library's implementation; the registry's Location lookup clears with its own affordance, which is what this build uses. The behaviour (AC-P3) is unaffected. The surface should say the assignment is clearable and leave the affordance to the role.
4. **A genuine 0 °C reading is unspecified.** AC-D2 covers a sensor that has _never_ reported; it does not say what a real reading of exactly 0 shows. Built to show `0°C` — see [deliberate differences](#deliberate-differences-from-the-current-app).
5. **The active-only control's placement is not reproducible as written.** `ui-surface.md` puts it at the toolbar's trailing end; in this library that end is the table's own control cluster (Columns · Settings · full screen), which a vertical does not compose into. It is rendered at the trailing end of the **filter region** instead — the same bar, inside the slot a vertical owns.

### `⚠️ VERIFY` items encountered

None — the spec carries no `⚠️ VERIFY` markers.

### C2 (real-backend) status

**Met for every anchor with a client path.** Unusually for a build here, the whole vertical was driven against a real `remote_server` on seeded data rather than covered at the logic level alone (see [Live verification](#live-verification)). The remaining server-only anchors are the [exemptions](#exempt-but-listed) above.

### Registry roles used

All built (no ⛔ roles): data table (list) · filter bar · empty state · list pagination · switch · short text · labelled field row · read-only labelled value · location lookup (plain) · modal dialog · confirmation dialog · modal footer buttons · inline status marker.

### Deliberate differences from the current app

Both follow the spec rather than the reference screen, and both are worth a reviewer's eye:

- **A 0 °C reading shows as `0°C`, not as "no reading".** The current app gates
  the cell on a truthiness check (`!!temperature`), so a genuine zero renders as
  its absent-value dash — on both the list and the editor. Confirmed live on both
  front ends, side by side, against the same sensor (a stored reading of `0.0`).
  Worth filing against the current app in its own right: 0 °C is the reading a
  cold-chain user least wants silently hidden.
- **The location picker shows no "% used".** The current app reaches for the
  volume-aware picker here, so every option carries a capacity figure — and on
  locations with no volume recorded that renders as `-% used`, a dash where a
  number should be, on a field where capacity is irrelevant anyway. The registry's
  placement test decides it: a sensor merely _references_ a location, it does not
  put stock in one, so the **plain** lookup is the role — which is what
  `ui-surface.md` names. Options read `<code> — <name>` and stop there.
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

- **`e2e/TESTIDS.md` owes a Sensors section**, written with the suite (the registry's sections cite their driving spec). The screen-specific ids this build places: `sensor-edit-modal`, `sensor-name-input`, `sensor-location-input`, `sensor-active-toggle`, `active-only-toggle`. Everything else is shared — `header-<col>` / `cell-<col>` over the column ids `name`, `status`, `cce`, `location`, `serial`, `battery`, `lastReading`, `lastRecording`, `sensorType`, `breach`; `filter-input-serial` / `filter-input-locationCode` / `filter-input-type`; `nothing-here`; `dialog-button-ok` / `dialog-button-cancel`; `confirmation-modal` / `confirmation-modal-ok`.
- **Header tooltips do not render yet.** Both descriptive columns declare their text through `meta.description` (`description.last-reading-datetime`, `description.breach-type`), which is where a column declares it; the header-cell tooltip render is an open host follow-up, not this vertical's.
- Blocked on no shared component.
