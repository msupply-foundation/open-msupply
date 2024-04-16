use repository::asset_catalogue_item_property::{
    AssetCatalogueItemPropertyRepository, AssetCatalogueItemPropertyValue,
    AssetCataloguePropertyItemFilter,
};
use repository::EqualFilter;
use repository::{RepositoryError, StorageConnectionManager};

use async_graphql::dataloader::*;
use async_graphql::*;
use std::collections::HashMap;

pub struct AssetCatalogueItemPropertyLoader {
    pub connection_manager: StorageConnectionManager,
}

#[async_trait::async_trait]
impl Loader<String> for AssetCatalogueItemPropertyLoader {
    type Value = Vec<AssetCatalogueItemPropertyValue>;
    type Error = RepositoryError;

    async fn load(&self, ids: &[String]) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let connection = self.connection_manager.connection()?;
        let repo = AssetCatalogueItemPropertyRepository::new(&connection);

        let properties = repo.query_property_and_value(
            AssetCataloguePropertyItemFilter::new()
                .catalogue_item_id(EqualFilter::equal_any(ids.to_owned())),
        )?;

        let mut map: HashMap<String, Vec<AssetCatalogueItemPropertyValue>> = HashMap::new();

        for property in properties {
            let catalogue_item_id = property.value.catalogue_item_id.clone();
            let list = map
                .entry(catalogue_item_id)
                .or_insert_with(|| Vec::<AssetCatalogueItemPropertyValue>::new());
            list.push(property);
        }

        Ok(map)
    }
}
