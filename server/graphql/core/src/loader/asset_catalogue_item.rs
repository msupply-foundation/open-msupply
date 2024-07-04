use repository::asset_catalogue_item::{AssetCatalogueItemFilter, AssetCatalogueItemRepository};
use repository::asset_catalogue_item_row::AssetCatalogueItemRow;
use repository::EqualFilter;
use repository::{RepositoryError, StorageConnectionManager};

use async_graphql::dataloader::*;
use async_graphql::*;
use std::collections::HashMap;

pub struct AssetCatalogueItemLoader {
    pub connection_manager: StorageConnectionManager,
}

impl Loader<String> for AssetCatalogueItemLoader {
    type Value = AssetCatalogueItemRow;
    type Error = RepositoryError;

    async fn load(&self, ids: &[String]) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let connection = self.connection_manager.connection()?;
        let repo = AssetCatalogueItemRepository::new(&connection);

        let result = repo.query_by_filter(
            AssetCatalogueItemFilter::new().id(EqualFilter::equal_any(ids.to_owned())),
        )?;

        Ok(result
            .into_iter()
            .map(|asset_catalogue_item| (asset_catalogue_item.id.clone(), asset_catalogue_item))
            .collect())
    }
}
