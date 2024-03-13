use repository::asset_class::{AssetClassFilter, AssetClassRepository};
use repository::asset_class_row::AssetClassRow;
use repository::EqualFilter;
use repository::{RepositoryError, StorageConnectionManager};

use async_graphql::dataloader::*;
use async_graphql::*;
use std::collections::HashMap;

pub struct AssetClassLoader {
    pub connection_manager: StorageConnectionManager,
}

#[async_trait::async_trait]
impl Loader<String> for AssetClassLoader {
    type Value = AssetClassRow;
    type Error = RepositoryError;

    async fn load(&self, ids: &[String]) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let connection = self.connection_manager.connection()?;
        let repo = AssetClassRepository::new(&connection);

        let result = repo
            .query_by_filter(AssetClassFilter::new().id(EqualFilter::equal_any(ids.to_owned())))?;

        Ok(result
            .into_iter()
            .map(|asset_class| (asset_class.id.clone(), asset_class))
            .collect())
    }
}
