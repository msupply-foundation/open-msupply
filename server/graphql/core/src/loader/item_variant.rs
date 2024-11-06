use actix_web::web::Data;
use repository::item_variant::item_variant::{
    ItemVariant, ItemVariantFilter, ItemVariantRepository,
};
use repository::{EqualFilter, RepositoryError};

use async_graphql::dataloader::*;
use service::service_provider::ServiceProvider;
use std::collections::HashMap;

pub struct ItemVariantsByItemIdLoader {
    pub service_provider: Data<ServiceProvider>,
}

impl Loader<String> for ItemVariantsByItemIdLoader {
    type Value = Vec<ItemVariant>;
    type Error = RepositoryError;

    async fn load(&self, item_ids: &[String]) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let service_context = self.service_provider.basic_context()?;
        let repo = ItemVariantRepository::new(&service_context.connection);

        let item_variants = repo.query_by_filter(
            ItemVariantFilter::new().item_id(EqualFilter::equal_any(item_ids.to_vec())),
        )?;

        let mut map: HashMap<String, Vec<ItemVariant>> = HashMap::new();
        for variant in item_variants {
            let list = map.entry(variant.item_row.id.clone()).or_default();
            list.push(variant);
        }
        Ok(map)
    }
}

pub struct ItemVariantByItemVariantIdLoader {
    pub service_provider: Data<ServiceProvider>,
}

impl Loader<String> for ItemVariantByItemVariantIdLoader {
    type Value = ItemVariant;
    type Error = RepositoryError;

    async fn load(
        &self,
        item_variant_ids: &[String],
    ) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let service_context = self.service_provider.basic_context()?;
        let repo = ItemVariantRepository::new(&service_context.connection);

        let item_variants = repo.query_by_filter(
            ItemVariantFilter::new().id(EqualFilter::equal_any(item_variant_ids.to_vec())),
        )?;

        let mut map: HashMap<String, ItemVariant> = HashMap::new();
        for variant in item_variants {
            map.insert(variant.clone().item_variant_row.id, variant);
        }
        Ok(map)
    }
}
