//! Custom fields open-mSupply defines itself, in code, and ships as deployment
//! defaults — as opposed to the legacy ones in
//! [`crate::sync::central_mapping_custom_fields`], which exist to map an OG
//! field. A scope with no OG counterpart (the first being `prescription_request`)
//! would otherwise stay empty forever: nothing in the API creates a definition.
//!
//! Code owns the key, value type, name and options and rewrites them on every
//! seed; the deployment owns only `display_mode`, which is why that is defaulted
//! on create and never touched again. Design notes and the rejected alternatives
//! are in `docs/content/server/service/custom_fields`.

use chrono::Utc;
use repository::{
    CustomFieldDisplayMode, CustomFieldKind, CustomFieldOptionRow, CustomFieldOptionRowRepository,
    CustomFieldRow, CustomFieldRowRepository, CustomFieldScopeRow, CustomFieldScopeRowRepository,
    CustomFieldValueType, RepositoryError, StorageConnection,
};

use crate::prescription_request::update::PRESCRIPTION_REQUEST_CUSTOM_FIELD_SCOPE;

/// Stable identifiers for the code-defined builtin custom fields.
///
/// As with the legacy mapping fields, a field's **key is also its row id**, and
/// it is the literal JSON key written into every host record's `custom_fields`
/// blob. Keys are permanent: never change one once released (that is a new
/// field), and never encode a *label* in one — only the concept, so relabelling
/// costs nothing.
///
/// Keys are `<scope>_<field>`. `custom_field.key` is globally unique across both
/// families; `deleting_never_touches_the_legacy_family` guards the boundary.
pub mod keys {
    pub const PRESCRIPTION_REQUEST_WEIGHT: &str = "prescription_request_weight";
    pub const PRESCRIPTION_REQUEST_PATIENT_UNIT: &str = "prescription_request_patient_unit";
    pub const PRESCRIPTION_REQUEST_OCCUPATION: &str = "prescription_request_occupation";
    pub const PRESCRIPTION_REQUEST_CATEGORY: &str = "prescription_request_category";
}

/// Where builtin `sort_order` ranks start, against the legacy seeder's
/// `"0100"`, `"0200"`, …. Two independent registries cannot coordinate ranks, so
/// builtins take their own band and always sort after legacy fields on any scope
/// that ever hosts both. Ranks are gapped so a future reorder UI can mint a key
/// between two neighbours (see `CustomFieldScopeRow::sort_order`).
const SORT_ORDER_BASE: usize = 5000;

/// One choice of an OPTION-typed builtin. Flat: a hierarchical builtin
/// vocabulary would add a parent key here (`custom_field_option.parent_option_id`
/// supports it), and none needs one yet.
struct BuiltinOption {
    /// Permanent. Combined with the field's key to form the option's row id, and
    /// the option id is what records store — so this outlives any label.
    key: &'static str,
    name: &'static str,
}

/// A custom field open-mSupply ships itself.
struct BuiltinCustomField {
    /// The field's sole identifier — row id, JSON key, and the id options hang
    /// off. Always one of the [`keys`] constants.
    key: &'static str,
    /// Display name. Code-owned and rewritten on every seed; there is no rename
    /// mutation, and custom fields carry no translations anywhere in the app
    /// today (legacy included), so this English string is what renders.
    name: &'static str,
    value_type: CustomFieldValueType,
    /// Applied to each `custom_field_scope` row **on create only** — an admin's
    /// later visibility edit must survive every re-seed.
    display_mode: CustomFieldDisplayMode,
    /// Scopes the field applies to, one `custom_field_scope` row each.
    scopes: &'static [&'static str],
    /// Code-defined vocabulary for an OPTION field, empty for every other value
    /// type. A deployment cannot extend or override these until option CRUD
    /// exists, so a vocabulary shipped here reaches every site as-is.
    options: &'static [BuiltinOption],
}

/// The full set of builtin custom fields.
///
/// **Entry order defines per-scope display order** — each entry's index becomes
/// its `sort_order` rank, exactly as in the legacy seeder. Fields on different
/// scopes never interact, so groups can be interleaved freely; only the relative
/// order within a scope matters.
///
/// Removing an entry is a supported operation: it soft-deletes the field (see
/// [`seed_builtin_custom_fields`]) rather than orphaning it.
fn builtin_custom_fields() -> Vec<BuiltinCustomField> {
    use keys::*;
    use CustomFieldDisplayMode::Prominent;
    use CustomFieldValueType::{MultiOption, Real, Text};

    vec![
        // ===== prescription_request: the prescriber's clinical extras =====
        //
        // None of these is read by any OMS code — they are captured, displayed
        // and printed. A value that ever feeds a calculation, a shipped report or
        // a validation belongs in a typed column on `prescription_request`
        // instead: the JSON blob offers no type enforcement and no required
        // constraint.
        BuiltinCustomField {
            key: PRESCRIPTION_REQUEST_WEIGHT,
            name: "Weight",
            value_type: Real,
            display_mode: Prominent,
            scopes: &[PRESCRIPTION_REQUEST_CUSTOM_FIELD_SCOPE],
            options: &[],
        },
        BuiltinCustomField {
            key: PRESCRIPTION_REQUEST_PATIENT_UNIT,
            name: "Unit",
            value_type: Text,
            display_mode: Prominent,
            scopes: &[PRESCRIPTION_REQUEST_CUSTOM_FIELD_SCOPE],
            options: &[],
        },
        BuiltinCustomField {
            key: PRESCRIPTION_REQUEST_OCCUPATION,
            name: "Occupation",
            value_type: Text,
            display_mode: Prominent,
            scopes: &[PRESCRIPTION_REQUEST_CUSTOM_FIELD_SCOPE],
            options: &[],
        },
        // The patient's category — the only OPTION-family builtin, and a flat
        // vocabulary (no `parent_option_id`). MULTI_OPTION because a patient is
        // routinely in several of these at once (pregnant AND destitute), which
        // the single-valued OPTION could not say.
        BuiltinCustomField {
            key: PRESCRIPTION_REQUEST_CATEGORY,
            name: "Category",
            value_type: MultiOption,
            display_mode: Prominent,
            scopes: &[PRESCRIPTION_REQUEST_CUSTOM_FIELD_SCOPE],
            options: &[
                BuiltinOption {
                    key: "pregnant",
                    name: "Pregnant",
                },
                BuiltinOption {
                    key: "lactating",
                    name: "Lactating",
                },
                BuiltinOption {
                    key: "under_5",
                    name: "Under-5",
                },
                BuiltinOption {
                    key: "disabled",
                    name: "Disabled",
                },
                BuiltinOption {
                    key: "destitute",
                    name: "Destitute",
                },
                // Captures nothing further — there is no free-text companion.
                // Adding one later means a second field, not a change to this one.
                BuiltinOption {
                    key: "other",
                    name: "Other",
                },
            ],
        },
    ]
}

/// A field's `custom_field_scope` row id.
fn scope_row_id(field_key: &str, scope: &str) -> String {
    format!("{field_key}__{scope}")
}

/// An option's `custom_field_option` row id.
fn option_row_id(field_key: &str, option_key: &str) -> String {
    format!("{field_key}__{option_key}")
}

/// Evenly-spaced, zero-padded lexical rank from a list index: fixed width so a
/// plain string compare matches list order, gapped so a rank can later be minted
/// between two neighbours.
fn rank(base: usize, index: usize) -> String {
    format!("{:04}", base + (index + 1) * 100)
}

/// Create or refresh every builtin custom field, its scope rows and its options.
///
/// Idempotent and **change-aware**: a row is written only when it actually
/// differs, so a steady-state re-run performs no writes and adds no changelog
/// churn. Central-server only — remotes receive builtins over v7 like any other
/// definition and must never seed their own. See the two call sites in
/// [`crate::sync::synchroniser`] and the server's startup path; both are needed
/// because a synced central only learns it is central after its first sync,
/// while a standalone central never runs the sync loop at all.
///
/// **Deleting.** A key that has disappeared from the registry is soft-deleted
/// rather than left behind, and undeleted if it ever returns. That sweep is only
/// possible because `kind = Builtin` identifies the family, and it is scoped
/// strictly to that family: nothing here can touch a legacy or admin-configured
/// definition.
pub fn seed_builtin_custom_fields(connection: &StorageConnection) -> Result<(), RepositoryError> {
    let field_repo = CustomFieldRowRepository::new(connection);
    let scope_repo = CustomFieldScopeRowRepository::new(connection);
    let option_repo = CustomFieldOptionRowRepository::new(connection);

    let definitions = builtin_custom_fields();

    for (index, definition) in definitions.iter().enumerate() {
        let existing = field_repo.find_one_by_id(definition.key)?;
        let field = CustomFieldRow {
            id: definition.key.to_string(),
            key: definition.key.to_string(),
            name: definition.name.to_string(),
            value_type: definition.value_type.clone(),
            kind: CustomFieldKind::Builtin,
            // Always cleared: a key returning to the registry after being
            // deleted comes back rather than staying invisible.
            deleted_datetime: None,
        };
        if existing.as_ref() != Some(&field) {
            field_repo.upsert_one(&field)?;
        }

        let sort_order = rank(SORT_ORDER_BASE, index);
        for scope in definition.scopes {
            let row_id = scope_row_id(definition.key, scope);
            let existing_scope = scope_repo.find_one_by_id(&row_id)?;
            let scope_row = CustomFieldScopeRow {
                id: row_id,
                custom_field_id: definition.key.to_string(),
                scope: scope.to_string(),
                // Admin-owned once the row exists; code-owned only at creation.
                display_mode: existing_scope.as_ref().map_or_else(
                    || definition.display_mode.clone(),
                    |row| row.display_mode.clone(),
                ),
                sort_order: sort_order.clone(),
                // Always cleared, same as the field: a scope returning to a
                // definition comes back rather than staying invisible.
                deleted_datetime: None,
            };
            if existing_scope.as_ref() != Some(&scope_row) {
                scope_repo.upsert_one(&scope_row)?;
            }
        }

        for (option_index, option) in definition.options.iter().enumerate() {
            let row_id = option_row_id(definition.key, option.key);
            let existing_option = option_repo.find_one_by_id(&row_id)?;
            let option_row = CustomFieldOptionRow {
                id: row_id,
                custom_field_id: definition.key.to_string(),
                key: option.key.to_string(),
                name: option.name.to_string(),
                parent_option_id: None,
                deleted_datetime: None,
                sort_order: rank(0, option_index),
            };
            if existing_option.as_ref() != Some(&option_row) {
                option_repo.upsert_one(&option_row)?;
            }
        }
    }

    soft_delete_removed(connection, &definitions)?;

    Ok(())
}

/// Soft-delete builtin fields, and the options and scope rows of builtin fields,
/// that the registry no longer defines.
///
/// Soft delete, never a hard one: a stored value is only ever an option's id, so
/// the row has to survive for a record still holding it to render a name rather
/// than a raw id (`find_many_by_custom_field_ids` returns deleted options for
/// exactly this reason). A deleted *field* is likewise hidden from every read
/// path, and writes naming its key are rejected — the intended semantic, but note
/// the config UI cannot see soft-deleted rows, so it can only be undeleted by
/// putting the key back in the registry.
fn soft_delete_removed(
    connection: &StorageConnection,
    definitions: &[BuiltinCustomField],
) -> Result<(), RepositoryError> {
    let field_repo = CustomFieldRowRepository::new(connection);
    let option_repo = CustomFieldOptionRowRepository::new(connection);
    let scope_repo = CustomFieldScopeRowRepository::new(connection);
    let now = Utc::now().naive_utc();

    let live_field_keys: Vec<&str> = definitions.iter().map(|d| d.key).collect();
    let live_option_ids: Vec<String> = definitions
        .iter()
        .flat_map(|d| {
            d.options
                .iter()
                .map(move |option| option_row_id(d.key, option.key))
        })
        .collect();

    // Scoped to `kind = Builtin` throughout: the sweep must never reach a legacy
    // or admin-configured definition.
    let builtin_rows: Vec<CustomFieldRow> = field_repo
        .find_all()?
        .into_iter()
        .filter(|row| row.kind == CustomFieldKind::Builtin)
        .collect();

    for row in &builtin_rows {
        if live_field_keys.contains(&row.key.as_str()) || row.deleted_datetime.is_some() {
            continue;
        }
        field_repo.upsert_one(&CustomFieldRow {
            deleted_datetime: Some(now),
            ..row.clone()
        })?;
    }

    let builtin_ids: Vec<String> = builtin_rows.iter().map(|row| row.id.clone()).collect();

    for option in option_repo.find_many_by_custom_field_ids(&builtin_ids)? {
        if live_option_ids.contains(&option.id) || option.deleted_datetime.is_some() {
            continue;
        }
        option_repo.upsert_one(&CustomFieldOptionRow {
            deleted_datetime: Some(now),
            ..option
        })?;
    }

    // Scopes too. A field that keeps its key but drops a scope stays live, so
    // nothing else would ever stop that scope applying: the read paths join on
    // a field that is not deleted and a scope row that says the scope, and both
    // would still be true. Left alone, narrowing a definition's `scopes` would
    // silently do nothing.
    //
    // Rows under a soft-deleted FIELD are swept as well. They are already
    // unreachable — every read path drops the field first — but leaving them
    // would mean the same key returning to the registry with a scope it no
    // longer names, still attached.
    //
    // Soft rather than hard for a mechanical reason, not because the row earns
    // its keep: nothing references a scope row, but the family has no v7 delete
    // translator, so a removal only reaches remotes as an upsert. See the
    // migration that added the column.
    let live_scope_ids: Vec<String> = definitions
        .iter()
        .flat_map(|d| d.scopes.iter().map(move |scope| scope_row_id(d.key, scope)))
        .collect();

    for scope_row in scope_repo.find_many_by_custom_field_ids(&builtin_ids)? {
        if live_scope_ids.contains(&scope_row.id) || scope_row.deleted_datetime.is_some() {
            continue;
        }
        scope_repo.upsert_one(&CustomFieldScopeRow {
            deleted_datetime: Some(now),
            ..scope_row
        })?;
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::sync::central_mapping_custom_fields::seed_central_mapping_custom_fields;
    use repository::{
        mock::MockDataInserts, test_db::setup_all, ChangelogRepository, CustomFieldFilter,
        CustomFieldRepository, EqualFilter,
    };

    #[actix_rt::test]
    async fn seeds_builtin_custom_fields_idempotently() {
        let (_, connection, _, _) =
            setup_all("seed_builtin_custom_fields", MockDataInserts::none()).await;

        let field_repo = CustomFieldRowRepository::new(&connection);
        let scope_repo = CustomFieldScopeRowRepository::new(&connection);
        let option_repo = CustomFieldOptionRowRepository::new(&connection);
        let changelog_repo = ChangelogRepository::new(&connection);

        seed_builtin_custom_fields(&connection).unwrap();

        // Look up by hardcoded key, not the `keys` consts: a key is a frozen
        // storage/wire contract once released, so the test must fail if a const
        // is ever changed (testing a const against itself would mask that).
        let weight = field_repo
            .find_one_by_id("prescription_request_weight")
            .unwrap()
            .expect("missing prescription_request_weight");
        assert_eq!(weight.id, weight.key, "key is the id for builtin fields");
        assert_eq!(weight.kind, CustomFieldKind::Builtin);
        assert_eq!(weight.value_type, CustomFieldValueType::Real);
        assert_eq!(weight.name, "Weight");

        let unit = field_repo
            .find_one_by_id("prescription_request_patient_unit")
            .unwrap()
            .expect("missing prescription_request_patient_unit");
        assert_eq!(
            unit.value_type,
            CustomFieldValueType::Text,
            "unit is free text"
        );

        // Category is a REQUEST field: the category that held when this
        // prescription was written, stated beside the weight it was written
        // with (issue #514). Neither key it wore on the way here may be
        // re-seeded.
        let category = field_repo
            .find_one_by_id("prescription_request_category")
            .unwrap()
            .expect("missing prescription_request_category");
        assert_eq!(
            category.value_type,
            CustomFieldValueType::MultiOption,
            "a patient can be in several categories at once"
        );
        for retired in ["patient_category", "prescription_request_patient_category"] {
            assert!(
                field_repo.find_one_by_id(retired).unwrap().is_none(),
                "the pre-move key {retired} must not be re-seeded"
            );
        }

        assert_eq!(field_repo.find_all().unwrap().len(), 4);

        // Every builtin is on the request scope, and every one of them is
        // PROMINENT: all four belong in the prescriber's header (issue #514).
        let scopes = scope_repo.find_all().unwrap();
        assert_eq!(scopes.len(), 4);
        assert!(scopes.iter().all(|row| row.scope == "prescription_request"
            && row.display_mode == CustomFieldDisplayMode::Prominent));
        for id in [
            "prescription_request_weight__prescription_request",
            "prescription_request_patient_unit__prescription_request",
            "prescription_request_occupation__prescription_request",
            "prescription_request_category__prescription_request",
        ] {
            scope_repo
                .find_one_by_id(id)
                .unwrap()
                .unwrap_or_else(|| panic!("missing scope row {id}"));
        }

        // The category vocabulary: flat, six options, ids derived from the keys.
        let options = option_repo.find_all().unwrap();
        assert_eq!(options.len(), 6);
        assert!(options.iter().all(|row| row.parent_option_id.is_none()));
        assert!(options
            .iter()
            .all(|row| row.custom_field_id == "prescription_request_category"));
        let under_5 = option_repo
            .find_one_by_id("prescription_request_category__under_5")
            .unwrap()
            .expect("missing under_5 option");
        assert_eq!(under_5.name, "Under-5");

        // Re-seeding in steady state must write nothing at all — otherwise every
        // sync cycle would emit changelog for unchanged config.
        let cursor_before = changelog_repo.max_cursor().unwrap();
        seed_builtin_custom_fields(&connection).unwrap();
        assert_eq!(
            changelog_repo.max_cursor().unwrap(),
            cursor_before,
            "re-seed emitted changelog for unchanged rows"
        );

        // `name` is code-owned, unlike the legacy family's (whose names belong to
        // mSupply's label sync): a label fix in a later build must propagate.
        field_repo
            .upsert_one(&CustomFieldRow {
                name: "Mass".to_string(),
                ..weight.clone()
            })
            .unwrap();
        seed_builtin_custom_fields(&connection).unwrap();
        assert_eq!(
            field_repo
                .find_one_by_id("prescription_request_weight")
                .unwrap()
                .unwrap()
                .name,
            "Weight",
            "seeder must restore the code-owned name"
        );
    }

    #[actix_rt::test]
    async fn builtin_display_mode_edits_survive_a_reseed() {
        let (_, connection, _, _) =
            setup_all("builtin_display_mode_survives", MockDataInserts::none()).await;

        let scope_repo = CustomFieldScopeRowRepository::new(&connection);
        seed_builtin_custom_fields(&connection).unwrap();

        // A deployment hides a builtin it doesn't want.
        let row_id = "prescription_request_weight__prescription_request";
        let hidden = CustomFieldScopeRow {
            display_mode: CustomFieldDisplayMode::Hidden,
            ..scope_repo.find_one_by_id(row_id).unwrap().unwrap()
        };
        scope_repo.upsert_one(&hidden).unwrap();

        seed_builtin_custom_fields(&connection).unwrap();

        assert_eq!(
            scope_repo
                .find_one_by_id(row_id)
                .unwrap()
                .unwrap()
                .display_mode,
            CustomFieldDisplayMode::Hidden,
            "re-seed clobbered a deployment's visibility choice"
        );
    }

    #[actix_rt::test]
    async fn removed_builtins_soft_delete_and_returning_ones_come_back() {
        let (_, connection, _, _) = setup_all("builtin_soft_delete", MockDataInserts::none()).await;

        let field_repo = CustomFieldRowRepository::new(&connection);
        let option_repo = CustomFieldOptionRowRepository::new(&connection);
        seed_builtin_custom_fields(&connection).unwrap();

        // Stand in for a field and an option dropped from the registry in a later
        // build: both are builtins the current registry no longer defines.
        field_repo
            .upsert_one(&CustomFieldRow {
                id: "prescription_request_gone".to_string(),
                key: "prescription_request_gone".to_string(),
                name: "Gone".to_string(),
                value_type: CustomFieldValueType::Text,
                kind: CustomFieldKind::Builtin,
                deleted_datetime: None,
            })
            .unwrap();
        option_repo
            .upsert_one(&CustomFieldOptionRow {
                id: "prescription_request_category__widowed".to_string(),
                custom_field_id: "prescription_request_category".to_string(),
                key: "widowed".to_string(),
                name: "Widowed".to_string(),
                parent_option_id: None,
                deleted_datetime: None,
                sort_order: "0700".to_string(),
            })
            .unwrap();

        seed_builtin_custom_fields(&connection).unwrap();

        assert!(
            field_repo
                .find_one_by_id("prescription_request_gone")
                .unwrap()
                .unwrap()
                .deleted_datetime
                .is_some(),
            "a field dropped from the registry was not soft-deleted"
        );
        assert!(
            option_repo
                .find_one_by_id("prescription_request_category__widowed")
                .unwrap()
                .unwrap()
                .deleted_datetime
                .is_some(),
            "an option dropped from the registry was not soft-deleted"
        );

        // A deleted key that returns to the registry comes back live.
        let deleted = CustomFieldRow {
            deleted_datetime: Some(Utc::now().naive_utc()),
            ..field_repo
                .find_one_by_id("prescription_request_weight")
                .unwrap()
                .unwrap()
        };
        field_repo.upsert_one(&deleted).unwrap();

        seed_builtin_custom_fields(&connection).unwrap();

        assert!(
            field_repo
                .find_one_by_id("prescription_request_weight")
                .unwrap()
                .unwrap()
                .deleted_datetime
                .is_none(),
            "a key still in the registry stayed deleted"
        );
    }

    /// The case a live field hides: dropping a scope from a definition that
    /// keeps its key. The field stays live, so nothing in the read paths would
    /// ever stop the stale scope applying — `custom_field.deleted_datetime IS
    /// NULL` still passes and the row still names the scope. Before scopes were
    /// swept, narrowing `scopes` silently did nothing.
    #[actix_rt::test]
    async fn removed_scopes_soft_delete_and_stop_applying() {
        let (_, connection, _, _) =
            setup_all("builtin_scope_soft_delete", MockDataInserts::none()).await;

        let scope_repo = CustomFieldScopeRowRepository::new(&connection);
        let custom_field_repo = CustomFieldRepository::new(&connection);
        seed_builtin_custom_fields(&connection).unwrap();

        // Stand in for a scope the definition used to name and no longer does.
        // The FIELD is untouched and still in the registry — that is the point.
        let key = keys::PRESCRIPTION_REQUEST_WEIGHT;
        let stale_id = scope_row_id(key, "name");
        scope_repo
            .upsert_one(&CustomFieldScopeRow {
                id: stale_id.clone(),
                custom_field_id: key.to_string(),
                scope: "name".to_string(),
                display_mode: CustomFieldDisplayMode::Visible,
                sort_order: "0100".to_string(),
                deleted_datetime: None,
            })
            .unwrap();

        // Before the sweep it applies to that scope, which is the bug
        assert!(
            custom_field_repo
                .value_types_for_scope("name")
                .unwrap()
                .contains_key(key),
            "test setup did not reproduce the stale scope"
        );

        seed_builtin_custom_fields(&connection).unwrap();

        assert!(
            scope_repo
                .find_one_by_id(&stale_id)
                .unwrap()
                .unwrap()
                .deleted_datetime
                .is_some(),
            "a scope dropped from the registry was not soft-deleted"
        );
        assert!(
            !custom_field_repo
                .value_types_for_scope("name")
                .unwrap()
                .contains_key(key),
            "a soft-deleted scope still applied"
        );

        // The field itself is untouched, and still applies where it belongs
        let field = CustomFieldRowRepository::new(&connection)
            .find_one_by_id(key)
            .unwrap()
            .unwrap();
        assert!(field.deleted_datetime.is_none());
        assert!(custom_field_repo
            .value_types_for_scope(PRESCRIPTION_REQUEST_CUSTOM_FIELD_SCOPE)
            .unwrap()
            .contains_key(key));
    }

    #[actix_rt::test]
    async fn deleting_never_touches_the_legacy_family() {
        let (_, connection, _, _) =
            setup_all("builtin_delete_scope", MockDataInserts::none()).await;

        let field_repo = CustomFieldRowRepository::new(&connection);

        seed_central_mapping_custom_fields(&connection).unwrap();
        seed_builtin_custom_fields(&connection).unwrap();

        // No legacy definition is deleted by the builtin sweep, and no key is
        // shared between the families: 25 legacy + 4 builtin rows, each with the
        // kind its own seeder gave it.
        let all = field_repo.find_all().unwrap();
        assert_eq!(all.len(), 29, "a key collided between the two families");
        assert!(all
            .iter()
            .filter(|row| row.kind == CustomFieldKind::Legacy)
            .all(|row| row.deleted_datetime.is_none()));
        assert_eq!(
            all.iter()
                .filter(|row| row.kind == CustomFieldKind::Builtin)
                .count(),
            4
        );
    }

    #[actix_rt::test]
    async fn builtin_keys_are_visible_for_their_scope() {
        let (_, connection, _, _) =
            setup_all("builtin_allowed_keys", MockDataInserts::none()).await;

        seed_builtin_custom_fields(&connection).unwrap();

        // What the write path validates a patch against, and what the read path
        // filters a record's blob to.
        let allowed = CustomFieldRepository::new(&connection)
            .allowed_keys_for_scope("prescription_request")
            .unwrap();
        assert_eq!(allowed.len(), 4);
        assert!(allowed.contains("prescription_request_weight"));
        assert!(allowed.contains("prescription_request_category"));

        // The builtins seed nothing onto the patient scope — category moved off
        // it (issue #514), so a patient patch naming the old key is rejected.
        let patient_allowed = CustomFieldRepository::new(&connection)
            .allowed_keys_for_scope("patient")
            .unwrap();
        assert!(!patient_allowed.contains("patient_category"));

        // And the definitions read the client makes, which must surface the
        // BUILTIN kind rather than filtering it out.
        let definitions = CustomFieldRepository::new(&connection)
            .query_by_filter(
                CustomFieldFilter::new()
                    .scope(EqualFilter::equal_to("prescription_request".to_string())),
            )
            .unwrap();
        assert_eq!(definitions.len(), 4);
        assert!(definitions
            .iter()
            .all(|row| row.custom_field.kind == CustomFieldKind::Builtin));
    }
}
