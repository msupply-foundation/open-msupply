use actix_web::web::Data;
use async_graphql::dataloader::*;
use repository::EqualFilter;
use service::service_provider::ServiceProvider;
use std::collections::HashMap;

use repository::{Name, NameFilter};

use crate::standard_graphql_error::StandardGraphqlError;

use super::IdPair;

#[derive(Clone)]
pub struct EmptyPayload;
pub type NameByIdLoaderInput = IdPair<EmptyPayload>;
impl NameByIdLoaderInput {
    pub fn new(store_id: &str, name_id: &str) -> Self {
        NameByIdLoaderInput {
            primary_id: store_id.to_string(),
            secondary_id: name_id.to_string(),
            payload: EmptyPayload {},
        }
    }
}
pub struct NameByIdLoader {
    pub service_provider: Data<ServiceProvider>,
}

#[async_trait::async_trait]
impl Loader<NameByIdLoaderInput> for NameByIdLoader {
    type Value = Name;
    type Error = async_graphql::Error;

    async fn load(
        &self,
        ids_with_store_id: &[NameByIdLoaderInput],
    ) -> Result<HashMap<NameByIdLoaderInput, Self::Value>, Self::Error> {
        let service_context = self.service_provider.context()?;

        let store_id = if let Some(item_and_store_ids) = ids_with_store_id.first() {
            &item_and_store_ids.primary_id
        } else {
            return Ok(HashMap::new());
        };

        let filter = NameFilter::new()
            // It's posible that historic name becomes invisible
            .show_invisible_in_current_store(true)
            .id(EqualFilter::equal_any(IdPair::get_all_secondary_ids(
                &ids_with_store_id,
            )));

        let names = self
            .service_provider
            .general_service
            .get_names(&service_context, store_id, None, Some(filter), None)
            .map_err(StandardGraphqlError::from_list_error)?;

        Ok(names
            .rows
            .into_iter()
            .map(|name| (NameByIdLoaderInput::new(store_id, &name.name_row.id), name))
            .collect())
    }
}
