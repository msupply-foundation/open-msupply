use async_graphql::dataloader::*;
use repository::{
    RepositoryError, StockRelocationLineRow, StockRelocationLineRowRepository,
    StorageConnectionManager,
};
use std::collections::HashMap;

pub struct StockRelocationLinesByRelocationIdLoader {
    pub connection_manager: StorageConnectionManager,
}

impl Loader<String> for StockRelocationLinesByRelocationIdLoader {
    type Value = Vec<StockRelocationLineRow>;
    type Error = RepositoryError;

    async fn load(
        &self,
        stock_relocation_ids: &[String],
    ) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let connection = self.connection_manager.connection()?;
        let repo = StockRelocationLineRowRepository::new(&connection);

        let mut map: HashMap<String, Vec<StockRelocationLineRow>> = HashMap::new();
        let all_lines = repo.find_many_by_stock_relocation_ids(stock_relocation_ids)?;
        for line in all_lines {
            map.entry(line.stock_relocation_id.clone())
                .or_default()
                .push(line);
        }
        Ok(map)
    }
}
