use repository::EqualFilter;
use repository::{
    RepositoryError, StockLine, StockLineFilter, StockLineRepository, StorageConnectionManager,
};

use async_graphql::dataloader::*;
use async_graphql::*;
use std::collections::HashMap;

use super::IdAndStoreId;

pub struct StockLineByLocationIdLoader {
    pub connection_manager: StorageConnectionManager,
}

#[async_trait::async_trait]
impl Loader<String> for StockLineByLocationIdLoader {
    type Value = Vec<StockLine>;
    type Error = RepositoryError;

    async fn load(
        &self,
        location_ids: &[String],
    ) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let connection = self.connection_manager.connection()?;
        let repo = StockLineRepository::new(&connection);

        let result = repo.query_by_filter(
            StockLineFilter::new().location_id(EqualFilter::equal_any(location_ids.to_owned())),
        )?;

        let mut result_map = HashMap::new();
        for stock_line in result {
            if let Some(location_id) = &stock_line.stock_line_row.location_id {
                result_map
                    .entry(location_id.clone())
                    .or_insert(Vec::new())
                    .push(stock_line);
            }
        }
        Ok(result_map)
    }
}

pub struct StockLineByItemAndStoreIdLoader {
    pub connection_manager: StorageConnectionManager,
}

#[async_trait::async_trait]
impl Loader<IdAndStoreId> for StockLineByItemAndStoreIdLoader {
    type Value = Vec<StockLine>;
    type Error = RepositoryError;

    async fn load(
        &self,
        item_and_store_ids: &[IdAndStoreId],
    ) -> Result<HashMap<IdAndStoreId, Self::Value>, Self::Error> {
        let connection = self.connection_manager.connection()?;
        let repo = StockLineRepository::new(&connection);

        let store_id = if let Some(item_and_store_ids) = item_and_store_ids.first() {
            &item_and_store_ids.store_id
        } else {
            return Ok(HashMap::new());
        };

        let result = repo.query_by_filter(
            StockLineFilter::new()
                .item_id(EqualFilter::equal_any(
                    item_and_store_ids
                        .iter()
                        .map(|item_and_store_id| item_and_store_id.id.clone())
                        .collect(),
                ))
                .store_id(EqualFilter::equal_to(store_id)),
        )?;

        let mut result_map = HashMap::new();
        for stock_line in result {
            result_map
                .entry(IdAndStoreId {
                    id: stock_line.stock_line_row.item_id.clone(),
                    store_id: store_id.clone(),
                })
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

        let result = repo
            .query_by_filter(StockLineFilter::new().id(EqualFilter::equal_any(ids.to_owned())))?;

        Ok(result
            .into_iter()
            .map(|stock_line| (stock_line.stock_line_row.id.clone(), stock_line))
            .collect())
    }
}
