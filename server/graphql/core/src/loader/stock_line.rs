use repository::EqualFilter;
use repository::{
    RepositoryError, StockLine, StockLineFilter, StockLineRepository, StorageConnectionManager,
};

use async_graphql::dataloader::*;
use async_graphql::*;
use std::collections::HashMap;

pub struct StockLineByLocationIdLoader {
    pub connection_manager: StorageConnectionManager,
}

impl Loader<String> for StockLineByLocationIdLoader {
    type Value = Vec<StockLine>;
    type Error = RepositoryError;

    async fn load(
        &self,
        location_ids: &[String],
    ) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let connection_manager = self.connection_manager.clone();
        let location_ids = location_ids.to_vec();

        tokio::task::spawn_blocking(
            move || -> Result<HashMap<String, Vec<StockLine>>, RepositoryError> {
                let connection = connection_manager.connection()?;
                let repo = StockLineRepository::new(&connection);

                let result = repo.query_by_filter(
                    StockLineFilter::new()
                        .location_id(EqualFilter::equal_any(location_ids))
                        .has_packs_in_store(true),
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
            },
        )
        .await
        .map_err(|e| RepositoryError::as_db_error("Loader blocking task failed", e))?
    }
}

pub struct StockLineByItemAndStoreIdLoader {
    pub connection_manager: StorageConnectionManager,
}

#[derive(Clone, PartialEq, Eq, Hash)]
pub struct StockLineByItemAndStoreIdLoaderInput {
    pub store_id: String,
    pub item_id: String,
}
impl StockLineByItemAndStoreIdLoaderInput {
    pub fn new(store_id: &str, item_id: &str) -> Self {
        StockLineByItemAndStoreIdLoaderInput {
            store_id: store_id.to_string(),
            item_id: item_id.to_string(),
        }
    }
}

impl Loader<StockLineByItemAndStoreIdLoaderInput> for StockLineByItemAndStoreIdLoader {
    type Value = Vec<StockLine>;
    type Error = RepositoryError;

    async fn load(
        &self,
        item_and_store_ids: &[StockLineByItemAndStoreIdLoaderInput],
    ) -> Result<HashMap<StockLineByItemAndStoreIdLoaderInput, Self::Value>, Self::Error> {
        let connection_manager = self.connection_manager.clone();
        let item_and_store_ids = item_and_store_ids.to_vec();

        tokio::task::spawn_blocking(
            move || -> Result<
                HashMap<StockLineByItemAndStoreIdLoaderInput, Vec<StockLine>>,
                RepositoryError,
            > {
                let connection = connection_manager.connection()?;
                let repo = StockLineRepository::new(&connection);

                let store_id = if let Some(item_and_store_ids) = item_and_store_ids.first() {
                    item_and_store_ids.store_id.clone()
                } else {
                    return Ok(HashMap::new());
                };

                let item_ids = util::dedup_iter(
                    item_and_store_ids.iter().map(|input| input.item_id.clone()),
                );

                let result = repo.query_by_filter(
                    StockLineFilter::new()
                        .item_id(EqualFilter::equal_any(item_ids))
                        .store_id(EqualFilter::equal_to(store_id.to_string()))
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
            },
        )
        .await
        .map_err(|e| RepositoryError::as_db_error("Loader blocking task failed", e))?
    }
}

pub struct StockLineByIdLoader {
    pub connection_manager: StorageConnectionManager,
}

impl Loader<String> for StockLineByIdLoader {
    type Value = StockLine;
    type Error = RepositoryError;

    async fn load(&self, ids: &[String]) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let connection_manager = self.connection_manager.clone();
        let ids = ids.to_vec();

        tokio::task::spawn_blocking(
            move || -> Result<HashMap<String, StockLine>, RepositoryError> {
                let connection = connection_manager.connection()?;
                let repo = StockLineRepository::new(&connection);

                let result = repo.query_by_filter(
                    StockLineFilter::new().id(EqualFilter::equal_any(ids)),
                    None,
                )?;

                Ok(result
                    .into_iter()
                    .map(|stock_line| (stock_line.stock_line_row.id.clone(), stock_line))
                    .collect())
            },
        )
        .await
        .map_err(|e| RepositoryError::as_db_error("Loader blocking task failed", e))?
    }
}
