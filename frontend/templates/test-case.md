<!--
TEST CASE TEMPLATE — behaviour-anchored format (the tmf-testing format, adopted
here as the single source of truth for a converted vertical's expected
behaviour; cases live in spec/<vertical>/cases/).

Copy this file, rename it `<ID> - <Title>.md`, and fill it in. The rules:

1. FRONTMATTER carries what tooling needs and prose can't:
   - id           the case ID (primary key — assigned once, never reused/renumbered)
   - area         module / workflow the case belongs to
   - status       active | redirect (redirect = consolidated elsewhere, kept so the ID isn't reused)
   - automatable  e2e | partial | manual-only  (so coverage tooling doesn't count
                  manual-only cases as missing an e2e test, and the agent skips what it can't drive)
   - needs        any of: single-store | multi-store | hardware | sync

2. "Expected behaviours (source of truth)" is CANONICAL. Deterministic tests
   (Playwright `covers` annotations, colocated vitest describes) and
   exploratory probes anchor to the behaviour sub-IDs (`<ID>.1`, `<ID>.2`, …).
   - Sub-IDs are primary keys too: assigned once, never reused, never renumbered.
     Insert new ones at the next free number wherever they read best — gaps and
     out-of-order numbers are fine (identity, not order).
   - ONE observable outcome per bullet. Split compounds joined by "and"/";".
   - State the OUTCOME, not the clicks. Use "condition → outcome" when conditional.
   - Keep it dataset-agnostic (placeholders, not specific SKUs).
   - Rewording the prose must NOT change the sub-ID.
   - PRECISION LIVES IN rules.md / contract.md, not here: the exact rejection
     conditions, typed errors, algorithms, and wire semantics belong to the
     vertical's rules.md (domain terms) and contract.md (wire mapping). A
     bullet is the testable outcome anchor; when folding richer prose into a
     case, move any precision the rules don't already state into rules.md
     first — never delete precision into a one-liner.

3. "Flows" is COMPOSITION, not expectation: the end-to-end sequences a user
   performs, each naming the behaviours that verify it. Two hard rules keep
   flows inert to automated testing:
   - Flows carry NO IDs of their own and define NO expected outcomes — tests
     and probes must never anchor to a flow.
   - Flows cite behaviours in the plain `` `.n` `` form, NEVER the `**.n**`
     token — the guard parses `**.n**` anywhere in the file as a live
     behaviour definition, so a flow using it would mint a phantom anchor.

4. PENDING behaviours (specced ahead of the implementation): end the bullet
   with `(pending: <ticket/issue>)`. Pending means "specced, not yet expected
   in the app under test": the exploratory agent must NOT report its absence
   as a finding, and coverage tooling shows it as specced-not-implemented
   rather than a gap. REMOVE the marker when the feature ships (a one-line PR,
   owned by closing the ticket). A stale marker is a blind spot: it suppresses
   regression findings for a behaviour that now exists.

5. RETIRING a behaviour: do NOT delete the bullet (that frees the number for
   accidental reuse and orphans anything anchored to it). Move it under a
   "## Retired behaviours" tombstone section (see the example below). This
   keeps the number reserved forever, stops it being a valid anchor (so
   probes/tests pointing at it fail and get repointed), and mirrors
   `status: redirect` at the case level. The anchor guard
   (`exploratory/tools/check_anchor_refs.py`) enforces both: a tombstoned ID
   can't be reused by a live `**.n**`, and a tombstone must use the `` `.n` ``
   form (never the `**.n**` anchor token). Omit the section entirely if
   nothing has been retired.

6. "Test Steps (manual walkthrough — reference only)" is an AID that may
   drift. It is NOT the source of truth — the behaviours are. Update it
   without ceremony.

Delete this comment block when you copy the template.
-->

---
id: OMS-REG-EXAMPLE-01
area: Example / Area
status: active
automatable: e2e          # e2e | partial | manual-only
needs: [single-store]     # single-store | multi-store | hardware | sync
---

# Test Case ID: OMS-REG-EXAMPLE-01

## Title

Validate Example Workflow

## Objective

Verify that the example workflow behaves as specified. One or two sentences on
what this case owns — and what it deliberately does not (link the sibling case
that owns it instead).

## Flows

> Composition, not expectation: the sequences a user performs, citing the
> behaviours that verify them in plain `` `.n` `` form (never `**.n**` — see
> the template rules). Tests and probes anchor to behaviours, never to a flow.

- **Create & save.** Open the list → create a record → fill the fields → save
  → it appears in the list. _Verified by `.1`–`.3`._
- **Guard & release.** Consume the record elsewhere → attempt the guarded
  action (blocked) → un-consume → repeat (succeeds). _Verified by `.4`, `.5`._

## Expected behaviours (source of truth)

> Canonical. Each behaviour has a stable ID (`OMS-REG-EXAMPLE-01.<n>`);
> deterministic tests and exploratory probes anchor to it. One observable
> outcome per bullet; precision lives in
> [`../rules.md`](../rules.md) / [`../contract.md`](../contract.md).

- [ ] **.1** A new record is saved with the entered name
- [ ] **.2** A saved record appears in the list with its correct details
- [ ] **.3** Duplicate codes are rejected with a clear message
- [ ] **.4** The guarded action is blocked while the condition holds
- [ ] **.5** The guarded action succeeds once the condition is undone
- [ ] **.6** Currency conversion uses the record-date exchange rate (pending: #1240)

<!--
## Retired behaviours

Add this section only when a behaviour is withdrawn — a tombstone keeps its
sub-ID reserved forever so it is never reused or reassigned. Use the `.n` form
(NOT the **.n** anchor token). The sub-ID is no longer a valid anchor; repoint
or drop anything that referenced it. Example:

- `.5` — retired 2026-07; per-line tax removed, superseded by .3
-->

## Preconditions

- [ ] A record exists
- [ ] User has edit permission

## Test Steps (manual walkthrough — reference only)

> A suggested path for a human tester. May drift from the current UI; it is
> **not** the source of truth — the behaviours above are. Update freely
> without ceremony.

- [ ] Step 1
- [ ] Step 2

## References

- Rules & precision: [`../rules.md`](../rules.md) · wire mapping: [`../contract.md`](../contract.md)
- Related case: `OMS-REG-EXAMPLE-02`
