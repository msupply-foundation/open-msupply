use repository::asset_type::{AssetTypeFilter, AssetTypeRepository};
use repository::asset_type_row::AssetTypeRow;
use repository::EqualFilter;
use repository::{RepositoryError, StorageConnectionManager};

use async_graphql::dataloader::*;
use async_graphql::*;
use std::collections::HashMap;

pub struct AssetTypeLoader {
    pub connection_manager: StorageConnectionManager,
}

impl Loader<String> for AssetTypeLoader {
    type Value = AssetTypeRow;
    type Error = RepositoryError;

    async fn load(&self, ids: &[String]) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let connection = self.connection_manager.connection()?;
        let repo = AssetTypeRepository::new(&connection);

        let result = repo
            .query_by_filter(AssetTypeFilter::new().id(EqualFilter::equal_any(ids.to_owned())))?;

        Ok(result
            .into_iter()
            .map(|asset_type| (asset_type.id.clone(), asset_type))
            .collect())
    }
}
