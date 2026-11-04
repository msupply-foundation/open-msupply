use std::collections::{HashMap, HashSet};

use async_graphql::dataloader::Loader;
use repository::{ItemStoreJoinRow, ItemStoreJoinRowRepository, StorageConnectionManager};
use service::backend_plugin::{
    plugin_provider::PluginInstance, types::transform_item_store_properties::Context,
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
    type Error = async_graphql::Error;

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
        // Give the connection back before awaiting plugins, which check out their own
        drop(connection);

        // Plugins see one store at a time, with the items asked for in that store
        let mut item_ids_by_store: HashMap<String, Vec<String>> = HashMap::new();
        for input in loader_inputs {
            item_ids_by_store
                .entry(input.store_id.clone())
                .or_default()
                .push(input.item_id.clone());
        }
        let mut rows_by_store: HashMap<String, Vec<ItemStoreJoinRow>> = HashMap::new();
        for row in rows {
            rows_by_store
                .entry(row.store_id.clone())
                .or_default()
                .push(row);
        }

        let mut rows = Vec::new();
        for (store_id, item_ids) in item_ids_by_store {
            let store_rows = rows_by_store.remove(&store_id).unwrap_or_default();
            rows.extend(
                PluginInstance::transform_item_store_properties_async(
                    Context::ItemStorePropertiesQuery,
                    &store_id,
                    &item_ids,
                    store_rows,
                )
                .await?,
            );
        }

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
