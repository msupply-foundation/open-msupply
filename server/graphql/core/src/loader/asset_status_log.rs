use repository::asset_log::{AssetLogFilter, AssetLogRepository};
use repository::asset_log_row::AssetLogRow;
use repository::EqualFilter;
use repository::{RepositoryError, StorageConnectionManager};

use async_graphql::dataloader::*;
use async_graphql::*;
use std::collections::HashMap;

pub struct AssetStatusLogLoader {
    pub connection_manager: StorageConnectionManager,
}

impl Loader<String> for AssetStatusLogLoader {
    type Value = AssetLogRow;
    type Error = RepositoryError;

    async fn load(&self, ids: &[String]) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let connection = self.connection_manager.connection()?;
        let repo = AssetLogRepository::new(&connection);
        let filter = AssetLogFilter::new().asset_id(EqualFilter::equal_any(ids.to_owned()));

        let result = repo
            .query_latest(Some(filter))?
            .into_iter()
            .map(|asset_log| (asset_log.asset_id.clone(), asset_log))
            .collect();

        Ok(result)
    }
}
