use repository::asset_category::{AssetCategoryFilter, AssetCategoryRepository};
use repository::asset_category_row::AssetCategoryRow;
use repository::EqualFilter;
use repository::{RepositoryError, StorageConnectionManager};

use async_graphql::dataloader::*;
use async_graphql::*;
use std::collections::HashMap;

pub struct AssetCategoryLoader {
    pub connection_manager: StorageConnectionManager,
}

impl Loader<String> for AssetCategoryLoader {
    type Value = AssetCategoryRow;
    type Error = RepositoryError;

    async fn load(&self, ids: &[String]) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let connection = self.connection_manager.connection()?;
        let repo = AssetCategoryRepository::new(&connection);

        let result = repo.query_by_filter(
            AssetCategoryFilter::new().id(EqualFilter::equal_any(ids.to_owned())),
        )?;

        Ok(result
            .into_iter()
            .map(|asset_category| (asset_category.id.clone(), asset_category))
            .collect())
    }
}
