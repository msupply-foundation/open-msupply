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

#[async_trait::async_trait]
impl Loader<String> for StocktakeLineByStocktakeIdLoader {
    type Value = Vec<StocktakeLine>;
    type Error = RepositoryError;

    async fn load(
        &self,
        stocktake_ids: &[String],
    ) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let connection = self.connection_manager.connection()?;
        let repo = StocktakeLineRepository::new(&connection);

        let all_lines = repo.query_by_filter(
            StocktakeLineFilter::new()
                .stocktake_id(EqualFilter::equal_any(stocktake_ids.to_owned())),
            None,
        )?;

        let mut map: HashMap<String, Vec<StocktakeLine>> = HashMap::new();
        for line in all_lines {
            let list = map
                .entry(line.line.stocktake_id.clone())
                .or_insert_with(|| Vec::<StocktakeLine>::new());
            list.push(line);
        }
        Ok(map)
    }
}
