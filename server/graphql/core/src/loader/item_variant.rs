use actix_web::web::Data;
use repository::item_variant::item_variant::{ItemVariantFilter, ItemVariantRepository};
use repository::item_variant::item_variant_row::ItemVariantRow;
use repository::{EqualFilter, RepositoryError};

use async_graphql::dataloader::*;
// use async_graphql::*;
use service::service_provider::ServiceProvider;
use std::collections::HashMap;

pub struct ItemVariantRowLoader {
    pub service_provider: Data<ServiceProvider>,
}

impl Loader<String> for ItemVariantRowLoader {
    type Value = Vec<ItemVariantRow>;
    type Error = RepositoryError;

    async fn load(&self, item_ids: &[String]) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let service_context = self.service_provider.basic_context()?;
        let repo = ItemVariantRepository::new(&service_context.connection);

        let item_variants = repo.query_by_filter(
            ItemVariantFilter::new().item_id(EqualFilter::equal_any(item_ids.to_vec())),
        )?;

        let mut map: HashMap<String, Vec<ItemVariantRow>> = HashMap::new();
        for variant in item_variants {
            let list = map.entry(variant.item_link_id.clone()).or_default(); // TODO: Join to item instead of item_link_id ? https://github.com/msupply-foundation/open-msupply/issues/5241
            list.push(variant);
        }
        Ok(map)
    }
}
