use std::collections::HashMap;

use actix_web::web::Data;
use async_graphql::dataloader::Loader;
use repository::{EqualFilter, MasterList, MasterListFilter, MasterListRepository};
use service::service_provider::ServiceProvider;

#[derive(Clone, PartialEq, Eq, Debug, Hash)]
pub struct MasterListByItemIdLoaderInput {
    pub store_id: String,
    pub item_id: String,
}
impl MasterListByItemIdLoaderInput {
    pub fn new(store_id: &str, item_id: &str) -> Self {
        MasterListByItemIdLoaderInput {
            store_id: store_id.to_string(),
            item_id: item_id.to_string(),
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
        for input in ids_with_store_id {
            let entry = store_item_map.entry(input.store_id.clone()).or_default();
            entry.push(input.item_id.clone())
        }
        let mut output = HashMap::<MasterListByItemIdLoaderInput, Self::Value>::new();

        for (store_id, item_ids) in store_item_map {
            for item_id in item_ids {
                let master_list = MasterListRepository::new(&connection).query_by_filter(
                    MasterListFilter::new()
                        .exists_for_store_id(EqualFilter::equal_to(store_id.to_string()))
                        .item_id(EqualFilter::equal_to(item_id.to_string())),
                )?;

                let entry = output.entry(MasterListByItemIdLoaderInput {
                    store_id: store_id.clone(),
                    item_id,
                });

                entry.or_default().extend(master_list);
            }
        }

        Ok(output)
    }
}
