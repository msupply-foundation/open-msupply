use std::collections::HashMap;

use async_graphql::dataloader::Loader;
use repository::{
    ItemStoreJoinRow, ItemStoreJoinRowRepository, ItemStoreJoinRowRepositoryTrait, RepositoryError,
    StorageConnectionManager,
};

use crate::loader::IdPair;

pub struct ItemStoreJoinLoader {
    pub connection_manager: StorageConnectionManager,
}

#[derive(Clone)]
pub struct EmptyPayload;
pub type ItemStoreJoinLoaderInput = IdPair<EmptyPayload>;
impl ItemStoreJoinLoaderInput {
    pub fn new(store_id: &str, item_id: &str) -> Self {
        ItemStoreJoinLoaderInput {
            primary_id: store_id.to_string(),
            secondary_id: item_id.to_string(),
            payload: EmptyPayload {},
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

        let (store_id, item_id) = if let Some(loader_input) = loader_inputs.first() {
            (
                loader_input.primary_id.clone(),
                loader_input.secondary_id.clone(),
            )
        } else {
            return Ok(HashMap::new());
        };

        let result = ItemStoreJoinRowRepository::new(&connection)
            .find_one_by_item_and_store_id(&item_id, &store_id)?;

        Ok(HashMap::from([(
            ItemStoreJoinLoaderInput::new(&store_id, &item_id),
            result.into_iter().collect(),
        )]))
    }
}
