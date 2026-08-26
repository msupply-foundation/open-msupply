use repository::{
    RepositoryError, StorageConnection, StorePreferenceRow, StorePreferenceRowRepository,
};

// TODO: migrate to preferences table
// These are existing store preferences from OG. New store prefs should be configured
// through the preferences API
pub fn get_store_preferences(
    connection: &StorageConnection,
    store_id: &str,
) -> Result<StorePreferenceRow, RepositoryError> {
    let store_preferences =
        StorePreferenceRowRepository::new(connection).find_one_by_id_or_default(store_id)?;
    Ok(store_preferences)
}

// Note: If you want to get a new OMS preference, you can access it from the preference directly like this
// let can_manage = ManageVvmStatus.load(connection, store_id);
