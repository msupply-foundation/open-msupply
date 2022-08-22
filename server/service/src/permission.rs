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

pub fn permissions(
    connection_manager: &StorageConnectionManager,
    user_id: &str,
    store: Option<String>,
) -> Result<Vec<UserStorePermissions>, RepositoryError> {
    let connection = connection_manager.connection()?;
    let user_permission_repo = UserPermissionRepository::new(&connection);
    let store_repo = StoreRowRepository::new(&connection);

    let mut filter = UserPermissionFilter::new().user_id(EqualFilter::equal_to(user_id));
    if let Some(store) = store {
        filter = filter.store_id(EqualFilter::equal_to(&store))
    }
    let permissions = user_permission_repo.query_by_filter(filter)?;

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
