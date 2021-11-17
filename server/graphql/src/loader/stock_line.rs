use domain::stock_line::{StockLine, StockLineFilter};
use repository::{RepositoryError, StockLineRepository, StorageConnectionManager};

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

        let result =
            repo.query_filter_only(StockLineFilter::new().match_item_ids(item_ids.to_owned()))?;

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

        let result = repo.query_filter_only(StockLineFilter::new().match_ids(ids.to_owned()))?;

        Ok(result
            .into_iter()
            .map(|stock_line| (stock_line.id.clone(), stock_line))
            .collect())
    }
}
