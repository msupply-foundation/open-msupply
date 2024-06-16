use repository::{
    RepositoryError, StorageConnection, StorePreferenceRow, StorePreferenceRowRepository,
};

pub fn get_store_preferences(
    connection: &StorageConnection,
    store_id: &str,
) -> Result<StorePreferenceRow, RepositoryError> {
    let store_preferences = StorePreferenceRowRepository::new(connection)
        .find_one_by_id(store_id)?
        .unwrap_or_default();
    Ok(store_preferences)
}
