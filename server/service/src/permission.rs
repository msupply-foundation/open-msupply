use std::collections::{HashMap, HashSet};

use repository::{
    EqualFilter, RepositoryError, StorageConnection, StoreRow, StoreRowRepository,
    UserPermissionFilter, UserPermissionRepository, UserPermissionRow,
};

#[derive(PartialEq, Debug, Clone)]
pub struct UserStorePermissions {
    pub store_row: StoreRow,
    pub permissions: Vec<UserPermissionRow>,
}

pub fn permissions(
    connection: &StorageConnection,
    user_id: &str,
    store: Option<String>,
) -> Result<Vec<UserStorePermissions>, RepositoryError> {
    let user_permission_repo = UserPermissionRepository::new(connection);
    let store_repo = StoreRowRepository::new(connection);

    let mut filter =
        UserPermissionFilter::new().user_id(EqualFilter::equal_to(user_id.to_string()));
    if let Some(store) = store {
        filter = filter.store_id(EqualFilter::equal_to(store.to_owned()))
    }
    let permissions = user_permission_repo.query_by_filter(filter)?;

    let mut permissions_by_store: HashMap<String, Vec<UserPermissionRow>> = HashMap::new();
    let mut store_ids: HashSet<String> = HashSet::new();
    for permission in permissions {
        let store_id = match permission.store_id.clone() {
            Some(store_id) => store_id,
            None => continue,
        };

        store_ids.insert(store_id.clone());
        permissions_by_store
            .entry(store_id)
            .or_default()
            .push(permission);
    }

    let stores_by_id: HashMap<String, StoreRow> = store_repo
        .find_many_by_id(&store_ids.into_iter().collect::<Vec<_>>())?
        .into_iter()
        .map(|store| (store.id.clone(), store))
        .collect();

    let result = permissions_by_store
        .into_iter()
        .filter_map(|(store_id, permissions)| {
            stores_by_id
                .get(&store_id)
                .cloned()
                .map(|store_row| UserStorePermissions {
                    store_row,
                    permissions,
                })
        })
        .collect();

    Ok(result)
}
