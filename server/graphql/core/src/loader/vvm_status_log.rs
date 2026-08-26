use std::collections::HashMap;

use async_graphql::dataloader::Loader;
use repository::{
    vvm_status::vvm_status_log_row::{VVMStatusLogRow, VVMStatusLogRowRepository},
    RepositoryError, StorageConnectionManager,
};

pub struct VVMStatusLogByStockLineIdLoader {
    pub connection_manager: StorageConnectionManager,
}

impl Loader<String> for VVMStatusLogByStockLineIdLoader {
    type Value = Vec<VVMStatusLogRow>;
    type Error = RepositoryError;

    async fn load(&self, ids: &[String]) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let connection = self.connection_manager.connection()?;

        let result =
            VVMStatusLogRowRepository::new(&connection).find_many_by_stock_line_id(&ids[0])?;

        let mut map: HashMap<String, Vec<VVMStatusLogRow>> = HashMap::new();
        for vvm_status_log in result {
            let list = map.entry(vvm_status_log.stock_line_id.clone()).or_default();
            list.push(vvm_status_log);
        }

        Ok(map)
    }
}
