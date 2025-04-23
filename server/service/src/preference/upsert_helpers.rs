use repository::{PreferenceRow, PreferenceRowRepository, RepositoryError, StorageConnection};

pub fn upsert_global(
    connection: &StorageConnection,
    key: &str,
    value: String,
) -> Result<(), RepositoryError> {
    // tODO
    // CentralServerConfig::is_central_server()
    let repo = PreferenceRowRepository::new(connection);

    let pref = PreferenceRow {
        id: format!("{}_global", key),
        key: key.to_string(),
        value,
        store_id: None,
    };

    repo.upsert_one(&pref)?;
    Ok(())
}

pub fn upsert_store(
    connection: &StorageConnection,
    key: &str,
    value: String,
    store_id: String,
) -> Result<(), RepositoryError> {
    // validate - is this store, or central?

    let repo = PreferenceRowRepository::new(connection);

    let pref = PreferenceRow {
        id: format!("{}_{}", key, store_id),
        key: key.to_string(),
        value,
        store_id: Some(store_id),
    };

    repo.upsert_one(&pref)?;
    Ok(())
}
