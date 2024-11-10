use actix_web::web::Data;
use repository::item_variant::bundled_item::{BundledItemFilter, BundledItemRepository};
use repository::item_variant::bundled_item_row::BundledItemRow;
use repository::{EqualFilter, RepositoryError};

use async_graphql::dataloader::*;
use service::service_provider::ServiceProvider;
use std::collections::HashMap;

pub struct BundledItemByPrincipalItemVariantIdLoader {
    pub service_provider: Data<ServiceProvider>,
}

impl Loader<String> for BundledItemByPrincipalItemVariantIdLoader {
    type Value = Vec<BundledItemRow>;
    type Error = RepositoryError;

    async fn load(
        &self,
        principal_item_variant_ids: &[String],
    ) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let service_context = self.service_provider.basic_context()?;
        let repo = BundledItemRepository::new(&service_context.connection);

        let bundles = repo.query_by_filter(BundledItemFilter::new().principal_item_variant_id(
            EqualFilter::equal_any(principal_item_variant_ids.to_vec()),
        ))?;

        let mut map: HashMap<String, Vec<BundledItemRow>> = HashMap::new();
        for bundle in bundles {
            let list = map
                .entry(bundle.principal_item_variant_id.clone())
                .or_default();
            list.push(bundle);
        }
        Ok(map)
    }
}

pub struct BundledItemByBundledItemVariantIdLoader {
    pub service_provider: Data<ServiceProvider>,
}

impl Loader<String> for BundledItemByBundledItemVariantIdLoader {
    type Value = Vec<BundledItemRow>;
    type Error = RepositoryError;

    async fn load(
        &self,
        bundled_item_variant_ids: &[String],
    ) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let service_context = self.service_provider.basic_context()?;
        let repo = BundledItemRepository::new(&service_context.connection);

        let bundles = repo
            .query_by_filter(BundledItemFilter::new().bundled_item_variant_id(
                EqualFilter::equal_any(bundled_item_variant_ids.to_vec()),
            ))?;

        let mut map: HashMap<String, Vec<BundledItemRow>> = HashMap::new();
        for bundle in bundles {
            let list = map
                .entry(bundle.bundled_item_variant_id.clone())
                .or_default();
            list.push(bundle);
        }
        Ok(map)
    }
}
