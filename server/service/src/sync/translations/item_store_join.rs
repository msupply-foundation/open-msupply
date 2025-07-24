use serde::{Deserialize, Serialize};

use super::{PullTranslateResult, SyncTranslation};
use crate::sync::translations::{item::ItemTranslation, store::StoreTranslation};
use repository::{ItemStoreJoinRow, StorageConnection, SyncBufferRow};

#[allow(non_snake_case)]
#[derive(Deserialize, Serialize)]
pub struct LegacyItemStoreJoinRow {
    #[serde(rename = "ID")]
    id: String,
    #[serde(rename = "item_ID")]
    item_id: String,
    #[serde(rename = "store_ID")]
    store_id: String,
    #[serde(rename = "default_price")]
    default_sell_price_per_pack: f64,
}

// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(ItemStoreJoinTranslation)
}

pub(super) struct ItemStoreJoinTranslation;
impl SyncTranslation for ItemStoreJoinTranslation {
    fn table_name(&self) -> &str {
        "item_store_join"
    }

    fn pull_dependencies(&self) -> Vec<&str> {
        vec![ItemTranslation.table_name(), StoreTranslation.table_name()]
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let data = serde_json::from_str::<LegacyItemStoreJoinRow>(&sync_record.data)?;

        let result = ItemStoreJoinRow {
            id: data.id,
            item_link_id: data.item_id,
            store_id: data.store_id,
            default_sell_price_per_pack: data.default_sell_price_per_pack,
        };
        Ok(PullTranslateResult::upsert(result))
    }
}
