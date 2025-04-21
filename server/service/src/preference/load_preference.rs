use repository::{
    EqualFilter, PreferenceFilter, PreferenceRepository, PreferenceRow, RepositoryError,
    StorageConnection,
};
use serde::{de::DeserializeOwned, Serialize};

use serde_json::json;

pub fn load_global(
    connection: &StorageConnection,
    key: &str,
) -> Result<Option<PreferenceRow>, RepositoryError> {
    PreferenceRepository::new(connection).query_one(
        PreferenceFilter::new()
            .key(EqualFilter::equal_to(key))
            .store_id(EqualFilter::is_null(true)),
    )
}

pub fn load_store(
    connection: &StorageConnection,
    key: &str,
    store_id: &str,
) -> Result<Option<PreferenceRow>, RepositoryError> {
    PreferenceRepository::new(connection).query_by_filter(
        PreferenceFilter::new()
            .key(EqualFilter::equal_to(key))
            .store_id(EqualFilter::equal_to(store_id)),
    )
}

pub fn load_store_with_global_default(
    connection: &StorageConnection,
    key: &str,
    store_id: &str,
) -> Result<Option<PreferenceRow>, RepositoryError> {
    let prefs_by_key = PreferenceRepository::new(connection).query_by_filter(
        PreferenceFilter::new()
            .key(EqualFilter::equal_to(key))
            .store_id(EqualFilter::equal_any_or_null(vec![store_id.to_string()])),
    )?;

    // If there is a store-specific preference, that should override any global preference
    let store_pref = prefs_by_key.iter().find(|pref| pref.store_id.is_some());
    // Otherwise let's see if there is a globally defined default
    let global_pref = prefs_by_key.iter().find(|pref| pref.store_id.is_none());

    store_pref.or(global_pref)
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::mock::{mock_store_a, MockDataInserts};
    use repository::test_db::setup_all;
    use repository::{PreferenceRow, PreferenceRowRepository};
    use serde::{Deserialize, Serialize};

    #[actix_rt::test]
    async fn test_load_global() {}

    #[actix_rt::test]
    async fn test_load_store() {}
}
