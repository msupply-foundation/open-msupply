use repository::EqualFilter;
use repository::{
    RepositoryError, StockLine, StockLineFilter, StockLineRepository, StorageConnectionManager,
};

use async_graphql::dataloader::*;
use async_graphql::*;
use std::collections::HashMap;

use super::IdPair;

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
            None,
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

#[derive(Clone)]
pub struct EmptyPayload;
pub type StockLineByItemAndStoreIdLoaderInput = IdPair<EmptyPayload>;
impl StockLineByItemAndStoreIdLoaderInput {
    pub fn new(store_id: &str, item_id: &str) -> Self {
        StockLineByItemAndStoreIdLoaderInput {
            primary_id: store_id.to_string(),
            secondary_id: item_id.to_string(),
            payload: EmptyPayload {},
        }
    }
}

#[async_trait::async_trait]
impl Loader<StockLineByItemAndStoreIdLoaderInput> for StockLineByItemAndStoreIdLoader {
    type Value = Vec<StockLine>;
    type Error = RepositoryError;

    async fn load(
        &self,
        item_and_store_ids: &[StockLineByItemAndStoreIdLoaderInput],
    ) -> Result<HashMap<StockLineByItemAndStoreIdLoaderInput, Self::Value>, Self::Error> {
        let connection = self.connection_manager.connection()?;
        let repo = StockLineRepository::new(&connection);

        let store_id = if let Some(item_and_store_ids) = item_and_store_ids.first() {
            &item_and_store_ids.primary_id
        } else {
            return Ok(HashMap::new());
        };

        let result = repo.query_by_filter(
            StockLineFilter::new()
                .item_id(EqualFilter::equal_any(IdPair::get_all_secondary_ids(
                    &item_and_store_ids,
                )))
                .store_id(EqualFilter::equal_to(store_id))
                .has_packs_in_store(true),
            None,
        )?;

        let mut result_map = HashMap::new();
        for stock_line in result {
            result_map
                .entry(StockLineByItemAndStoreIdLoaderInput::new(
                    &store_id,
                    &stock_line.item_row.id,
                ))
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

        let result = repo.query_by_filter(
            StockLineFilter::new().id(EqualFilter::equal_any(ids.to_owned())),
            None,
        )?;

        Ok(result
            .into_iter()
            .map(|stock_line| (stock_line.stock_line_row.id.clone(), stock_line))
            .collect())
    }
}
