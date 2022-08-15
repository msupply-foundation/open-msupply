use repository::{
    EqualFilter, StoreRowRepository, UserPermission, UserPermissionFilter,
    UserPermissionRepository, UserStorePermissions,
};
use repository::{RepositoryError, StorageConnectionManager};

use async_graphql::dataloader::*;
use async_graphql::*;
use std::collections::HashMap;

use super::IdPair;

pub struct PermissionByIdsLoader {
    pub connection_manager: StorageConnectionManager,
}

#[derive(Clone)]
pub struct EmptyPayload;
pub type PermissionByIdsLoaderInput = IdPair<EmptyPayload>;
impl PermissionByIdsLoaderInput {
    pub fn new(store_id: &str, user_id: &str) -> Self {
        PermissionByIdsLoaderInput {
            primary_id: store_id.to_string(),
            secondary_id: user_id.to_string(),
            payload: EmptyPayload {},
        }
    }
}

#[async_trait::async_trait]
impl Loader<PermissionByIdsLoaderInput> for PermissionByIdsLoader {
    type Value = Vec<UserStorePermissions>;
    type Error = RepositoryError;

    async fn load(
        &self,
        ids: &[PermissionByIdsLoaderInput],
    ) -> Result<HashMap<PermissionByIdsLoaderInput, Self::Value>, Self::Error> {
        let connection = self.connection_manager.connection()?;
        let user_permission_repo = UserPermissionRepository::new(&connection);
        let store_repo = StoreRowRepository::new(&connection);

        let user_permissions = user_permission_repo.query_by_filter(
            UserPermissionFilter::new()
                .user_id(EqualFilter::equal_any(
                    ids.iter().map(|item| item.secondary_id.clone()).collect(),
                ))
                .store_id(EqualFilter::equal_any(
                    ids.iter().map(|item| item.primary_id.clone()).collect(),
                )),
        )?;
        let store = store_repo.find_one_by_id(&ids[0].primary_id)?;
        let mut result = HashMap::new();

        let user_store_permission = UserStorePermissions {
            store_row: store.clone().unwrap_or_default(),
            permissions: user_permissions.clone(),
        };

        result.insert(
            PermissionByIdsLoaderInput::new(&ids[0].primary_id, &ids[0].secondary_id),
            vec![user_store_permission],
        );

        Ok(result)
    }
}
