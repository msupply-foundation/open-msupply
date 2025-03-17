use repository::{
    RepositoryError, StorageConnection, StorePreferenceRow, StorePreferenceRowRepository,
};

pub fn get_store_preferences(
    connection: &StorageConnection,
    store_id: &str,
) -> Result<StorePreferenceRow, RepositoryError> {
    let store_preferences =
        StorePreferenceRowRepository::new(connection).find_one_by_id_or_default(store_id)?;
    Ok(store_preferences)
}
