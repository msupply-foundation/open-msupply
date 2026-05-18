use repository::{
    reason_option::{ReasonOption, ReasonOptionFilter, ReasonOptionRepository},
    EqualFilter,
};
use repository::{RepositoryError, StorageConnectionManager};

use async_graphql::dataloader::*;
use async_graphql::*;
use std::collections::HashMap;

pub struct ReasonOptionLoader {
    pub connection_manager: StorageConnectionManager,
}

impl Loader<String> for ReasonOptionLoader {
    type Value = ReasonOption;
    type Error = RepositoryError;

    async fn load(&self, ids: &[String]) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let connection_manager = self.connection_manager.clone();
        let ids = ids.to_vec();

        tokio::task::spawn_blocking(
            move || -> Result<HashMap<String, ReasonOption>, RepositoryError> {
                let connection = connection_manager.connection()?;
                let repo = ReasonOptionRepository::new(&connection);

                let result = repo.query_by_filter(
                    ReasonOptionFilter::new().id(EqualFilter::equal_any(ids)),
                )?;

                Ok(result
                    .into_iter()
                    .map(|reason_option| {
                        (reason_option.reason_option_row.id.clone(), reason_option)
                    })
                    .collect())
            },
        )
        .await
        .map_err(|e| RepositoryError::as_db_error("Loader blocking task failed", e))?
    }
}
