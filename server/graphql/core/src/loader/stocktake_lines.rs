use async_graphql::dataloader::*;
use async_graphql::*;
use repository::EqualFilter;
use repository::{
    RepositoryError, StocktakeLine, StocktakeLineFilter, StocktakeLineRepository,
    StorageConnectionManager,
};
use std::collections::HashMap;

pub struct StocktakeLineByStocktakeIdLoader {
    pub connection_manager: StorageConnectionManager,
}

impl Loader<String> for StocktakeLineByStocktakeIdLoader {
    type Value = Vec<StocktakeLine>;
    type Error = RepositoryError;

    async fn load(
        &self,
        stocktake_ids: &[String],
    ) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let connection_manager = self.connection_manager.clone();
        let stocktake_ids = stocktake_ids.to_vec();

        tokio::task::spawn_blocking(
            move || -> Result<HashMap<String, Vec<StocktakeLine>>, RepositoryError> {
                let connection = connection_manager.connection()?;
                let repo = StocktakeLineRepository::new(&connection);

                let all_lines = repo.query_by_filter(
                    StocktakeLineFilter::new()
                        .stocktake_id(EqualFilter::equal_any(stocktake_ids)),
                    None,
                )?;

                let mut map: HashMap<String, Vec<StocktakeLine>> = HashMap::new();
                for line in all_lines {
                    let list = map.entry(line.line.stocktake_id.clone()).or_default();
                    list.push(line);
                }
                Ok(map)
            },
        )
        .await
        .map_err(|e| RepositoryError::as_db_error("Loader blocking task failed", e))?
    }
}
