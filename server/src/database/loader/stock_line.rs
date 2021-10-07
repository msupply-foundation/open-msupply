use crate::database::repository::{RepositoryError, StockLineRepository, StorageConnectionManager};
use crate::database::schema::StockLineRow;

use async_graphql::dataloader::*;
use async_graphql::*;
use std::collections::HashMap;

pub struct StockLineLoader {
    pub connection_manager: StorageConnectionManager,
}

#[async_trait::async_trait]
impl Loader<String> for StockLineLoader {
    type Value = Vec<StockLineRow>;
    type Error = RepositoryError;

    async fn load(&self, item_ids: &[String]) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let item_ids: Vec<String> = item_ids.iter().map(|item_id| item_id.clone()).collect();

        let connection = self.connection_manager.connection()?;
        let repo = StockLineRepository::new(&connection);
        let result = repo.find_many_by_item_ids(item_ids)?;
        let mut result_map = HashMap::new();
        for item_row in result {
            result_map
                .entry(item_row.item_id.clone())
                .or_insert(Vec::new())
                .push(item_row);
        }
        Ok(result_map)
    }
}
