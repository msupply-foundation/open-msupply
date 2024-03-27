use repository::{EqualFilter, Item, ItemFilter, ItemRepository, Pagination};
use repository::{RepositoryError, StorageConnectionManager};

use async_graphql::dataloader::*;
use async_graphql::*;
use std::collections::HashMap;

pub struct ItemLoader {
    pub connection_manager: StorageConnectionManager,
}

#[async_trait::async_trait]
impl Loader<String> for ItemLoader {
    type Value = Item;
    type Error = RepositoryError;

    async fn load(&self, keys: &[String]) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let connection = self.connection_manager.connection()?;
        let repo = ItemRepository::new(&connection);
        let result = repo
            .query(
                Pagination {
                    limit: keys.len() as u32,
                    offset: 0,
                },
                Some(ItemFilter::new().id(EqualFilter::equal_any(keys.to_vec()))),
                None,
                None,
            )?
            .into_iter()
            .map(|item| {
                let id = item.item_row.id.clone();
                (id, item)
            })
            .collect();
        Ok(result)
    }
}
