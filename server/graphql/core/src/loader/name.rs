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

impl Loader<NameByIdLoaderInput> for NameByIdLoader {
    type Value = Name;
    type Error = async_graphql::Error;

    async fn load(
        &self,
        ids_with_store_id: &[NameByIdLoaderInput],
    ) -> Result<HashMap<NameByIdLoaderInput, Self::Value>, Self::Error> {
        let service_context = self.service_provider.basic_context()?;

        // store_id -> Vec of name_id
        let mut store_name_map = HashMap::<String, Vec<String>>::new();
        for item in ids_with_store_id {
            let entry = store_name_map.entry(item.primary_id.clone()).or_default();
            entry.push(item.secondary_id.clone())
        }
        let mut output = HashMap::<NameByIdLoaderInput, Self::Value>::new();
        for (store_id, names) in store_name_map {
            let names = self
                .service_provider
                .name_service
                .get_names(
                    &service_context,
                    &store_id,
                    None, // TODO this needs to be ALL without limit
                    Some(NameFilter::new().id(EqualFilter::equal_any(names))),
                    None,
                )
                .map_err(|err| StandardGraphqlError::InternalError(format!("{:?}", err)))?;
            for name in names.rows {
                output.insert(NameByIdLoaderInput::new(&store_id, &name.name_row.id), name);
            }
        }
        Ok(output)
    }
}
