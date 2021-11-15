use repository::{schema::StoreRow, RepositoryError, StorageConnectionManager, StoreRepository};

use async_graphql::dataloader::*;
use async_graphql::*;
use std::collections::HashMap;

pub struct StoreLoader {
    pub connection_manager: StorageConnectionManager,
}

#[async_trait::async_trait]
impl Loader<String> for StoreLoader {
    type Value = StoreRow;
    type Error = RepositoryError;

    async fn load(&self, keys: &[String]) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let connection = self.connection_manager.connection()?;
        let repo = StoreRepository::new(&connection);
        Ok(repo
            .find_many_by_id(keys)
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
