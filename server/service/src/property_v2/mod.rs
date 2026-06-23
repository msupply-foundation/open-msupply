use std::collections::HashSet;

use repository::{
    PropertyDisplayModeV2, PropertyTableV2Row, PropertyTableV2RowRepository, PropertyV2,
    PropertyV2Filter, PropertyV2Repository, PropertyV2RowRepository, RepositoryError,
    StorageConnection,
};

use crate::{service_provider::ServiceContext, usize_to_u32, ListError, ListResult};

/// The table scopes a property can be associated with — the valid values for
/// `property_table_v2.table_name`. Mirrors the invoice scopes in
/// [`crate::invoice::invoice_property_table_name`] plus the record scopes
/// (`name`, `patient`, `item`). The admin config write path validates against
/// this so a typo'd scope can't create an orphan row that nothing reads.
pub const PROPERTY_SCOPE_TABLE_NAMES: &[&str] = &[
    "name",
    "patient",
    "item",
    "inbound_shipment",
    "outbound_shipment",
    "prescription",
    "supplier_return",
    "customer_return",
];

#[derive(Clone, Debug, PartialEq)]
pub struct SetPropertyDisplayMode {
    pub property_id: String,
    pub table_name: String,
    /// `Some(mode)` associates the property with the scope at that display mode
    /// (creating the `property_table_v2` row if absent, updating it otherwise).
    /// `None` *disassociates* — removes the row entirely. Note this is distinct
    /// from `Some(Hidden)`: a hidden-but-associated property still transfers
    /// between records; a disassociated one does not.
    pub display_mode: Option<PropertyDisplayModeV2>,
}

#[derive(Debug, PartialEq)]
pub enum SetPropertyDisplayModeError {
    PropertyDoesNotExist,
    InvalidTableName,
    DatabaseError(RepositoryError),
}

impl From<RepositoryError> for SetPropertyDisplayModeError {
    fn from(error: RepositoryError) -> Self {
        SetPropertyDisplayModeError::DatabaseError(error)
    }
}

pub trait PropertyV2ServiceTrait: Sync + Send {
    fn get_properties_v2(
        &self,
        ctx: &ServiceContext,
        filter: Option<PropertyV2Filter>,
    ) -> Result<ListResult<PropertyV2>, ListError> {
        get_properties_v2(&ctx.connection, filter)
    }

    fn allowed_property_keys_for_table(
        &self,
        connection: &StorageConnection,
        table_name: &str,
    ) -> Result<HashSet<String>, RepositoryError> {
        PropertyV2Repository::new(connection).allowed_keys_for_table(table_name)
    }

    /// Set (or clear) how a property is displayed on a given table scope.
    /// Central-only configuration — gated at the GraphQL layer. Returns the
    /// resulting scope row, or `None` when the property was disassociated.
    fn set_property_display_mode(
        &self,
        ctx: &ServiceContext,
        input: SetPropertyDisplayMode,
    ) -> Result<Option<PropertyTableV2Row>, SetPropertyDisplayModeError> {
        let result = ctx
            .connection
            .transaction_sync(|connection| set_property_display_mode(connection, input.clone()))
            .map_err(|error| error.to_inner_error())?;
        Ok(result)
    }
}

pub struct PropertyV2Service;
impl PropertyV2ServiceTrait for PropertyV2Service {}

fn get_properties_v2(
    connection: &StorageConnection,
    filter: Option<PropertyV2Filter>,
) -> Result<ListResult<PropertyV2>, ListError> {
    let rows = PropertyV2Repository::new(connection).query(filter)?;
    Ok(ListResult {
        count: usize_to_u32(rows.len()),
        rows,
    })
}

fn set_property_display_mode(
    connection: &StorageConnection,
    input: SetPropertyDisplayMode,
) -> Result<Option<PropertyTableV2Row>, SetPropertyDisplayModeError> {
    let SetPropertyDisplayMode {
        property_id,
        table_name,
        display_mode,
    } = input;

    if PropertyV2RowRepository::new(connection)
        .find_one_by_id(&property_id)?
        .is_none()
    {
        return Err(SetPropertyDisplayModeError::PropertyDoesNotExist);
    }

    if !PROPERTY_SCOPE_TABLE_NAMES.contains(&table_name.as_str()) {
        return Err(SetPropertyDisplayModeError::InvalidTableName);
    }

    let repo = PropertyTableV2RowRepository::new(connection);
    let existing = repo.find_one_by_property_id_and_table_name(&property_id, &table_name)?;

    match (existing, display_mode) {
        // Associate / update: reuse the existing row id so we don't violate the
        // `UNIQUE (property_id, table_name)` constraint; otherwise mint a
        // deterministic id matching the central-seed convention.
        (existing, Some(display_mode)) => {
            let id = existing
                .map(|row| row.id)
                .unwrap_or_else(|| format!("{property_id}__{table_name}"));
            let row = PropertyTableV2Row {
                id,
                property_id,
                table_name,
                display_mode,
            };
            repo.upsert_one(&row)?;
            Ok(Some(row))
        }
        // Disassociate: drop the row (no-op if it never existed).
        (Some(existing), None) => {
            repo.delete(&existing.id)?;
            Ok(None)
        }
        (None, None) => Ok(None),
    }
}

#[cfg(test)]
mod tests {
    use repository::{
        mock::MockDataInserts, test_db::setup_all, PropertyDisplayModeV2, PropertyKindV2,
        PropertyTableV2RowRepository, PropertyV2Row, PropertyV2RowRepository, PropertyValueTypeV2,
    };

    use super::{
        set_property_display_mode, SetPropertyDisplayMode, SetPropertyDisplayModeError,
    };

    fn property(id: &str) -> PropertyV2Row {
        PropertyV2Row {
            id: id.to_string(),
            key: id.to_string(),
            name: id.to_string(),
            value_type: PropertyValueTypeV2::Text,
            kind: PropertyKindV2::Standard,
            deleted_datetime: None,
        }
    }

    fn input(
        property_id: &str,
        table_name: &str,
        display_mode: Option<PropertyDisplayModeV2>,
    ) -> SetPropertyDisplayMode {
        SetPropertyDisplayMode {
            property_id: property_id.to_string(),
            table_name: table_name.to_string(),
            display_mode,
        }
    }

    #[actix_rt::test]
    async fn set_property_display_mode_associate_update_disassociate() {
        let (_, connection, _, _) = setup_all(
            "set_property_display_mode_associate_update_disassociate",
            MockDataInserts::none(),
        )
        .await;

        PropertyV2RowRepository::new(&connection)
            .upsert_one(&property("prop_a"))
            .unwrap();
        let table_repo = PropertyTableV2RowRepository::new(&connection);

        // Associate: no row yet -> creates one at Visible.
        let result = set_property_display_mode(
            &connection,
            input("prop_a", "name", Some(PropertyDisplayModeV2::Visible)),
        )
        .unwrap();
        assert_eq!(result.unwrap().display_mode, PropertyDisplayModeV2::Visible);
        let row = table_repo
            .find_one_by_property_id_and_table_name("prop_a", "name")
            .unwrap()
            .unwrap();
        assert_eq!(row.display_mode, PropertyDisplayModeV2::Visible);
        let row_id = row.id.clone();

        // Update: same (property, table) -> reuses the same row id, new mode.
        let result = set_property_display_mode(
            &connection,
            input("prop_a", "name", Some(PropertyDisplayModeV2::Prominent)),
        )
        .unwrap();
        let updated = result.unwrap();
        assert_eq!(updated.id, row_id);
        assert_eq!(updated.display_mode, PropertyDisplayModeV2::Prominent);

        // Disassociate: None removes the row entirely.
        let result =
            set_property_display_mode(&connection, input("prop_a", "name", None)).unwrap();
        assert!(result.is_none());
        assert!(table_repo
            .find_one_by_property_id_and_table_name("prop_a", "name")
            .unwrap()
            .is_none());

        // Disassociating an already-absent scope is a no-op (not an error).
        assert!(
            set_property_display_mode(&connection, input("prop_a", "name", None))
                .unwrap()
                .is_none()
        );
    }

    #[actix_rt::test]
    async fn set_property_display_mode_validation() {
        let (_, connection, _, _) =
            setup_all("set_property_display_mode_validation", MockDataInserts::none()).await;
        PropertyV2RowRepository::new(&connection)
            .upsert_one(&property("prop_a"))
            .unwrap();

        // Unknown property.
        assert_eq!(
            set_property_display_mode(
                &connection,
                input("does_not_exist", "name", Some(PropertyDisplayModeV2::Visible)),
            ),
            Err(SetPropertyDisplayModeError::PropertyDoesNotExist)
        );

        // Unknown scope table name.
        assert_eq!(
            set_property_display_mode(
                &connection,
                input("prop_a", "not_a_scope", Some(PropertyDisplayModeV2::Visible)),
            ),
            Err(SetPropertyDisplayModeError::InvalidTableName)
        );
    }
}

/// Validate a `properties_v2` patch against a table scope: returns the first
/// key that is not a defined-and-visible property for `table_name` (callers
/// map it to their `UnknownPropertyKey` error — rejected rather than written,
/// since the read path would silently filter it out). Shared by the
/// properties-v2 write paths (patient, invoice).
pub(crate) fn check_unknown_property_v2_key(
    connection: &StorageConnection,
    table_name: &str,
    patch: &serde_json::Map<String, serde_json::Value>,
) -> Result<Option<String>, RepositoryError> {
    let allowed = PropertyV2Repository::new(connection).allowed_keys_for_table(table_name)?;
    Ok(patch
        .keys()
        .find(|key| !allowed.contains(*key))
        .cloned())
}

/// Apply an optional `properties_v2` patch during a record update: `None`
/// leaves the blob untouched; `Some` patch-merges over it via [`merge_patch`].
pub(crate) fn apply_properties_v2_patch(
    existing: Option<serde_json::Value>,
    patch: Option<serde_json::Map<String, serde_json::Value>>,
) -> Option<serde_json::Value> {
    match patch {
        None => existing,
        Some(patch) => merge_patch(existing, patch),
    }
}

/// Merge a key→value patch into an existing `properties_v2` blob.
///
/// A `null` value removes the key; any other value sets it. Returns `None` when
/// the result is empty so an emptied blob becomes NULL rather than `{}`.
/// Shared by the properties-v2 write paths (patient, invoice).
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
