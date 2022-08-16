use std::collections::HashMap;

use repository::{
    EqualFilter, RepositoryError, StorageConnectionManager, StoreRowRepository,
    UserPermissionFilter, UserPermissionRepository, UserStorePermissions,
};

pub fn permission_by_store(
    connection_manager: &StorageConnectionManager,
    store_id: &str,
    user_id: &str,
) -> Result<Vec<UserStorePermissions>, RepositoryError> {
    let connection = connection_manager.connection()?;
    let user_permission_repo = UserPermissionRepository::new(&connection);
    let store_repo = StoreRowRepository::new(&connection);

    let user_permissions = user_permission_repo.query_by_filter(
        UserPermissionFilter::new()
            .user_id(EqualFilter::equal_to(user_id))
            .store_id(EqualFilter::equal_to(store_id)),
    )?;
    let store = store_repo.find_one_by_id(&store_id)?;

    let user_store_permission = UserStorePermissions {
        store_row: store.clone().unwrap_or_default(),
        permissions: user_permissions.clone(),
    };
    Ok(vec![user_store_permission])
}

pub fn all_permissions(
    connection_manager: &StorageConnectionManager,
    user_id: &str,
) -> Result<Vec<UserStorePermissions>, RepositoryError> {
    let connection = connection_manager.connection()?;
    let user_permission_repo = UserPermissionRepository::new(&connection);
    let store_repo = StoreRowRepository::new(&connection);

    let permissions = user_permission_repo
        .query_by_filter(UserPermissionFilter::new().user_id(EqualFilter::equal_to(user_id)))?;
    let stores = store_repo.all()?;

    let mut permissions_by_store = HashMap::new();
    for permission in permissions {
        let store = stores
            .iter()
            .find(|store| store.id == permission.store_id.clone().unwrap_or("".to_string()))
            .unwrap();
        permissions_by_store
            .entry(store.id.clone())
            .or_insert_with(Vec::new)
            .push(permission);
    }

    let mut sorted_permission = HashMap::new();
    for (store_id, permissions) in permissions_by_store {
        let store = store_repo.find_one_by_id(&store_id)?;
        let user_store_permission = UserStorePermissions {
            store_row: store.clone().unwrap_or_default(),
            permissions: permissions.clone(),
        };
        sorted_permission.insert(store_id, vec![user_store_permission]);
    }
    let mut result = Vec::new();

    for (_, user_store_permissions) in sorted_permission {
        result.push(user_store_permissions.into_iter().next().unwrap());
    }
    Ok(result)
}
