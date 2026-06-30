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
        for id in stock_relocation_ids {
            map.insert(id.clone(), repo.find_many_by_stock_relocation_id(id)?);
        }
        Ok(map)
    }
}
