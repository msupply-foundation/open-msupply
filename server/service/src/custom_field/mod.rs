use std::collections::HashSet;

use repository::{
    CustomField, CustomFieldFilter, CustomFieldRepository, RepositoryError, StorageConnection,
};

use crate::{service_provider::ServiceContext, usize_to_u32, ListError, ListResult};

pub trait CustomFieldServiceTrait: Sync + Send {
    fn get_custom_fields(
        &self,
        ctx: &ServiceContext,
        filter: Option<CustomFieldFilter>,
    ) -> Result<ListResult<CustomField>, ListError> {
        get_custom_fields(&ctx.connection, filter)
    }

    fn allowed_custom_field_keys_for_table(
        &self,
        connection: &StorageConnection,
        table_name: &str,
    ) -> Result<HashSet<String>, RepositoryError> {
        CustomFieldRepository::new(connection).allowed_keys_for_table(table_name)
    }
}

pub struct CustomFieldService;
impl CustomFieldServiceTrait for CustomFieldService {}

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

/// Validate a `custom_fields` patch against a table scope: returns the first
/// key that is not a defined-and-visible custom_field for `table_name` (callers
/// map it to their `UnknownCustomFieldKey` error — rejected rather than written,
/// since the read path would silently filter it out). Shared by the
/// custom_fields-v2 write paths (patient, invoice).
pub(crate) fn check_unknown_custom_field_key(
    connection: &StorageConnection,
    table_name: &str,
    patch: &serde_json::Map<String, serde_json::Value>,
) -> Result<Option<String>, RepositoryError> {
    let allowed = CustomFieldRepository::new(connection).allowed_keys_for_table(table_name)?;
    Ok(patch
        .keys()
        .find(|key| !allowed.contains(*key))
        .cloned())
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
