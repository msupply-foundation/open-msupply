use chrono::Utc;
use repository::{
    system_log_row::{SystemLogRow, SystemLogRowRepository, SystemLogType},
    LocationRowRepository, RepositoryError, StorageConnection,
};
use util::uuid::uuid;

/// Custom fields is a v7-era feature: the OG→OMS legacy import runs on the
/// central server only. A V5V6 remote (which still syncs v5 directly to OG
/// during transition) must not derive custom fields locally — it would surface
/// custom fields without the v7 infrastructure. Remotes receive `custom_fields`
/// from central via v7 instead. `build` is only invoked on the central server.
pub(crate) fn legacy_custom_fields_if_central(
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
/// custom field import (name's `custom1/2/3`, item's `user_field_1..7`, …) so the
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
/// and the setter's JSON type must match that custom field's `value_type`.
#[derive(Default)]
pub(crate) struct LegacyCustomFieldsBuilder {
    map: serde_json::Map<String, serde_json::Value>,
}

impl LegacyCustomFieldsBuilder {
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

/// Merge freshly legacy-derived custom fields into an existing `custom_fields` blob
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
pub(crate) fn merge_legacy_custom_fields(
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
    fn legacy_custom_fields_builder_none_when_all_default() {
        // Empty/absent strings, 0.0, false and None all match the 4D default and
        // are omitted — an all-default record builds to None (NULL custom_fields).
        let result = LegacyCustomFieldsBuilder::new()
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
    fn legacy_custom_fields_builder_keeps_only_non_default_values() {
        let result = LegacyCustomFieldsBuilder::new()
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
    fn merge_legacy_custom_fields_preserves_non_owned_keys() {
        // OMS-authored key `patient_note` survives a re-import; owned `custom_1`
        // is refreshed from the legacy-derived value.
        let result = merge_legacy_custom_fields(
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
    fn merge_legacy_custom_fields_clears_owned_when_legacy_absent() {
        // A value cleared on OG (legacy_derived omits it) is dropped, not kept stale,
        // but non-owned keys remain.
        let result = merge_legacy_custom_fields(
            Some(json!({ "custom_1": "was set", "patient_note": "keep" })),
            None,
            OWNED,
        );
        assert_eq!(result, Some(json!({ "patient_note": "keep" })));
    }

    #[test]
    fn merge_legacy_custom_fields_none_when_empty() {
        // Owned-only blob with nothing derived collapses back to NULL.
        let result =
            merge_legacy_custom_fields(Some(json!({ "custom_2": "x" })), None, OWNED);
        assert_eq!(result, None);
        // Both absent stays NULL.
        assert_eq!(merge_legacy_custom_fields(None, None, OWNED), None);
    }

    #[test]
    fn merge_legacy_custom_fields_from_null_existing() {
        // First import on a fresh row.
        let result =
            merge_legacy_custom_fields(None, Some(json!({ "custom_1": "a" })), OWNED);
        assert_eq!(result, Some(json!({ "custom_1": "a" })));
    }
}

/// A pair of JSON key names for a single field that was renamed in Rust but whose former
/// name must stay on the sync wire for cross-version compatibility:
///  - `.0` = the canonical key: the field's current Rust name (e.g. `name_id`), which serde
///    emits and expects natively.
///  - `.1` = the legacy alias key: the field's former wire name (e.g. `name_link_id`).
///
/// The motivating case is the name_link / entity-link abstraction (PR #10181), which renamed
/// the foreign-key fields from `*_link_id` to `*_id`. Remotes <= v2.16 speak only the legacy
/// `*_link_id`; the v2.17 - v2.19 window speaks only the bare `*_id` (where the Rust rename
/// leaked onto the wire); v2.20+ remotes - speak both. Because no released remote ever set `SYNC_V6_VERSION` differently for these formats,
/// central can't tell which name a given remote understands, so the helpers below let it emit
/// both at once.
pub(crate) type RenamedKeys = &'static [(&'static str, &'static str)];

/// Outgoing (central -> remote on pull, and remote -> central on push): serialise `row` under
/// its canonical field names, then duplicate each canonical value under its legacy alias key
/// so a remote that still expects the old name finds it. The extra key is an ignored unknown
/// field for remotes that don't use it, so emitting both is always safe.
pub(crate) fn to_renamed_keys_value<T: serde::Serialize>(
    row: &T,
    keys: RenamedKeys,
) -> Result<serde_json::Value, serde_json::Error> {
    let mut value = serde_json::to_value(row)?;
    if let Some(object) = value.as_object_mut() {
        for (canonical_key, alias_key) in keys {
            if let Some(canonical_value) = object.get(*canonical_key).cloned() {
                object.insert((*alias_key).to_string(), canonical_value);
            }
        }
    }
    Ok(value)
}

/// Incoming (parse before deserialise): fold each legacy alias key onto the canonical key that
/// the row struct expects. This accepts records that carry only the old alias name and strips
/// the redundant alias from records that carry both names.
///
/// When a record carries *both* names they must agree: central emits the two keys with the
/// same value, so disagreement means a malformed or tampered record where we can't tell which
/// value was intended. Rather than silently pick one, this errors out.
pub(crate) fn from_renamed_keys_str<T: serde::de::DeserializeOwned>(
    data: &str,
    keys: RenamedKeys,
) -> Result<T, serde_json::Error> {
    use serde::de::Error as _;

    let mut value: serde_json::Value = serde_json::from_str(data)?;
    if let Some(object) = value.as_object_mut() {
        for (canonical_key, alias_key) in keys {
            if let Some(alias_value) = object.remove(*alias_key) {
                if let Some(canonical_value) = object.get(*canonical_key) {
                    // Both names present: they must agree, otherwise we can't tell which value
                    // the record meant. (Equal values just drop the redundant alias.)
                    if *canonical_value != alias_value {
                        return Err(serde_json::Error::custom(format!(
                            "sync record carries conflicting values for `{canonical_key}` \
                             ({canonical_value}) and `{alias_key}` ({alias_value})"
                        )));
                    }
                } else {
                    // Only the legacy alias present: promote it to the canonical key.
                    object.insert((*canonical_key).to_string(), alias_value);
                }
            }
        }
    }
    serde_json::from_value(value)
}

#[cfg(test)]
mod renamed_keys_tests {
    use super::*;
    use serde::{Deserialize, Serialize};
    use serde_json::json;

    // `.0` canonical (current Rust name), `.1` legacy alias.
    const KEYS: RenamedKeys = &[("name_id", "name_link_id")];

    #[derive(Serialize, Deserialize, Debug, PartialEq, Default)]
    struct Row {
        id: String,
        name_id: String,
    }

    #[test]
    fn emits_both_canonical_and_alias_keys() {
        let row = Row {
            id: "r1".to_string(),
            name_id: "n1".to_string(),
        };
        let value = to_renamed_keys_value(&row, KEYS).unwrap();
        assert_eq!(value["name_id"], "n1");
        assert_eq!(value["name_link_id"], "n1");
    }

    #[test]
    fn accepts_canonical_only() {
        // A v2.17 - v2.19 remote sends only the canonical `name_id`.
        let row: Row =
            from_renamed_keys_str(&json!({"id": "r1", "name_id": "n1"}).to_string(), KEYS).unwrap();
        assert_eq!(row.name_id, "n1");
    }

    #[test]
    fn accepts_legacy_alias_only() {
        // A <= v2.16 remote sends only the legacy `name_link_id`; promote it.
        let row: Row =
            from_renamed_keys_str(&json!({"id": "r1", "name_link_id": "n1"}).to_string(), KEYS)
                .unwrap();
        assert_eq!(row.name_id, "n1");
    }

    #[test]
    fn accepts_both_matching() {
        // Central emits both; a same-version remote/central must read it back.
        let row: Row = from_renamed_keys_str(
            &json!({"id": "r1", "name_id": "n1", "name_link_id": "n1"}).to_string(),
            KEYS,
        )
        .unwrap();
        assert_eq!(row.name_id, "n1");
    }

    #[test]
    fn rejects_conflicting_values() {
        // Both names present but disagreeing — we can't tell which value was intended.
        let result: Result<Row, _> = from_renamed_keys_str(
            &json!({"id": "r1", "name_id": "n1", "name_link_id": "n2"}).to_string(),
            KEYS,
        );
        assert!(result.is_err());
    }

    #[test]
    fn round_trips_through_the_wire() {
        let row = Row {
            id: "r1".to_string(),
            name_id: "n1".to_string(),
        };
        let wire = to_renamed_keys_value(&row, KEYS).unwrap();
        let parsed: Row = from_renamed_keys_str(&wire.to_string(), KEYS).unwrap();
        assert_eq!(row, parsed);
    }
}
