use repository::asset_log::{AssetLogFilter, AssetLogRepository, AssetLogSort, AssetLogSortField};
use repository::asset_log_row::Status;
use repository::{EqualFilter, Pagination};
use repository::{RepositoryError, StorageConnectionManager};

use async_graphql::dataloader::*;
use async_graphql::*;
use std::collections::HashMap;

pub struct AssetStatusLoader {
    pub connection_manager: StorageConnectionManager,
}

#[async_trait::async_trait]
impl Loader<String> for AssetStatusLoader {
    type Value = Status;
    type Error = RepositoryError;

    async fn load(&self, ids: &[String]) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let connection = self.connection_manager.connection()?;
        let repo = AssetLogRepository::new(&connection);

        let filter = AssetLogFilter::new().asset_id(EqualFilter::equal_any(ids.to_owned()));

        let sort = AssetLogSort {
            key: AssetLogSortField::LogDatetime,
            desc: Some(true),
        };

        let result = repo
            .query(
                Pagination {
                    offset: 0,
                    limit: 1,
                },
                Some(filter),
                Some(sort),
            )?
            .into_iter()
            .filter(|asset_log| asset_log.status.is_some())
            .map(|asset_log| (asset_log.asset_id.clone(), asset_log.status.unwrap()))
            .collect();

        Ok(result)
    }
}
