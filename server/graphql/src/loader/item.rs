use domain::item::Item;
use domain::{EqualFilter, Pagination};
use repository::{ItemFilter, ItemQueryRepository};
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
        let repo = ItemQueryRepository::new(&connection);
        let result = repo
            .query(
                Pagination {
                    limit: keys.len() as u32,
                    offset: 0,
                },
                Some(ItemFilter::new().id(EqualFilter::equal_any(keys.to_vec()))),
                None,
            )?
            .into_iter()
            .map(|item| {
                let id = item.id.clone();
                let item = item;
                (id, item)
            })
            .collect();
        Ok(result)
    }
}
