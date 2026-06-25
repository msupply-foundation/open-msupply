use actix_web::web::Data;
use async_graphql::dataloader::*;
use async_graphql::*;
use repository::{EqualFilter, RepositoryError, Store, StoreFilter, StoreLogoRow, StoreRowRepository};
use service::service_provider::ServiceProvider;
use std::collections::HashMap;

use crate::standard_graphql_error::StandardGraphqlError;

pub struct StoreByIdLoader {
    pub service_provider: Data<ServiceProvider>,
}

impl Loader<String> for StoreByIdLoader {
    type Value = Store;
    type Error = async_graphql::Error;

    async fn load(
        &self,
        store_ids: &[String],
    ) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let service_context = self.service_provider.basic_context()?;

        let filter = StoreFilter::new().id(EqualFilter::equal_any(store_ids.to_owned()));

        let stores = self
            .service_provider
            .general_service
            .get_stores(&service_context, None, Some(filter), None)
            .map_err(StandardGraphqlError::from_list_error)?;

        Ok(stores
            .rows
            .into_iter()
            .map(|store| (store.store_row.id.clone(), store))
            .collect())
    }
}

/// Lazy-loads `store.logo` for the GraphQL `StoreNode.logo` resolver. Logos
/// are large base64 TEXT blobs, so they're kept out of the default `StoreRow`
/// shape and fetched only when explicitly requested.
pub struct StoreLogoLoader {
    pub service_provider: Data<ServiceProvider>,
}

impl Loader<String> for StoreLogoLoader {
    type Value = StoreLogoRow;
    type Error = RepositoryError;

    async fn load(&self, keys: &[String]) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let service_context = self.service_provider.basic_context()?;
        let results =
            StoreRowRepository::new(&service_context.connection).find_logos_by_ids(keys)?;

        Ok(results.into_iter().map(|row| (row.id.clone(), row)).collect())
    }
}
