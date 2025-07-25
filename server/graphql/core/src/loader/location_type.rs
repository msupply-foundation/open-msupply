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
        let connection = self.connection_manager.connection()?;
        let repo = LocationTypeRepository::new(&connection);

        let result = repo.query_by_filter(
            LocationTypeFilter::new().id(EqualFilter::equal_any(ids.to_owned())),
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
    }
}
