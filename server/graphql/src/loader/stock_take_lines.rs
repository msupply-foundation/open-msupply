use async_graphql::dataloader::*;
use async_graphql::*;
use domain::EqualFilter;
use repository::{
    RepositoryError, StockTakeLine, StockTakeLineFilter, StockTakeLineRepository,
    StorageConnectionManager,
};
use std::collections::HashMap;

pub struct StockTakeLineByStockTakeIdLoader {
    pub connection_manager: StorageConnectionManager,
}

#[async_trait::async_trait]
impl Loader<String> for StockTakeLineByStockTakeIdLoader {
    type Value = Vec<StockTakeLine>;
    type Error = RepositoryError;

    async fn load(
        &self,
        stock_take_ids: &[String],
    ) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let connection = self.connection_manager.connection()?;
        let repo = StockTakeLineRepository::new(&connection);

        let all_lines = repo.query_by_filter(
            StockTakeLineFilter::new()
                .stock_take_id(EqualFilter::equal_any(stock_take_ids.to_owned())),
        )?;

        let mut map: HashMap<String, Vec<StockTakeLine>> = HashMap::new();
        for line in all_lines {
            let list = map
                .entry(line.line.stock_take_id.clone())
                .or_insert_with(|| Vec::<StockTakeLine>::new());
            list.push(line);
        }
        Ok(map)
    }
}
