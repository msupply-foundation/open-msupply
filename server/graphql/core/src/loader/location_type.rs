use repository::{EqualFilter, LocationTypeFilter, LocationTypeRepository, LocationTypeRow};
use repository::{RepositoryError, StorageConnectionManager};

use async_graphql::dataloader::*;
use async_graphql::*;
use std::collections::HashMap;

pub struct LocationTypeLoader {
    pub connection_manager: StorageConnectionManager,
}

impl Loader<String> for LocationTypeLoader {
    type Value = LocationTypeRow;
    type Error = RepositoryError;

    async fn load(&self, ids: &[String]) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let connection_manager = self.connection_manager.clone();
        let ids = ids.to_vec();

        tokio::task::spawn_blocking(
            move || -> Result<HashMap<String, LocationTypeRow>, RepositoryError> {
                let connection = connection_manager.connection()?;
                let repo = LocationTypeRepository::new(&connection);

                let result = repo.query_by_filter(
                    LocationTypeFilter::new().id(EqualFilter::equal_any(ids)),
                )?;

                Ok(result
                    .into_iter()
                    .map(|location_type| {
                        (
                            location_type.location_type_row.id.clone(),
                            location_type.location_type_row,
                        )
                    })
                    .collect())
            },
        )
        .await
        .map_err(|e| RepositoryError::as_db_error("Loader blocking task failed", e))?
    }
}
