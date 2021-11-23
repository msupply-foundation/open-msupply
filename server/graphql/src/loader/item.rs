use repository::{schema::ItemRow, ItemRepository, RepositoryError, StorageConnectionManager};

use async_graphql::dataloader::*;
use async_graphql::*;
use std::collections::HashMap;

pub struct ItemLoader {
    pub connection_manager: StorageConnectionManager,
}

#[async_trait::async_trait]
impl Loader<String> for ItemLoader {
    type Value = ItemRow;
    type Error = RepositoryError;

    async fn load(&self, keys: &[String]) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let connection = self.connection_manager.connection()?;
        let repo = ItemRepository::new(&connection);
        let result = repo
            .find_many_by_id(keys)
            .unwrap()
            .iter()
            .map(|item: &ItemRow| {
                let item_id = item.id.clone();
                let item = item.clone();
                (item_id, item)
            })
            .collect();
        Ok(result)
    }
}
