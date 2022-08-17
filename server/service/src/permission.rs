use std::collections::HashMap;

use repository::{
    EqualFilter, RepositoryError, StorageConnectionManager, StoreRow, StoreRowRepository,
    UserPermissionFilter, UserPermissionRepository, UserPermissionRow,
};

#[derive(PartialEq, Debug, Clone)]
pub struct UserStorePermissions {
    pub store_row: StoreRow,
    pub permissions: Vec<UserPermissionRow>,
}

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

    let mut permissions_by_store = HashMap::new();
    for permission in permissions {
        let store_id = match permission.store_id.clone() {
            Some(store_id) => store_id,
            None => continue,
        };

        permissions_by_store
            .entry(store_id)
            .or_insert_with(Vec::new)
            .push(permission);
    }

    let mut result = Vec::new();
    for (store_id, permissions) in permissions_by_store {
        let store = match store_repo.find_one_by_id(&store_id)? {
            Some(store) => store,
            None => continue,
        };

        let user_store_permission = UserStorePermissions {
            store_row: store,
            permissions: permissions.clone(),
        };
        result.push(user_store_permission);
    }

    Ok(result)
}
