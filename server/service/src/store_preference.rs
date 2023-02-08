use repository::{
    RepositoryError, StorageConnection, StorePreferenceRow, StorePreferenceRowRepository,
};

pub fn get_store_preferences(
    connection: &StorageConnection,
    store_id: &str,
) -> Result<Option<StorePreferenceRow>, RepositoryError> {
    Ok(StorePreferenceRowRepository::new(&connection).find_one_by_id(store_id)?)
}
