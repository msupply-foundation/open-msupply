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
        let connection_manager = self.connection_manager.clone();
        let ids = ids.to_vec();

        tokio::task::spawn_blocking(
            move || -> Result<HashMap<String, AssetCatalogueItemRow>, RepositoryError> {
                let connection = connection_manager.connection()?;
                let repo = AssetCatalogueItemRepository::new(&connection);

                let result = repo.query_by_filter(
                    AssetCatalogueItemFilter::new().id(EqualFilter::equal_any(ids)),
                )?;

                Ok(result
                    .into_iter()
                    .map(|asset_catalogue_item| {
                        (asset_catalogue_item.id.clone(), asset_catalogue_item)
                    })
                    .collect())
            },
        )
        .await
        .map_err(|e| RepositoryError::as_db_error("Loader blocking task failed", e))?
    }
}
