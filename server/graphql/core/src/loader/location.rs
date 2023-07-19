use repository::EqualFilter;
use repository::{
    location::{Location, LocationFilter, LocationRepository},
    RepositoryError, StorageConnectionManager,
};

use async_graphql::dataloader::*;
use async_graphql::*;
use std::collections::HashMap;

pub struct LocationByIdLoader {
    pub connection_manager: StorageConnectionManager,
}

#[async_trait::async_trait]
impl Loader<String> for LocationByIdLoader {
    type Value = Location;
    type Error = RepositoryError;

    async fn load(&self, ids: &[String]) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let connection = self.connection_manager.connection()?;
        let repo = LocationRepository::new(&connection);

        let result =
            repo.query_by_filter(LocationFilter::new().id(EqualFilter::equal_any(ids.to_owned())))?;

        Ok(result
            .into_iter()
            .map(|location| (location.location_row.id.clone(), location))
            .collect())
    }
}
