use actix_web::web::Data;
use async_graphql::dataloader::*;
use repository::EqualFilter;
use service::service_provider::ServiceProvider;
use std::collections::HashMap;

use repository::{Name, NameFilter};

use crate::standard_graphql_error::StandardGraphqlError;

use super::IdAndStoreId;

pub struct NameByIdLoader {
    pub service_provider: Data<ServiceProvider>,
}

#[async_trait::async_trait]
impl Loader<IdAndStoreId> for NameByIdLoader {
    type Value = Name;
    type Error = async_graphql::Error;

    async fn load(
        &self,
        ids_with_store_id: &[IdAndStoreId],
    ) -> Result<HashMap<IdAndStoreId, Self::Value>, Self::Error> {
        let service_context = self.service_provider.context()?;

        let store_id = match IdAndStoreId::get_store_id(ids_with_store_id) {
            Some(store_id) => store_id,
            None => return Ok(HashMap::new()),
        };

        let filter = NameFilter::new()
            // It's posible that historic name becomes invisible
            .show_invisible_in_current_store(true)
            .id(EqualFilter::equal_any(IdAndStoreId::get_ids(
                ids_with_store_id,
            )));

        let names = self
            .service_provider
            .general_service
            .get_names(&service_context, store_id, None, Some(filter), None)
            .map_err(StandardGraphqlError::from_list_error)?;

        Ok(names
            .rows
            .into_iter()
            .map(|name| {
                (
                    IdAndStoreId {
                        id: name.name_row.id.clone(),
                        store_id: store_id.to_string(),
                    },
                    name,
                )
            })
            .collect())
    }
}
