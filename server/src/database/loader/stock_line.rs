use crate::database::repository::{RepositoryError, StockLineRepository, StorageConnectionManager};
use crate::domain::stock_line::StockLine;

use async_graphql::dataloader::*;
use async_graphql::*;
use std::collections::HashMap;

pub struct StockLineByItemIdLoader {
    pub connection_manager: StorageConnectionManager,
}

#[async_trait::async_trait]
impl Loader<String> for StockLineByItemIdLoader {
    type Value = Vec<StockLine>;
    type Error = RepositoryError;

    async fn load(&self, item_ids: &[String]) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let connection = self.connection_manager.connection()?;
        let repo = StockLineRepository::new(&connection);

        let result = repo.find_many_by_item_ids(item_ids)?;

        let mut result_map = HashMap::new();
        for stock_line in result {
            result_map
                .entry(stock_line.item_id.clone())
                .or_insert(Vec::new())
                .push(stock_line);
        }
        Ok(result_map)
    }
}

pub struct StockLineByIdLoader {
    pub connection_manager: StorageConnectionManager,
}

#[async_trait::async_trait]
impl Loader<String> for StockLineByIdLoader {
    type Value = StockLine;
    type Error = RepositoryError;

    async fn load(&self, ids: &[String]) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let connection = self.connection_manager.connection()?;
        let repo = StockLineRepository::new(&connection);

        Ok(repo
            .find_many_by_ids(ids)?
            .into_iter()
            .map(|record| (record.id.clone(), record))
            .collect())
    }
}
