use crate::database::repository::{ItemLineRepository, RepositoryError};
use crate::database::schema::ItemLineRow;

use async_graphql::dataloader::*;
use async_graphql::*;
use std::collections::HashMap;

pub struct ItemLineLoader {
    pub item_line_repository: ItemLineRepository,
}

#[async_trait::async_trait]
impl Loader<String> for ItemLineLoader {
    type Value = ItemLineRow;
    type Error = RepositoryError;

    async fn load(&self, keys: &[String]) -> Result<HashMap<String, Self::Value>, Self::Error> {
        Ok(self
            .item_line_repository
            .find_many_by_id(keys)
            .await
            .unwrap()
            .iter()
            .map(|item_line: &ItemLineRow| {
                let item_line_id = item_line.id.clone();
                let item_line = item_line.clone();
                (item_line_id, item_line)
            })
            .collect())
    }
}
