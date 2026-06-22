use chrono::Utc;
use repository::{
    system_log_row::{SystemLogRow, SystemLogRowRepository, SystemLogType},
    LocationRowRepository, RepositoryError, StorageConnection,
};
use util::uuid::uuid;

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
