use repository::{
    EqualFilter, PreferenceFilter, PreferenceRepository, PreferenceRow, RepositoryError,
    StorageConnection, StoreFilter, StoreRepository,
};

use super::types::OverridingStore;

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

/// The stores that pin their own value for this key rather than following the
/// global row — what the global listing names, so an admin can see which
/// stores will not follow the value they are editing. Ordered by store name,
/// which is the order the list is read in.
///
/// Named from the STORES, not from the preference rows: a row whose store no
/// longer exists names nothing and is left out, so the list and its length can
/// never disagree with each other.
pub fn query_overriding_stores(
    connection: &StorageConnection,
    key: &str,
) -> Result<Vec<OverridingStore>, RepositoryError> {
    let store_ids: Vec<String> = PreferenceRepository::new(connection)
        .query_by_filter(
            PreferenceFilter::new()
                .key(EqualFilter::equal_to(key.to_owned()))
                .store_id(EqualFilter::is_null(false)),
        )?
        .into_iter()
        .filter_map(|row| row.store_id)
        .collect();
    // An empty `equal_any` matches every store, not none.
    if store_ids.is_empty() {
        return Ok(Vec::new());
    }

    let mut stores: Vec<OverridingStore> = StoreRepository::new(connection)
        .query_by_filter(StoreFilter::new().id(EqualFilter::equal_any(store_ids)))?
        .into_iter()
        .map(|store| OverridingStore {
            store_id: store.store_row.id,
            store_name: store.name_row.name,
        })
        .collect();
    stores.sort_by_key(|store| store.store_name.to_lowercase());
    Ok(stores)
}

pub fn query_store_with_global_default(
    connection: &StorageConnection,
    key: &str,
    store_id: &str,
) -> Result<Option<PreferenceRow>, RepositoryError> {
    // A store-specific preference overrides any global preference
    if let Some(store_pref) = query_store(connection, key, store_id)? {
        return Ok(Some(store_pref));
    }
    // Otherwise fall back to the globally defined default, if any
    query_global(connection, key)
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::mock::{MockDataInserts, mock_store_a};
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
            query_store_with_global_default(&connection, key, mock_store_a().id.as_str()).unwrap();

        assert_eq!(pref.unwrap().value, "store A says hey");

        // Should return the global pref, as no store pref exists for store B
        let pref = query_store_with_global_default(&connection, key, "store_b").unwrap();

        assert_eq!(pref.unwrap().value, "global");
    }
}
