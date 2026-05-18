use std::collections::HashMap;

use async_graphql::dataloader::Loader;
use repository::{
    ItemStoreJoinRow, ItemStoreJoinRowRepository, ItemStoreJoinRowRepositoryTrait, RepositoryError,
    StorageConnectionManager,
};

pub struct ItemStoreJoinLoader {
    pub connection_manager: StorageConnectionManager,
}

#[derive(Clone, PartialEq, Eq, Debug, Hash)]
pub struct ItemStoreJoinLoaderInput {
    pub store_id: String,
    pub item_id: String,
}
impl ItemStoreJoinLoaderInput {
    pub fn new(store_id: &str, item_id: &str) -> Self {
        ItemStoreJoinLoaderInput {
            store_id: store_id.to_string(),
            item_id: item_id.to_string(),
        }
    }
}

impl Loader<ItemStoreJoinLoaderInput> for ItemStoreJoinLoader {
    type Value = Vec<ItemStoreJoinRow>;
    type Error = RepositoryError;

    async fn load(
        &self,
        loader_inputs: &[ItemStoreJoinLoaderInput],
    ) -> Result<HashMap<ItemStoreJoinLoaderInput, Self::Value>, Self::Error> {
        let connection = self.connection_manager.connection()?;

        let mut result_map = HashMap::new();

        for loader_input in loader_inputs {
            let store_id = &loader_input.store_id;
            let item_id = &loader_input.item_id;

            let result = ItemStoreJoinRowRepository::new(&connection)
                .find_one_by_item_and_store_id(item_id, store_id)?;

            result_map.insert(loader_input.clone(), result.into_iter().collect());
        }

        Ok(result_map)
    }
}
