use std::collections::HashSet;

use repository::{ItemStoreJoinRow, PluginType};
use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::backend_plugin::{plugin_provider::PluginInstance, *};
use plugin_provider::{PluginError, PluginResult, call_plugin, call_plugin_async};

fn plugin_type() -> PluginType {
    PluginType::TransformItemStoreProperties
}

#[derive(TS, Clone, Deserialize, Serialize)]
#[ts(rename = "TransformItemStorePropertiesInput")]
pub struct Input {
    pub store_id: String,
    pub item_ids: Vec<String>,
    // Adding js/ts doc comment here rather then on the type makes it show up when hovering over transform_item_store_properties input (in plugin code)
    #[doc = "The item_store_join rows found for item_ids in this store. An item with no row has none here: a plugin can add one, its id is never saved"]
    pub rows: Vec<ItemStoreJoinRow>,
    #[doc = "The variants in this list may not represent all of the areas where item store properties are read"]
    pub context: Context,
}

#[derive(TS, Clone, Deserialize, Serialize)]
#[ts(rename = "TransformItemStorePropertiesContext")]
pub enum Context {
    ItemStorePropertiesQuery,
    InboundShipmentTransfer,
}

#[derive(TS, Clone, Deserialize, Serialize)]
#[ts(rename = "TransformItemStorePropertiesOutput")]
pub struct Output {
    pub transformed_rows: Vec<ItemStoreJoinRow>,
}

pub trait Trait: Send + Sync {
    fn call(&self, input: Input) -> PluginResult<Output>;
}

impl self::Trait for PluginInstance {
    fn call(&self, input: Input) -> PluginResult<Output> {
        call_plugin(input, plugin_type(), self)
    }
}

// Rows a plugin returns for another store or an item that wasn't asked for are
// dropped, so callers only ever see rows for what they asked about
fn keep_requested(store_id: &str, item_ids: &[String], rows: &mut Vec<ItemStoreJoinRow>) {
    let item_ids: HashSet<&String> = item_ids.iter().collect();
    rows.retain(|row| row.store_id == store_id && item_ids.contains(&row.item_id));
}

// A plugin that fails leaves core's rows as they were: these reads sit behind
// item search and the transfer processor, so a broken plugin costs the store
// its plugin prices, not its item search or an inbound shipment
fn fall_back(
    store_id: &str,
    error: PluginError,
    core_rows: Vec<ItemStoreJoinRow>,
) -> Vec<ItemStoreJoinRow> {
    log::error!(
        "transform_item_store_properties failed for store {store_id}, using item store properties as stored: {error:?}"
    );
    core_rows
}

// Helper
impl PluginInstance {
    pub(crate) fn transform_item_store_properties(
        context: Context,
        store_id: &str,
        item_ids: &[String],
        rows: Vec<ItemStoreJoinRow>,
    ) -> Vec<ItemStoreJoinRow> {
        let plugins = PluginInstance::get_all(plugin_type());
        if plugins.is_empty() {
            return rows;
        }

        let mut transformed = rows.clone();
        for plugin in plugins {
            let result = Trait::call(
                &(*plugin),
                Input {
                    context: context.clone(),
                    store_id: store_id.to_string(),
                    item_ids: item_ids.to_vec(),
                    rows: transformed,
                },
            );
            transformed = match result {
                Ok(output) => output.transformed_rows,
                Err(error) => return fall_back(store_id, error, rows),
            };
        }
        keep_requested(store_id, item_ids, &mut transformed);

        transformed
    }

    /// Async sibling of `transform_item_store_properties` for callers on the async
    /// runtime (the GraphQL loader), runs each plugin on the blocking pool
    pub async fn transform_item_store_properties_async(
        context: Context,
        store_id: &str,
        item_ids: &[String],
        rows: Vec<ItemStoreJoinRow>,
    ) -> Vec<ItemStoreJoinRow> {
        let plugins = PluginInstance::get_all(plugin_type());
        if plugins.is_empty() {
            return rows;
        }

        let mut transformed = rows.clone();
        for plugin in plugins {
            let result: PluginResult<Output> = call_plugin_async(
                Input {
                    context: context.clone(),
                    store_id: store_id.to_string(),
                    item_ids: item_ids.to_vec(),
                    rows: transformed,
                },
                plugin_type(),
                plugin,
            )
            .await;
            transformed = match result {
                Ok(output) => output.transformed_rows,
                Err(error) => return fall_back(store_id, error, rows),
            };
        }
        keep_requested(store_id, item_ids, &mut transformed);

        transformed
    }
}
