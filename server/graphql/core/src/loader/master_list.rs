use std::collections::HashMap;

use actix_web::web::Data;
use async_graphql::dataloader::Loader;
use repository::{EqualFilter, MasterList, MasterListFilter, MasterListRepository};
use service::service_provider::ServiceProvider;

use super::IdPair;

#[derive(Clone, Debug)]
pub struct EmptyPayload;
pub type MasterListByItemIdLoaderInput = IdPair<EmptyPayload>;
impl MasterListByItemIdLoaderInput {
    pub fn new(store_id: &str, item_id: &str) -> Self {
        MasterListByItemIdLoaderInput {
            primary_id: store_id.to_string(),
            secondary_id: item_id.to_string(),
            payload: EmptyPayload {},
        }
    }
}
pub struct MasterListByItemIdLoader {
    pub service_provider: Data<ServiceProvider>,
}

impl Loader<MasterListByItemIdLoaderInput> for MasterListByItemIdLoader {
    type Value = Vec<MasterList>;
    type Error = async_graphql::Error;

    async fn load(
        &self,
        ids_with_store_id: &[MasterListByItemIdLoaderInput],
    ) -> Result<HashMap<MasterListByItemIdLoaderInput, Self::Value>, Self::Error> {
        let service_context = self.service_provider.basic_context()?;
        let connection = service_context.connection;

        let mut store_item_map = HashMap::<String, Vec<String>>::new();
        for item in ids_with_store_id {
            let entry = store_item_map.entry(item.primary_id.clone()).or_default();
            entry.push(item.secondary_id.clone())
        }
        let mut output = HashMap::<MasterListByItemIdLoaderInput, Self::Value>::new();

        for (store_id, item_ids) in store_item_map {
            for item_id in item_ids {
                let master_list = MasterListRepository::new(&connection).query_by_filter(
                    MasterListFilter::new()
                        .exists_for_store_id(EqualFilter::equal_to(&store_id))
                        .item_id(EqualFilter::equal_to(&item_id)),
                )?;

                let entry = output.entry(MasterListByItemIdLoaderInput {
                    primary_id: store_id.clone(),
                    secondary_id: item_id,
                    payload: EmptyPayload {},
                });

                entry.or_default().extend(master_list);
            }
        }

        Ok(output)
    }
}
