use crate::database::repository::{RepositoryError, StoreRepository};
use crate::database::schema::StoreRow;

use async_graphql::dataloader::*;
use async_graphql::*;
use std::collections::HashMap;

pub struct StoreLoader {
    pub store_repository: StoreRepository,
}

#[async_trait::async_trait]
impl Loader<String> for StoreLoader {
    type Value = StoreRow;
    type Error = RepositoryError;

    async fn load(&self, keys: &[String]) -> Result<HashMap<String, Self::Value>, Self::Error> {
        Ok(self
            .store_repository
            .find_many_by_id(keys)
            .await
            .unwrap()
            .iter()
            .map(|store: &StoreRow| {
                let store_id = store.id.clone();
                let store = store.clone();
                (store_id, store)
            })
            .collect())
    }
}
