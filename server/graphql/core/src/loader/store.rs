use actix_web::web::Data;
use async_graphql::dataloader::*;
use async_graphql::*;
use repository::{EqualFilter, Store, StoreFilter};
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
