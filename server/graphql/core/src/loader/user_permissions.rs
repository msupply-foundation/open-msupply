use repository::{EqualFilter, UserPermission, UserPermissionFilter, UserPermissionRepository};
use repository::{RepositoryError, StorageConnectionManager};

use async_graphql::dataloader::*;
use async_graphql::*;
use std::collections::HashMap;

use super::IdPair;

pub struct PermissionByIdLoader {
    pub connection_manager: StorageConnectionManager,
}

#[derive(Clone)]
pub struct EmptyPayload;
pub type PermissionByIdLoaderInput = IdPair<EmptyPayload>;
impl PermissionByIdLoaderInput {
    pub fn new(store_id: &str, user_id: &str) -> Self {
        PermissionByIdLoaderInput {
            primary_id: store_id.to_string(),
            secondary_id: user_id.to_string(),
            payload: EmptyPayload {},
        }
    }
}

#[async_trait::async_trait]
impl Loader<PermissionByIdLoaderInput> for PermissionByIdLoader {
    type Value = Vec<UserPermission>;
    type Error = RepositoryError;

    async fn load(
        &self,
        ids: &[PermissionByIdLoaderInput],
    ) -> Result<HashMap<PermissionByIdLoaderInput, Self::Value>, Self::Error> {
        let connection = self.connection_manager.connection()?;
        let repo = UserPermissionRepository::new(&connection);

        let permissions = repo.query_by_filter(
            UserPermissionFilter::new()
                .user_id(EqualFilter::equal_any(
                    ids.iter().map(|item| item.secondary_id.clone()).collect(),
                ))
                .store_id(EqualFilter::equal_any(
                    ids.iter().map(|item| item.primary_id.clone()).collect(),
                )),
        )?;

        let mut map: HashMap<PermissionByIdLoaderInput, Vec<UserPermission>> = HashMap::new();
        for permission in permissions {
            let list = map
                .entry(PermissionByIdLoaderInput::new(
                    &permission.store_id.clone().unwrap_or("".to_string()),
                    &permission.user_id.clone(),
                ))
                .or_insert_with(|| Vec::<UserPermission>::new());
            list.push(permission);
        }
        Ok(map)
    }
}
