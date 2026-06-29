use chrono::Utc;
use repository::{
    system_log_row::{SystemLogRow, SystemLogRowRepository, SystemLogType},
    LocationRowRepository, RepositoryError, StorageConnection,
};
use util::uuid::uuid;

/// Properties-v2 is a v7-era feature: the OG→OMS legacy import runs on the
/// central server only. A V5V6 remote (which still syncs v5 directly to OG
/// during transition) must not derive properties locally — it would surface
/// properties without the v7 infrastructure. Remotes receive `custom_fields`
/// from central via v7 instead. `build` is only invoked on the central server.
pub(crate) fn legacy_properties_if_central(
    build: impl FnOnce() -> Option<serde_json::Value>,
) -> Option<serde_json::Value> {
    if crate::sync::CentralServerConfig::is_central_server() {
        build()
    } else {
        None
    }
}

/// Accumulates legacy mSupply custom-field values into a `<table>.custom_fields`
/// JSONB blob. This is the shared abstraction behind every record kind's legacy
/// property import (name's `custom1/2/3`, item's `user_field_1..7`, …) so the
/// "untouched rows stay clean" rule lives in one place.
///
/// Each typed setter applies that type's 4D-default rule and omits the value
/// when it matches the default:
///  - [`text`](Self::text): empty/absent string,
///  - [`real`](Self::real): `0.0`/absent,
///  - [`boolean`](Self::boolean): `false`/absent (only `true` is stored).
///
/// 4D always serialises every custom column (sending `""`/`0`/`false` for fields
/// a record never configured), so storing defaults verbatim would attach noise
/// rows to *every* record. Omitting them keeps the read view sparse and lets
/// [`build`](Self::build) return `None` when nothing meaningful is set, so an
/// untouched row's `custom_fields` stays NULL rather than carrying an empty `{}`.
///
/// Each `key` must match a `custom_field.key` seeded by `central_mapping_custom_fields`,
/// and the setter's JSON type must match that property's `value_type`.
#[derive(Default)]
pub(crate) struct LegacyPropertiesBuilder {
    map: serde_json::Map<String, serde_json::Value>,
}

impl LegacyPropertiesBuilder {
    pub(crate) fn new() -> Self {
        Self::default()
    }

    /// Insert a TEXT-typed value, omitting empty/absent strings.
    pub(crate) fn text(mut self, key: &str, value: Option<&str>) -> Self {
        if let Some(v) = value.filter(|v| !v.is_empty()) {
            self.map
                .insert(key.to_string(), serde_json::Value::String(v.to_string()));
        }
        self
    }

    /// Insert a REAL-typed value, omitting `0.0`/absent (indistinguishable from
    /// the 4D Real default / "not set").
    pub(crate) fn real(mut self, key: &str, value: Option<f64>) -> Self {
        if let Some(num) = value.filter(|v| *v != 0.0).and_then(serde_json::Number::from_f64) {
            self.map
                .insert(key.to_string(), serde_json::Value::Number(num));
        }
        self
    }

    /// Insert an OPTION-typed value, omitting empty/absent. The stored value is
    /// the option's id string (matching a `custom_field_option.id`); the client
    /// resolves it to a display name. Behaves like [`text`](Self::text) on the
    /// wire — the distinct method documents intent at the call site.
    pub(crate) fn option(mut self, key: &str, value: Option<&str>) -> Self {
        if let Some(v) = value.filter(|v| !v.is_empty()) {
            self.map
                .insert(key.to_string(), serde_json::Value::String(v.to_string()));
        }
        self
    }

    /// Insert a BOOLEAN-typed value, storing only `true` — `false`/absent is the
    /// 4D Boolean default / "unchecked".
    pub(crate) fn boolean(mut self, key: &str, value: Option<bool>) -> Self {
        if value == Some(true) {
            self.map
                .insert(key.to_string(), serde_json::Value::Bool(true));
        }
        self
    }

    /// `Some(object)` when at least one non-default value was set, `None` when
    /// empty so the row's `custom_fields` stays NULL.
    pub(crate) fn build(self) -> Option<serde_json::Value> {
        if self.map.is_empty() {
            None
        } else {
            Some(serde_json::Value::Object(self.map))
        }
    }
}

/// Merge freshly legacy-derived properties into an existing `custom_fields` blob
/// without clobbering keys the legacy importer does not own.
///
/// The legacy OG→OMS import owns a fixed set of keys (`owned_keys`, e.g. name's
/// `custom_1/2/3`). Everything else in the blob is authored elsewhere — by an OMS
/// write path (e.g. patient custom-field edits). A v5 re-import must refresh only
/// the owned keys and leave the rest intact, otherwise a re-pull of an unchanged
/// OG record would wipe OMS-authored values (the whole-blob-overwrite hazard).
///
/// Behaviour:
///  - start from `existing` (treated as empty when `None`/not an object),
///  - drop every `owned_key` (so a value cleared on OG is removed, not kept stale),
///  - overlay `legacy_derived` (the fresh owned-key values; absent ones stay dropped),
///  - return `None` when the result is empty so an untouched row's `custom_fields`
///    stays NULL rather than carrying an empty `{}`.
pub(crate) fn merge_legacy_properties(
    existing: Option<serde_json::Value>,
    legacy_derived: Option<serde_json::Value>,
    owned_keys: &[&str],
) -> Option<serde_json::Value> {
    let mut map = match existing {
        Some(serde_json::Value::Object(map)) => map,
        _ => serde_json::Map::new(),
    };

    for key in owned_keys {
        map.remove(*key);
    }

    if let Some(serde_json::Value::Object(derived)) = legacy_derived {
        map.extend(derived);
    }

    if map.is_empty() {
        None
    } else {
        Some(serde_json::Value::Object(map))
    }
}

/// Validate an optional foreign key during sync translation.
///
/// If the FK is `Some` but the referenced record does not exist, this:
///  - if `log_if_missing` is true: logs an error and inserts a `system_log` row of type
///    `SyncTranslationFkError` (use for FKs the operator should be aware of)
///  - returns `Ok(None)` so the translated row can still be inserted
///
/// Pass `log_if_missing: false` when a missing FK is expected and not actionable — e.g. a
/// foreign-site invoice line referencing a location that only exists on the remote site.
///
/// If the FK is `None` or the referenced record exists, the input is returned unchanged.
pub(crate) fn clear_invalid_fk<F>(
    connection: &StorageConnection,
    record_table: &str,
    record_id: &str,
    fk_field: &str,
    fk_id: Option<String>,
    check_exists: F,
    log_if_missing: bool,
) -> Result<Option<String>, RepositoryError>
where
    F: FnOnce(&StorageConnection, &str) -> Result<bool, RepositoryError>,
{
    let Some(id) = fk_id else {
        return Ok(None);
    };

    if check_exists(connection, &id)? {
        return Ok(Some(id));
    }

    if log_if_missing {
        let message = format!(
            "Sync translation: foreign key not found, ensure the dependency was defined correctly in the translator. \
             table={record_table}, record_id={record_id}, fk_field={fk_field}, fk_id={id}"
        );
        log::error!("{message}");

        SystemLogRowRepository::new(connection).insert_one(&SystemLogRow {
            id: uuid(),
            r#type: SystemLogType::SyncTranslationFkError,
            sync_site_id: None,
            datetime: Utc::now().naive_utc(),
            message: Some(message),
            is_error: true,
        })?;
    }

    Ok(None)
}

pub(crate) fn clear_invalid_location_id(
    connection: &StorageConnection,
    location_id: Option<String>,
) -> Result<Option<String>, RepositoryError> {
    let location_id = if let Some(id) = location_id {
        LocationRowRepository::new(connection)
            .find_one_by_id(&id)?
            .map(|it| it.id)
    } else {
        None
    };
    Ok(location_id)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn legacy_properties_builder_none_when_all_default() {
        // Empty/absent strings, 0.0, false and None all match the 4D default and
        // are omitted — an all-default record builds to None (NULL custom_fields).
        let result = LegacyPropertiesBuilder::new()
            .text("a", None)
            .text("b", Some(""))
            .real("c", None)
            .real("d", Some(0.0))
            .boolean("e", None)
            .boolean("f", Some(false))
            .option("g", None)
            .option("h", Some(""))
            .build();
        assert_eq!(result, None);
    }

    #[test]
    fn legacy_properties_builder_keeps_only_non_default_values() {
        let result = LegacyPropertiesBuilder::new()
            .text("text", Some("hello"))
            .text("empty", Some(""))
            .real("real", Some(12.5))
            .real("zero", Some(0.0))
            .boolean("checked", Some(true))
            .boolean("unchecked", Some(false))
            .option("option", Some("opt_id"))
            .option("no_option", Some(""))
            .build();
        assert_eq!(
            result,
            Some(json!({ "text": "hello", "real": 12.5, "checked": true, "option": "opt_id" }))
        );
    }

    const OWNED: &[&str] = &["custom_1", "custom_2", "custom_3"];

    #[test]
    fn merge_legacy_properties_preserves_non_owned_keys() {
        // OMS-authored key `patient_note` survives a re-import; owned `custom_1`
        // is refreshed from the legacy-derived value.
        let result = merge_legacy_properties(
            Some(json!({ "custom_1": "old", "patient_note": "keep me" })),
            Some(json!({ "custom_1": "new" })),
            OWNED,
        );
        assert_eq!(
            result,
            Some(json!({ "custom_1": "new", "patient_note": "keep me" }))
        );
    }

    #[test]
    fn merge_legacy_properties_clears_owned_when_legacy_absent() {
        // A value cleared on OG (legacy_derived omits it) is dropped, not kept stale,
        // but non-owned keys remain.
        let result = merge_legacy_properties(
            Some(json!({ "custom_1": "was set", "patient_note": "keep" })),
            None,
            OWNED,
        );
        assert_eq!(result, Some(json!({ "patient_note": "keep" })));
    }

    #[test]
    fn merge_legacy_properties_none_when_empty() {
        // Owned-only blob with nothing derived collapses back to NULL.
        let result =
            merge_legacy_properties(Some(json!({ "custom_2": "x" })), None, OWNED);
        assert_eq!(result, None);
        // Both absent stays NULL.
        assert_eq!(merge_legacy_properties(None, None, OWNED), None);
    }

    #[test]
    fn merge_legacy_properties_from_null_existing() {
        // First import on a fresh row.
        let result =
            merge_legacy_properties(None, Some(json!({ "custom_1": "a" })), OWNED);
        assert_eq!(result, Some(json!({ "custom_1": "a" })));
    }
}
