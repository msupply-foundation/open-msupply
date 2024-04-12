use repository::asset_internal_location::{
    AssetInternalLocationFilter, AssetInternalLocationRepository,
};
use repository::EqualFilter;
use repository::{
    asset::{Asset, AssetFilter, AssetRepository},
    RepositoryError, StorageConnectionManager,
};

use async_graphql::dataloader::*;
use async_graphql::*;
use std::collections::HashMap;

pub struct AssetByLocationLoader {
    pub connection_manager: StorageConnectionManager,
}

#[async_trait::async_trait]
impl Loader<String> for AssetByLocationLoader {
    type Value = Vec<Asset>;
    type Error = RepositoryError;

    async fn load(&self, ids: &[String]) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let connection = self.connection_manager.connection()?;
        let asset_location_repo = AssetInternalLocationRepository::new(&connection);
        let asset_repo = AssetRepository::new(&connection);

        let locations =
            asset_location_repo.query_by_filter(AssetInternalLocationFilter::new().location_id(
                EqualFilter::equal_any(ids.iter().map(String::clone).collect()),
            ))?;

        let mut location_ids_by_asset: HashMap<String, String> = HashMap::new();
        for location in locations {
            location_ids_by_asset.insert(location.asset_id, location.location_id);
        }

        let assets = asset_repo.query_by_filter(AssetFilter::new().id(EqualFilter::equal_any(
            location_ids_by_asset.clone().into_keys().collect(),
        )))?;

        let mut map: HashMap<String, Vec<Asset>> = HashMap::new();
        for asset in assets {
            let location_id = location_ids_by_asset
                .get(&asset.id)
                .unwrap_or(&"".to_string())
                .to_owned();

            let list = map.entry(location_id).or_insert_with(Vec::<Asset>::new);
            list.push(asset);
        }

        Ok(map)
    }
}
