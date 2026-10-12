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
        id: format!("{key}_global"),
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
        id: format!("{key}_{store_id}"),
        key,
        value,
        store_id: Some(store_id),
    };

    repo.upsert_one(&pref)?;
    Ok(())
}

/// Remove a store's row for a key, so the store follows the global value
/// again. Deleting a row that isn't there is a no-op rather than an error —
/// the editor sends "use global" whether or not a row was ever written, and
/// `PreferenceRowRepository::delete` needs the row to build its changelog.
pub fn delete_store(
    connection: &StorageConnection,
    key: String,
    store_id: String,
) -> Result<(), UpsertPreferenceError> {
    if !CentralServerConfig::is_central_server() {
        return Err(UpsertPreferenceError::NotACentralServer);
    }

    let repo = PreferenceRowRepository::new(connection);
    // The same id shape upsert_store writes
    let id = format!("{key}_{store_id}");

    if repo.find_one_by_id(&id)?.is_none() {
        return Ok(());
    }

    repo.delete(&id)?;
    Ok(())
}
