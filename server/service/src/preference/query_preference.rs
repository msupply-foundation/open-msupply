use repository::{
    EqualFilter, PreferenceFilter, PreferenceRepository, PreferenceRow, RepositoryError,
    StorageConnection,
};

pub fn query_global(
    connection: &StorageConnection,
    key: &str,
) -> Result<Option<PreferenceRow>, RepositoryError> {
    PreferenceRepository::new(connection).query_one(
        PreferenceFilter::new()
            .key(EqualFilter::equal_to(key.to_owned()))
            .store_id(EqualFilter::is_null(true)),
    )
}

pub fn query_store(
    connection: &StorageConnection,
    key: &str,
    store_id: &str,
) -> Result<Option<PreferenceRow>, RepositoryError> {
    PreferenceRepository::new(connection).query_one(
        PreferenceFilter::new()
            .key(EqualFilter::equal_to(key.to_owned()))
            .store_id(EqualFilter::equal_to(store_id.to_string())),
    )
}

// Not used yet, but example of how we could merge/override
pub fn _query_store_with_global_default(
    connection: &StorageConnection,
    key: &str,
    store_id: &str,
) -> Result<Option<PreferenceRow>, RepositoryError> {
    // If there is a store-specific preference, that should override any global preference
    let store_pref = query_store(connection, key, store_id)?;
    // Otherwise let's see if there is a globally defined default
    let global_pref = query_global(connection, key)?;

    Ok(store_pref.or(global_pref))
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::mock::{mock_store_a, MockDataInserts};
    use repository::test_db::setup_all;
    use repository::{PreferenceRow, PreferenceRowRepository};

    #[actix_rt::test]
    async fn test_pref_query() {}

    #[actix_rt::test]
    async fn test_query_store_with_global_default() {
        let (_, connection, _, _) = setup_all(
            "query_store_with_global_default",
            MockDataInserts::none().stores(),
        )
        .await;

        let prefs_repo = PreferenceRowRepository::new(&connection);

        let key = "test_pref";

        // Insert a global pref
        prefs_repo
            .upsert_one(&PreferenceRow {
                id: "test_pref_global".to_string(),
                key: key.to_string(),
                value: "global".to_string(),
                store_id: None,
            })
            .unwrap();

        // Insert store override for store A
        prefs_repo
            .upsert_one(&PreferenceRow {
                id: "test_pref_store_a".to_string(),
                key: key.to_string(),
                value: "store A says hey".to_string(),
                store_id: Some(mock_store_a().id),
            })
            .unwrap();

        // Should return the store pref, as one exists
        let pref =
            _query_store_with_global_default(&connection, key, mock_store_a().id.as_str()).unwrap();

        assert_eq!(pref.unwrap().value, "store A says hey");

        // Should return the global pref, as no store pref exists for store B
        let pref = _query_store_with_global_default(&connection, key, "store_b").unwrap();

        assert_eq!(pref.unwrap().value, "global");
    }
}
