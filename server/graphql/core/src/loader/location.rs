use repository::EqualFilter;
use repository::{
    location::{Location, LocationFilter, LocationRepository},
    RepositoryError, StorageConnectionManager,
};

use async_graphql::dataloader::*;
use async_graphql::*;
use service::location::query::get_volume_used;
use std::collections::HashMap;

pub struct LocationByIdLoader {
    pub connection_manager: StorageConnectionManager,
}

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

pub struct VolumeUsedByLocationLoader {
    pub connection_manager: StorageConnectionManager,
}

impl Loader<String> for VolumeUsedByLocationLoader {
    type Value = f64;
    type Error = RepositoryError;

    async fn load(&self, ids: &[String]) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let connection = self.connection_manager.connection()?;
        let repo = LocationRepository::new(&connection);

        let locations =
            repo.query_by_filter(LocationFilter::new().id(EqualFilter::equal_any(ids.to_owned())))?;

        let mut result = HashMap::new();

        for location in locations {
            let volume_used = get_volume_used(&connection, &location.location_row)?;
            result.insert(location.location_row.id.clone(), volume_used);
        }

        Ok(result)
    }
}
