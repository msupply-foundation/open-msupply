use std::collections::HashSet;

use repository::{
    PropertyV2, PropertyV2Filter, PropertyV2Repository, RepositoryError, StorageConnection,
};

use crate::{service_provider::ServiceContext, usize_to_u32, ListError, ListResult};

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
