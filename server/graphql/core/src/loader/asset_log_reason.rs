use repository::asset_log_reason::{AssetLogReasonFilter, AssetLogReasonRepository};
use repository::asset_log_reason_row::AssetLogReasonRow;
use repository::EqualFilter;
use repository::{RepositoryError, StorageConnectionManager};

use async_graphql::dataloader::*;
use async_graphql::*;
use std::collections::HashMap;

pub struct AssetLogReasonLoader {
    pub connection_manager: StorageConnectionManager,
}

#[async_trait::async_trait]
impl Loader<String> for AssetLogReasonLoader {
    type Value = AssetLogReasonRow;
    type Error = RepositoryError;

    async fn load(&self, ids: &[String]) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let connection = self.connection_manager.connection()?;
        let repo = AssetLogReasonRepository::new(&connection);

        let result = repo.query_by_filter(
            AssetLogReasonFilter::new().id(EqualFilter::equal_any(ids.to_owned())),
        )?;

        Ok(result
            .into_iter()
            .map(|asset_log_reason| (asset_log_reason.id.clone(), asset_log_reason))
            .collect())
    }
}
