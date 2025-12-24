use actix_web::web::Data;
use async_graphql::dataloader::*;
use repository::{EqualFilter, NameLinkRowRepository};
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

#[derive(Clone)]
pub struct ByNameLinkEmptyPayload;
pub type NameByNameLinkIdLoaderInput = IdPair<ByNameLinkEmptyPayload>;

impl NameByNameLinkIdLoaderInput {
    pub fn new(store_id: &str, name_link_id: &str) -> Self {
        NameByNameLinkIdLoaderInput {
            primary_id: store_id.to_string(),
            secondary_id: name_link_id.to_string(),
            payload: ByNameLinkEmptyPayload {},
        }
    }
}
pub struct NameByNameLinkIdLoader {
    pub service_provider: Data<ServiceProvider>,
}

// TODO should not use name link ids outside of repository
impl Loader<NameByNameLinkIdLoaderInput> for NameByNameLinkIdLoader {
    type Value = Name;
    type Error = async_graphql::Error;

    async fn load(
        &self,
        ids_with_store_id: &[NameByNameLinkIdLoaderInput],
    ) -> Result<HashMap<NameByNameLinkIdLoaderInput, Self::Value>, Self::Error> {
        let service_context = self.service_provider.basic_context()?;

        // store_id -> Vec of name_link_id
        let mut store_name_link_map = HashMap::<String, Vec<String>>::new();
        for item in ids_with_store_id {
            let entry = store_name_link_map
                .entry(item.primary_id.clone())
                .or_default();
            entry.push(item.secondary_id.clone())
        }
        let mut output = HashMap::<NameByNameLinkIdLoaderInput, Self::Value>::new();

        for (store_id, name_link_ids) in store_name_link_map {
            let name_links = NameLinkRowRepository::new(&service_context.connection)
                .find_all_by_id(name_link_ids.clone())?;

            let link_map: HashMap<String, String> = name_links
                .iter()
                .map(|link| (link.name_id.clone(), link.id.clone()))
                .collect();

            let names = self
                .service_provider
                .name_service
                .get_names(
                    &service_context,
                    &store_id,
                    None,
                    Some(NameFilter::new().id(EqualFilter::equal_any(
                        name_links.into_iter().map(|l| l.name_id).collect(),
                    ))),
                    None,
                )
                .map_err(|err| StandardGraphqlError::InternalError(format!("{:?}", err)))?;
            for name in names.rows {
                let Some(link) = link_map.get(&name.name_row.id) else {
                    continue;
                };

                output.insert(NameByNameLinkIdLoaderInput::new(&store_id, link), name);
            }
        }
        Ok(output)
    }
}
