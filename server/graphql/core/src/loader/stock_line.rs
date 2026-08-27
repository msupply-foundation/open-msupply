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
        let connection = self.connection_manager.connection()?;
        let repo = StockLineRepository::new(&connection);

        let result = repo.query_by_filter(
            StockLineFilter::new()
                .location_id(EqualFilter::equal_any(location_ids.to_owned()))
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
        let connection = self.connection_manager.connection()?;
        let repo = StockLineRepository::new(&connection);

        // The loader registry is shared across all requests, so a single batch can mix
        // inputs from different stores. Group item_ids by store_id and query each store
        // separately rather than assuming a single store for the whole batch.
        let mut store_item_map = HashMap::<String, Vec<String>>::new();
        for input in item_and_store_ids {
            store_item_map
                .entry(input.store_id.clone())
                .or_default()
                .push(input.item_id.clone());
        }

        let mut result_map = HashMap::new();
        for (store_id, item_ids) in store_item_map {
            let item_ids = util::dedup_iter(item_ids);

            let result = repo.query_by_filter(
                StockLineFilter::new()
                    .item_id(EqualFilter::equal_any(item_ids))
                    .store_id(EqualFilter::equal_to(store_id.to_string()))
                    .has_packs_in_store(true),
                None,
            )?;

            for stock_line in result {
                result_map
                    .entry(StockLineByItemAndStoreIdLoaderInput::new(
                        &store_id,
                        &stock_line.item_row.id,
                    ))
                    .or_insert(Vec::new())
                    .push(stock_line);
            }
        }
        Ok(result_map)
    }
}

pub struct StockLineByIdLoader {
    pub connection_manager: StorageConnectionManager,
}

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

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{
        mock::{
            mock_item_a, mock_item_a_lines, mock_item_b, mock_item_b_lines, mock_store_a,
            mock_store_b, MockData, MockDataInserts,
        },
        test_db,
    };

    // The loader registry is shared across requests, so a single batch can contain inputs
    // for multiple stores. Verify each (store, item) input resolves to its OWN store's
    // stock lines and does not get the previous store's results (the .first() bug).
    #[tokio::test]
    async fn stock_line_by_item_and_store_loader_batches_across_stores() {
        let (_, _, connection_manager, _) = test_db::setup_all_with_data(
            "stock_line_by_item_and_store_loader_batches_across_stores",
            MockDataInserts::none().units().items().names().stores(),
            MockData {
                // item_a lines live in store_a, item_b lines live in store_b
                stock_lines: mock_item_a_lines()
                    .into_iter()
                    .chain(mock_item_b_lines())
                    .collect(),
                ..Default::default()
            },
        )
        .await;

        let loader = StockLineByItemAndStoreIdLoader { connection_manager };

        let store_a_input =
            StockLineByItemAndStoreIdLoaderInput::new(&mock_store_a().id, &mock_item_a().id);
        let store_b_input =
            StockLineByItemAndStoreIdLoaderInput::new(&mock_store_b().id, &mock_item_b().id);

        let result = loader
            .load(&[store_a_input.clone(), store_b_input.clone()])
            .await
            .unwrap();

        // store_b's input resolves to store_b's lines (previously empty: the batch took
        // store_a as the only store and looked up item_b within store_a).
        assert_eq!(result.get(&store_a_input).unwrap().len(), 2);
        assert_eq!(result.get(&store_b_input).unwrap().len(), 2);
        // No cross-contamination: store_a's lines are all in store_a.
        assert!(result
            .get(&store_a_input)
            .unwrap()
            .iter()
            .all(|sl| sl.stock_line_row.store_id == mock_store_a().id));
    }
}
