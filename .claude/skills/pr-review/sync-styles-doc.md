Regenerate `server/repository/src/db_diesel/changelog/sync_styles.md` from the current state of the code.

Arguments: $ARGUMENTS (none expected — this command always regenerates the full doc)

Goal: produce a doc that explains *how Open-mSupply's sync layer routes records*, in plain English. A new contributor should be able to read this and understand the system without going to the code first. The doc itself must read like documentation, not a code map.

Steps:

1. **Read the sources of truth** (in full, before writing — these are *for your understanding*, not for citing in the doc):
   - The sync-style enum and per-table classification under `server/repository/src/db_diesel/changelog/sync_style.rs`.
   - The changelog table, insert-row fields, and filter constructors under `server/repository/src/db_diesel/changelog/changelog.rs`. Pay attention to the joined source query (changelog → store → transfer-stores → name-store-join → patient-stores).
   - The patterns for how a mutated record becomes a changelog row, under `server/repository/src/db_diesel/changelog/generate_changelog.rs`. Group by what fields each impl populates (store only / store + transfer-store / line inherits parent / line emits parent + child / patient-scoped / cross-table lookup / record-id only / built from `&self` vs by id).
   - The batch row-fetch enum under `server/repository/src/db_diesel/changelog/batch_query.rs` (only matters for v7 — every variant is a v7-eligible table).
   - The translation trait and direction enum under `server/service/src/sync/translations/mod.rs`, including the default opt-in/opt-out behaviour.
   - The translators under `server/service/src/sync/translations/*.rs` — scan for translators that override the default to opt in or out per direction. Note special cases (the patient-name routing for `Name`, `NameStoreJoin`, `NameOmsFields`; the `*_legacy.rs` re-publishers; vaccination's patient-only routing; etc.).

2. **Read the filter call sites** to confirm which filter each transport invokes:
   - v5 push lives in `server/service/src/sync/remote_data_synchroniser.rs`.
   - v6 central pull and v6 patient pull live in `server/service/src/sync/sync_on_central/mod.rs`.
   - v7 push lives in `server/service/src/sync_v7/sync.rs`.
   - v7 central pull lives in `server/service/src/sync_v7/sync_on_central/mod.rs`.
   - The generic v7 serialisation step lives in `server/service/src/sync_v7/prepare.rs`.

3. **Write the doc with roughly this structure** (match the existing doc's section flow and tone):
   1. Sync transports (v5 / v6 / v7) — for each: who talks to whom, the wire format, and the echo guard.
   2. Sync styles — what each style means in routing terms (who is an eligible recipient). Plus the transport-flag (legacy-only / OMS-native) that narrows tables per filter.
   3. Tables by sync style — exact lists, grouped to mirror the source. Mention the `MasterList` quirk (classified into a sync style, but its translator names no legacy table, so nothing actually ships on the wire).
   4. Changelog row metadata — for each field on the changelog row, what it means and which filter consumes it. Note that the source-site field is always populated and drives every echo guard.
   5. How records become changelog rows — group the patterns by what fields the generator populates and why. Include the line-inherits-parent and line-emits-both-parent-and-child cases.
   6. Outgoing-sync filters — for each filter: who calls it, what it returns (described per sync style in plain English), what echo guard (if any). Mention the unused store-scoped filter as defined-but-not-yet-used.
   7. Translation — the three directions and the per-direction defaults; the notable special cases (Name/NameStoreJoin opting in to OMS central, NameOmsFields, the legacy re-publishers, Vaccination's patient-only routing). Note that v7 has no per-table translation step.
   8. The single useful invariant — a row only moves when both eligibility (sync style + transport flag) and transport (translator opt-in for v5/v6, blanket for v7) agree.
   9. How to regenerate — point at this slash command.

4. **Apply the hard rules:**
   - **No code references in the body of the doc.** Do not name types, functions, modules, files, or line numbers. Use plain-English names instead — e.g. "all-data-for-site filter", "patient routing", "transfer-store routing", "the changelog's source-site field". The reader should never have to know what something is called in Rust to follow the doc. The only exceptions are: (a) table names in the per-style lists in section 3 (these are the canonical changelog table identifiers and double as plain-English names), and (b) the slash-command path at the very bottom.
   - **No line numbers** — they go stale on every refactor.
   - **Re-derive everything from the code, not the previous doc.** Headings, the set of sync styles, per-style descriptions, table lists, the order styles appear in, and any cross-cutting structure must all be derived from the current source. The previous doc may be stale — if a sync style has been added, removed, renamed, or had its membership/predicate changed, the new doc's structure must change to match. Do not preserve a section just because it existed last time.
   - **Re-derive the filter behaviour from the code.** Each filter's predicate-per-sync-style description must match what the code actually does. If a filter has gained or lost a sync-style branch, the doc's per-style description for that filter must reflect that. Do not copy filter descriptions from the previous doc.
   - **Minimise churn.** The previous doc is the starting point, not the enemy. For each section, ask: did anything in the underlying code change that affects this prose? If no, keep the existing wording verbatim — do not re-phrase, re-order, or "improve" it. If yes, change only what the code change requires. The goal is that a regeneration after a no-op code change produces a near-empty diff. Stylistic rewrites belong in a separate, deliberate edit — not in a regeneration.
   - **When the code *has* changed, re-derive freely.** If a sync style is added, removed, renamed, or has its membership/predicate changed; if a filter gains or loses a branch; if a translator's opt-in changes — the affected sections must be rewritten from the code, and headings/structure must follow the code. The previous doc has no authority over content that's gone stale; it only has authority over content that's still accurate.
   - **Cross-check translator special cases.** If a Central-style table also pushes to OMS central, or a legacy-style table also round-trips via OMS, call it out. Read the relevant translator file rather than trusting the previous doc.
   - **Optimise for "explain the system."** A reader should leave knowing *why* each piece exists, not just what's wired to what.
   - **Tone and layout.** Tight prose, short tables (no padded-column alignment), `---` separators between top-level sections, a "single useful invariant" callout near the end. Read the current `sync_styles.md` only to lock in voice — not to lift structure or content.

5. **Write the rendered doc** to `server/repository/src/db_diesel/changelog/sync_styles.md`, replacing the existing content.
