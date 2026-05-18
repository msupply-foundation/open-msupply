use repository::demographic::{DemographicFilter, DemographicRepository};
use repository::DemographicRow;
use repository::{EqualFilter, RepositoryError, StorageConnectionManager};

use async_graphql::dataloader::*;
use async_graphql::*;
use std::collections::HashMap;

pub struct DemographicLoader {
    pub connection_manager: StorageConnectionManager,
}

impl Loader<String> for DemographicLoader {
    type Value = DemographicRow;
    type Error = RepositoryError;

    async fn load(&self, ids: &[String]) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let connection_manager = self.connection_manager.clone();
        let ids = ids.to_vec();

        tokio::task::spawn_blocking(
            move || -> Result<HashMap<String, DemographicRow>, RepositoryError> {
                let connection = connection_manager.connection()?;
                let repo = DemographicRepository::new(&connection);

                let result = repo.query_by_filter(
                    DemographicFilter::new().id(EqualFilter::equal_any(ids)),
                )?;

                Ok(result
                    .into_iter()
                    .map(|demographic| (demographic.id.clone(), demographic))
                    .collect())
            },
        )
        .await
        .map_err(|e| RepositoryError::as_db_error("Loader blocking task failed", e))?
    }
}
