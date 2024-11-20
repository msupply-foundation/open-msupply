use actix_web::web::Data;
use repository::item_variant::packaging_variant::{
    PackagingVariantFilter, PackagingVariantRepository,
};
use repository::item_variant::packaging_variant_row::PackagingVariantRow;
use repository::{EqualFilter, RepositoryError};

use async_graphql::dataloader::*;
use service::service_provider::ServiceProvider;
use std::collections::HashMap;

pub struct PackagingVariantRowLoader {
    pub service_provider: Data<ServiceProvider>,
}

impl Loader<String> for PackagingVariantRowLoader {
    type Value = Vec<PackagingVariantRow>;
    type Error = RepositoryError;

    async fn load(
        &self,
        item_variant_ids: &[String],
    ) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let service_context = self.service_provider.basic_context()?;
        let repo = PackagingVariantRepository::new(&service_context.connection);

        let variants = repo.query_by_filter(
            PackagingVariantFilter::new()
                .item_variant_id(EqualFilter::equal_any(item_variant_ids.to_vec())),
        )?;

        let mut map: HashMap<String, Vec<PackagingVariantRow>> = HashMap::new();
        for variant in variants {
            let list = map.entry(variant.item_variant_id.clone()).or_default();
            list.push(variant);
        }
        Ok(map)
    }
}
