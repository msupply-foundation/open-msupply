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

        let mut asset_ids_by_location: HashMap<String, String> = HashMap::new();
        for location in locations {
            asset_ids_by_location.insert(location.location_id, location.asset_id);
        }

        let locations = location_repo.query_by_filter(LocationFilter::new().id(
            EqualFilter::equal_any(asset_ids_by_location.clone().into_keys().collect()),
        ))?;

        let mut map: HashMap<String, Vec<Location>> = HashMap::new();
        for location in locations {
            let asset_id = asset_ids_by_location
                .get(&location.location_row.id)
                .unwrap_or(&"".to_string())
                .to_owned();

            let list = map
                .entry(asset_id)
                .or_insert_with(|| Vec::<Location>::new());
            list.push(location);
        }

        Ok(map)
    }
}

// #[cfg(test)]
// mod tests {
//     use async_graphql::dataloader::Loader;
//     use repository::{mock::MockDataInserts, test_db};

//     use crate::loader::AssetLocationLoader;

//     #[tokio::test]
//     async fn asset_location_loader() {
//         // Prepare
//         let (_, _storage_connection, connection_manager, _) = test_db::setup_all(
//             "asset_location_loader",
//             MockDataInserts::none().assets().locations(),
//         )
//         .await;

//         let loader = AssetLocationLoader { connection_manager };

//         let ids: &[String] = &["abc".to_string(), "cde".to_string()];

//         let result = loader.load(ids).await.unwrap();

//         println!("{:?}", result);

//         assert!(false);
//     }
// }
