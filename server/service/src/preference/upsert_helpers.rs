use repository::{PreferenceRow, PreferenceRowRepository, StorageConnection};

use crate::sync::CentralServerConfig;

use super::UpsertPreferenceError;

pub fn upsert_global(
    connection: &StorageConnection,
    key: String,
    value: String,
) -> Result<(), UpsertPreferenceError> {
    if !CentralServerConfig::is_central_server() {
        return Err(UpsertPreferenceError::NotACentralServer);
    }

    let repo = PreferenceRowRepository::new(connection);

    let pref = PreferenceRow {
        // We should only ever have one global preference per key - ID shape ensures upsert
        id: format!("{}_global", key),
        key,
        value,
        store_id: None,
    };

    repo.upsert_one(&pref)?;
    Ok(())
}

pub fn upsert_store(
    connection: &StorageConnection,
    key: String,
    value: String,
    store_id: String,
) -> Result<(), UpsertPreferenceError> {
    // Currently, only central server can edit store prefs. Might allow store to edit its own
    // preferences in the future
    if !CentralServerConfig::is_central_server() {
        return Err(UpsertPreferenceError::NotACentralServer);
    }

    let repo = PreferenceRowRepository::new(connection);

    let pref = PreferenceRow {
        // We should only ever have one store preference per key per store - ID shape ensures upsert
        id: format!("{}_{}", key, store_id),
        key,
        value,
        store_id: Some(store_id),
    };

    repo.upsert_one(&pref)?;
    Ok(())
}
