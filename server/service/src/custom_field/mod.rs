pub mod builtin;

use std::collections::HashSet;

use repository::{
    CustomField, CustomFieldDisplayMode, CustomFieldFilter, CustomFieldRepository,
    CustomFieldScopeRowRepository, CustomFieldValueType, RepositoryError, StorageConnection,
};

use crate::{service_provider::ServiceContext, usize_to_u32, ListError, ListResult};

/// A single change to a field's display mode on one scope (part of a batch).
#[derive(Clone, Debug, PartialEq)]
pub struct CustomFieldScopeUpdate {
    pub custom_field_id: String,
    pub display_mode: CustomFieldDisplayMode,
}

/// Batch update of display modes for one scope (the config UI saves a tab at a time).
#[derive(Clone, Debug, PartialEq)]
pub struct UpdateCustomFieldScopes {
    pub scope: String,
    pub updates: Vec<CustomFieldScopeUpdate>,
}

#[derive(Debug, PartialEq)]
pub enum UpdateCustomFieldScopesError {
    /// A targeted `(custom_field, scope)` pair has no scope row. Config edits
    /// only ever update existing rows (every pair is seeded from sync), so a
    /// missing row is a bad request rather than something we create.
    ScopeRowDoesNotExist(String),
    DatabaseError(RepositoryError),
}

impl From<RepositoryError> for UpdateCustomFieldScopesError {
    fn from(error: RepositoryError) -> Self {
        UpdateCustomFieldScopesError::DatabaseError(error)
    }
}

pub trait CustomFieldServiceTrait: Sync + Send {
    fn get_custom_fields(
        &self,
        ctx: &ServiceContext,
        filter: Option<CustomFieldFilter>,
    ) -> Result<ListResult<CustomField>, ListError> {
        get_custom_fields(&ctx.connection, filter)
    }

    fn allowed_custom_field_keys_for_scope(
        &self,
        connection: &StorageConnection,
        scope: &str,
    ) -> Result<HashSet<String>, RepositoryError> {
        CustomFieldRepository::new(connection).allowed_keys_for_scope(scope)
    }

    /// Admin/config read: all fields on a scope with their display mode,
    /// **including `Hidden`** (so the config UI can un-hide them).
    fn get_custom_field_scope_config(
        &self,
        ctx: &ServiceContext,
        scope: &str,
    ) -> Result<ListResult<CustomField>, RepositoryError> {
        let rows = CustomFieldRepository::new(&ctx.connection).query_scope_config(scope)?;
        Ok(ListResult {
            count: usize_to_u32(rows.len()),
            rows,
        })
    }

    /// Update display modes for a scope, returning the fresh config for it.
    fn update_custom_field_scopes(
        &self,
        ctx: &ServiceContext,
        input: UpdateCustomFieldScopes,
    ) -> Result<Vec<CustomField>, UpdateCustomFieldScopesError> {
        update_custom_field_scopes(ctx, input)
    }
}

pub struct CustomFieldService;
impl CustomFieldServiceTrait for CustomFieldService {}

fn update_custom_field_scopes(
    ctx: &ServiceContext,
    input: UpdateCustomFieldScopes,
) -> Result<Vec<CustomField>, UpdateCustomFieldScopesError> {
    let scope = input.scope.clone();
    ctx.connection
        .transaction_sync(|connection| {
            let scope_repo = CustomFieldScopeRowRepository::new(connection);
            for update in &input.updates {
                let mut row = scope_repo
                    .find_one_by_field_id_and_scope(&update.custom_field_id, &input.scope)?
                    .ok_or_else(|| {
                        UpdateCustomFieldScopesError::ScopeRowDoesNotExist(
                            update.custom_field_id.clone(),
                        )
                    })?;
                // Skip no-op writes so we don't churn the changelog / sync.
                if row.display_mode == update.display_mode {
                    continue;
                }
                row.display_mode = update.display_mode.clone();
                scope_repo.upsert_one(&row)?;
            }
            CustomFieldRepository::new(connection)
                .query_scope_config(&scope)
                .map_err(UpdateCustomFieldScopesError::from)
        })
        .map_err(|error| error.to_inner_error())
}

fn get_custom_fields(
    connection: &StorageConnection,
    filter: Option<CustomFieldFilter>,
) -> Result<ListResult<CustomField>, ListError> {
    let rows = CustomFieldRepository::new(connection).query(filter)?;
    Ok(ListResult {
        count: usize_to_u32(rows.len()),
        rows,
    })
}

/// Why a `custom_fields` patch is rejected. Both are bad requests: the write
/// names something the scope doesn't define, or gives a defined key a value of
/// the wrong shape. Callers map each onto their own error enum.
#[derive(Clone, Debug, PartialEq)]
pub enum CustomFieldPatchProblem {
    /// Not a defined-and-visible custom_field for the scope — rejected rather
    /// than written, since the read path would silently filter it out. A field
    /// whose value type this build doesn't recognise reads as unknown here too
    /// (`value_types_for_scope` drops it), so an unvalidatable write is refused
    /// rather than stored on trust.
    UnknownKey(String),
    /// A defined key given a value of the wrong JSON shape.
    WrongValueType {
        key: String,
        expected: CustomFieldValueType,
    },
}

/// Whether a JSON value may be stored under a custom_field of this type.
///
/// The check is the JSON KIND and nothing more — no date parsing, no
/// integrality test, no option-membership lookup. It exists to protect the
/// readers, every one of which assumes the shape its type implies (an OPTION
/// resolved as an id, a MULTI_OPTION iterated as a list of them); it is not an
/// attempt to make the blob a schema. `null` never reaches here: in a patch it
/// means "clear this key".
pub(crate) fn value_matches_type(
    value: &serde_json::Value,
    value_type: &CustomFieldValueType,
) -> bool {
    match value_type {
        // Option ids and ISO dates are stored as text, like TEXT itself.
        CustomFieldValueType::Text | CustomFieldValueType::Date | CustomFieldValueType::Option => {
            value.is_string()
        }
        CustomFieldValueType::Integer | CustomFieldValueType::Real => value.is_number(),
        CustomFieldValueType::Boolean => value.is_boolean(),
        // An array OF STRINGS: every reader resolves each entry as an option
        // id, so an array of anything else is as unusable as a scalar.
        CustomFieldValueType::MultiOption => value
            .as_array()
            .is_some_and(|entries| entries.iter().all(|entry| entry.is_string())),
        // Unreachable — such a key is rejected as unknown above.
        CustomFieldValueType::Other(_) => false,
    }
}

/// Validate a `custom_fields` patch against a table scope: returns the first
/// problem found, or `None` when every entry may be written. Shared by the
/// custom_fields-v2 write paths (patient, invoice, prescription request).
///
/// API writes only. Sync translators write the blob directly and are not
/// checked: a rejected row would stall the sync buffer, and the readers are
/// tolerant of a shape that doesn't match by design.
pub(crate) fn check_custom_fields_patch(
    connection: &StorageConnection,
    scope: &str,
    patch: &serde_json::Map<String, serde_json::Value>,
) -> Result<Option<CustomFieldPatchProblem>, RepositoryError> {
    let allowed = CustomFieldRepository::new(connection).value_types_for_scope(scope)?;
    for (key, value) in patch {
        let Some(value_type) = allowed.get(key) else {
            return Ok(Some(CustomFieldPatchProblem::UnknownKey(key.clone())));
        };
        // A null clears the key, so it is valid whatever the type.
        if value.is_null() || value_matches_type(value, value_type) {
            continue;
        }
        return Ok(Some(CustomFieldPatchProblem::WrongValueType {
            key: key.clone(),
            expected: value_type.clone(),
        }));
    }
    Ok(None)
}

/// Apply an optional `custom_fields` patch during a record update: `None`
/// leaves the blob untouched; `Some` patch-merges over it via [`merge_patch`].
pub(crate) fn apply_custom_fields_patch(
    existing: Option<serde_json::Value>,
    patch: Option<serde_json::Map<String, serde_json::Value>>,
) -> Option<serde_json::Value> {
    match patch {
        None => existing,
        Some(patch) => merge_patch(existing, patch),
    }
}

/// Merge a key→value patch into an existing `custom_fields` blob.
///
/// A `null` value removes the key; any other value sets it. Returns `None` when
/// the result is empty so an emptied blob becomes NULL rather than `{}`.
/// Shared by the custom_fields-v2 write paths (patient, invoice).
pub(crate) fn merge_patch(
    existing: Option<serde_json::Value>,
    patch: serde_json::Map<String, serde_json::Value>,
) -> Option<serde_json::Value> {
    let mut map = match existing {
        Some(serde_json::Value::Object(map)) => map,
        _ => serde_json::Map::new(),
    };

    for (key, value) in patch {
        if value.is_null() {
            map.remove(&key);
        } else {
            map.insert(key, value);
        }
    }

    if map.is_empty() {
        None
    } else {
        Some(serde_json::Value::Object(map))
    }
}

#[cfg(test)]
mod tests {
    use repository::{
        mock::MockDataInserts, test_db::setup_all, CustomFieldDisplayMode, CustomFieldKind,
        CustomFieldRow, CustomFieldRowRepository, CustomFieldScopeRow,
        CustomFieldScopeRowRepository, CustomFieldValueType,
    };

    use serde_json::json;

    use crate::{
        custom_field::{
            check_custom_fields_patch, value_matches_type, CustomFieldPatchProblem,
            CustomFieldScopeUpdate, UpdateCustomFieldScopes, UpdateCustomFieldScopesError,
        },
        service_provider::ServiceProvider,
    };

    fn field(id: &str) -> CustomFieldRow {
        CustomFieldRow {
            id: id.to_string(),
            key: id.to_string(),
            name: id.to_string(),
            value_type: CustomFieldValueType::Text,
            kind: CustomFieldKind::Standard,
            deleted_datetime: None,
        }
    }

    fn scope_row(field_id: &str, scope: &str, mode: CustomFieldDisplayMode) -> CustomFieldScopeRow {
        CustomFieldScopeRow {
            id: format!("{field_id}__{scope}"),
            custom_field_id: field_id.to_string(),
            scope: scope.to_string(),
            display_mode: mode,
            ..Default::default()
        }
    }

    #[actix_rt::test]
    async fn update_custom_field_scopes_flips_and_errors() {
        let (_, connection, connection_manager, _) = setup_all(
            "update_custom_field_scopes_flips_and_errors",
            MockDataInserts::none(),
        )
        .await;

        // Two item fields: one currently Hidden, one currently Visible.
        let field_repo = CustomFieldRowRepository::new(&connection);
        field_repo.upsert_one(&field("f_a")).unwrap();
        field_repo.upsert_one(&field("f_b")).unwrap();

        let scope_repo = CustomFieldScopeRowRepository::new(&connection);
        scope_repo
            .upsert_one(&scope_row("f_a", "item", CustomFieldDisplayMode::Hidden))
            .unwrap();
        scope_repo
            .upsert_one(&scope_row("f_b", "item", CustomFieldDisplayMode::Visible))
            .unwrap();

        let service_provider = ServiceProvider::new(connection_manager);
        let ctx = service_provider.basic_context().unwrap();
        let service = &service_provider.custom_field_service;

        // Config read includes the hidden field.
        let config = service.get_custom_field_scope_config(&ctx, "item").unwrap();
        assert_eq!(config.count, 2);

        // Flip f_a Hidden -> Prominent, f_b Visible -> Hidden.
        let result = service
            .update_custom_field_scopes(
                &ctx,
                UpdateCustomFieldScopes {
                    scope: "item".to_string(),
                    updates: vec![
                        CustomFieldScopeUpdate {
                            custom_field_id: "f_a".to_string(),
                            display_mode: CustomFieldDisplayMode::Prominent,
                        },
                        CustomFieldScopeUpdate {
                            custom_field_id: "f_b".to_string(),
                            display_mode: CustomFieldDisplayMode::Hidden,
                        },
                    ],
                },
            )
            .unwrap();

        // Returned config reflects the new modes (still includes the now-hidden one).
        let mode = |id: &str| {
            result
                .iter()
                .find(|f| f.custom_field.id == id)
                .and_then(|f| f.display_mode.clone())
        };
        assert_eq!(mode("f_a"), Some(CustomFieldDisplayMode::Prominent));
        assert_eq!(mode("f_b"), Some(CustomFieldDisplayMode::Hidden));

        // Persisted.
        assert_eq!(
            scope_repo
                .find_one_by_field_id_and_scope("f_a", "item")
                .unwrap()
                .unwrap()
                .display_mode,
            CustomFieldDisplayMode::Prominent
        );

        // Targeting a (field, scope) pair with no scope row is a bad request.
        let err = service
            .update_custom_field_scopes(
                &ctx,
                UpdateCustomFieldScopes {
                    scope: "patient".to_string(),
                    updates: vec![CustomFieldScopeUpdate {
                        custom_field_id: "f_a".to_string(),
                        display_mode: CustomFieldDisplayMode::Visible,
                    }],
                },
            )
            .unwrap_err();
        assert_eq!(
            err,
            UpdateCustomFieldScopesError::ScopeRowDoesNotExist("f_a".to_string())
        );
    }

    #[test]
    fn value_matches_type_checks_the_json_kind_and_no_more() {
        use CustomFieldValueType::*;

        // Option ids and dates are text, like TEXT itself.
        assert!(value_matches_type(&json!("anything"), &Text));
        assert!(value_matches_type(&json!("option_id"), &Option));
        assert!(value_matches_type(&json!("not-a-date"), &Date));
        assert!(!value_matches_type(&json!(42), &Text));

        // A number is a number: nothing here asks whether an INTEGER's value is
        // integral, because the encoder — not the author — decides that.
        assert!(value_matches_type(&json!(5.0), &Integer));
        assert!(value_matches_type(&json!(5), &Real));
        assert!(!value_matches_type(&json!("5"), &Integer));

        assert!(value_matches_type(&json!(true), &Boolean));
        assert!(!value_matches_type(&json!("true"), &Boolean));

        // MULTI_OPTION is an array OF STRINGS — every reader resolves each
        // entry as an option id.
        assert!(value_matches_type(&json!(["a", "b"]), &MultiOption));
        assert!(value_matches_type(&json!([]), &MultiOption));
        assert!(!value_matches_type(&json!("a"), &MultiOption));
        assert!(!value_matches_type(&json!(["a", 2]), &MultiOption));
        assert!(!value_matches_type(&json!(["a"]), &Option));
    }

    #[actix_rt::test]
    async fn check_custom_fields_patch_rejects_unknown_keys_and_wrong_shapes() {
        let (_, connection, _, _) = setup_all(
            "check_custom_fields_patch_rejects_unknown_keys_and_wrong_shapes",
            MockDataInserts::none(),
        )
        .await;

        let field_repo = CustomFieldRowRepository::new(&connection);
        let scope_repo = CustomFieldScopeRowRepository::new(&connection);
        let mut categories = field("categories");
        categories.value_type = CustomFieldValueType::MultiOption;
        field_repo.upsert_one(&field("note")).unwrap();
        field_repo.upsert_one(&categories).unwrap();
        // A field whose value type this build doesn't recognise — a newer
        // central's. It is not displayable, so it is not writable either.
        let mut future = field("future");
        future.value_type = CustomFieldValueType::Other("GEOJSON".to_string());
        field_repo.upsert_one(&future).unwrap();
        for key in ["note", "categories", "future"] {
            scope_repo
                .upsert_one(&scope_row(key, "patient", CustomFieldDisplayMode::Visible))
                .unwrap();
        }

        let patch = |pairs: &[(&str, serde_json::Value)]| {
            pairs
                .iter()
                .map(|(key, value)| (key.to_string(), value.clone()))
                .collect::<serde_json::Map<String, serde_json::Value>>()
        };
        let check = |pairs: &[(&str, serde_json::Value)]| {
            check_custom_fields_patch(&connection, "patient", &patch(pairs)).unwrap()
        };

        // Well-shaped values pass, and a null clears whatever the type.
        assert_eq!(
            check(&[
                ("note", json!("seen in clinic")),
                ("categories", json!(["pregnant"])),
            ]),
            None
        );
        assert_eq!(check(&[("categories", serde_json::Value::Null)]), None);

        // An undefined key is refused rather than written for the read path to
        // filter out later.
        assert_eq!(
            check(&[("stray", json!("x"))]),
            Some(CustomFieldPatchProblem::UnknownKey("stray".to_string()))
        );

        // A defined key given the wrong shape is refused too: every reader of
        // this field would have to cope with a scalar it can't resolve.
        assert_eq!(
            check(&[("categories", json!("pregnant"))]),
            Some(CustomFieldPatchProblem::WrongValueType {
                key: "categories".to_string(),
                expected: CustomFieldValueType::MultiOption,
            })
        );
        assert_eq!(
            check(&[("note", json!(3))]),
            Some(CustomFieldPatchProblem::WrongValueType {
                key: "note".to_string(),
                expected: CustomFieldValueType::Text,
            })
        );

        // A field this build can't validate can't be written: unknown, not
        // trusted.
        assert_eq!(
            check(&[("future", json!("anything"))]),
            Some(CustomFieldPatchProblem::UnknownKey("future".to_string()))
        );
    }
}
