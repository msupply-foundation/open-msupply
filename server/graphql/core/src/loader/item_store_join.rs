use std::collections::{HashMap, HashSet};

use async_graphql::dataloader::Loader;
use repository::{
    ItemStoreJoinRow, ItemStoreJoinRowRepository, RepositoryError, StorageConnectionManager,
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

        // De-dupe before building the query - the dropdown passes the same
        // store_id for every item, so this collapses the store_id IN (...) list
        // (and any repeated item_ids) down to the distinct values.
        let item_ids: Vec<String> = loader_inputs
            .iter()
            .map(|input| input.item_id.clone())
            .collect::<HashSet<_>>()
            .into_iter()
            .collect();
        let store_ids: Vec<String> = loader_inputs
            .iter()
            .map(|input| input.store_id.clone())
            .collect::<HashSet<_>>()
            .into_iter()
            .collect();

        // Single batched query rather than one lookup per item - the item
        // search/dropdown requests this field for up to 100 items at once.
        let rows = ItemStoreJoinRowRepository::new(&connection)
            .find_many_by_item_and_store_ids(&item_ids, &store_ids)?;

        let mut result_map: HashMap<ItemStoreJoinLoaderInput, Self::Value> = HashMap::new();
        for row in rows {
            result_map
                .entry(ItemStoreJoinLoaderInput::new(&row.store_id, &row.item_id))
                .or_default()
                .push(row);
        }

        Ok(result_map)
    }
}
