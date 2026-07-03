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

        let mut location_ids_by_asset: HashMap<String, Vec<String>> = HashMap::new();
        for location in locations {
            location_ids_by_asset
                .entry(location.asset_id)
                .or_default()
                .push(location.location_id);
        }

        let assets = asset_repo.query_by_filter(AssetFilter::new().id(EqualFilter::equal_any(
            location_ids_by_asset.clone().into_keys().collect(),
        )))?;

        let mut map: HashMap<String, Vec<Asset>> = HashMap::new();
        for asset in assets {
            if let Some(loc_ids) = location_ids_by_asset.get(&asset.id) {
                for location_id in loc_ids {
                    let list = map.entry(location_id.clone()).or_default();
                    list.push(asset.clone());
                }
            }
        }

        Ok(map)
    }
}

#[cfg(test)]
mod tests {
    use async_graphql::dataloader::Loader;
    use repository::{
        asset_internal_location_row::{AssetInternalLocationRow, AssetInternalLocationRowRepository},
        mock::{
            mock_asset_a, mock_asset_b, mock_location_1, mock_location_2, mock_location_3,
            MockDataInserts,
        },
        test_db,
    };

    use crate::loader::AssetByLocationLoader;

    #[tokio::test]
    async fn asset_by_location_loader() {
        // Prepare
        let (_, storage_connection, connection_manager, _) = test_db::setup_all(
            "asset_by_location_loader",
            MockDataInserts::none().assets().locations(),
        )
        .await;

        // Link asset_a to two locations (location_1 and location_2), and
        // asset_b to a single location (location_3)
        for (id, asset_id, location_id) in [
            ("ail_1", mock_asset_a().id, mock_location_1().id),
            ("ail_2", mock_asset_a().id, mock_location_2().id),
            ("ail_3", mock_asset_b().id, mock_location_3().id),
        ] {
            AssetInternalLocationRowRepository::new(&storage_connection)
                .upsert_one(&AssetInternalLocationRow {
                    id: id.to_string(),
                    asset_id,
                    location_id,
                })
                .unwrap();
        }

        let loader = AssetByLocationLoader { connection_manager };

        let ids: &[String] = &[
            mock_location_1().id,
            mock_location_2().id,
            mock_location_3().id,
        ];

        let result = loader.load(ids).await.unwrap();

        // asset_a should be returned for BOTH of its linked locations.
        // This is the regression that was previously broken: only the last
        // location processed for an asset would return that asset.
        assert_eq!(
            result.get(&mock_location_1().id),
            Some(&vec![mock_asset_a()])
        );
        assert_eq!(
            result.get(&mock_location_2().id),
            Some(&vec![mock_asset_a()])
        );

        // asset_b is returned for its single location
        assert_eq!(
            result.get(&mock_location_3().id),
            Some(&vec![mock_asset_b()])
        );
    }
}
