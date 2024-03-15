use repository::asset_internal_location::{
    AssetInternalLocationFilter, AssetInternalLocationRepository,
};
use repository::EqualFilter;
use repository::{
    location::{Location, LocationFilter, LocationRepository},
    RepositoryError, StorageConnectionManager,
};

use async_graphql::dataloader::*;
use async_graphql::*;
use std::collections::HashMap;

pub struct AssetLocationLoader {
    pub connection_manager: StorageConnectionManager,
}

#[async_trait::async_trait]
impl Loader<String> for AssetLocationLoader {
    type Value = Vec<Location>;
    type Error = RepositoryError;

    async fn load(&self, ids: &[String]) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let connection = self.connection_manager.connection()?;
        let asset_location_repo = AssetInternalLocationRepository::new(&connection);
        let location_repo = LocationRepository::new(&connection);

        let locations =
            asset_location_repo.query_by_filter(AssetInternalLocationFilter::new().asset_id(
                EqualFilter::equal_any(ids.iter().map(String::clone).collect()),
            ))?;

        let location_ids = locations
            .into_iter()
            .map(|location| location.location_id)
            .collect();

        let locations = location_repo
            .query_by_filter(LocationFilter::new().id(EqualFilter::equal_any(location_ids)))?;

        let mut map: HashMap<String, Vec<Location>> = HashMap::new();
        for line in locations {
            let list = map
                .entry(ids[0].clone())
                .or_insert_with(|| Vec::<Location>::new());
            list.push(line);
        }

        Ok(map)
    }
}
