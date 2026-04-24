use serde::{Deserialize, Serialize};

use super::{utils::clear_invalid_location_id, PullTranslateResult, SyncTranslation};
use crate::sync::translations::{
    item::ItemTranslation, location::LocationTranslation, store::StoreTranslation,
};
use repository::{ItemStoreJoinRow, StorageConnection, SyncBufferRow};
use util::sync_serde::empty_str_as_option_string;

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
    ignore_for_orders: bool,
    margin: f64,
    #[serde(rename = "default_location_ID")]
    #[serde(default)]
    #[serde(deserialize_with = "empty_str_as_option_string")]
    default_location_id: Option<String>,
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
        vec![
            ItemTranslation.table_name(),
            StoreTranslation.table_name(),
            LocationTranslation.table_name(),
        ]
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        connection: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let data = serde_json::from_value::<LegacyItemStoreJoinRow>(sync_record.data.0.clone())?;

        let default_location_id = clear_invalid_location_id(connection, data.default_location_id)?;

        let result = ItemStoreJoinRow {
            id: data.id,
            item_link_id: data.item_id,
            store_id: data.store_id,
            default_sell_price_per_pack: data.default_sell_price_per_pack,
            ignore_for_orders: data.ignore_for_orders,
            margin: data.margin,
            default_location_id,
        };
        Ok(PullTranslateResult::upsert(result))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{mock::MockDataInserts, test_db::setup_all};

    #[actix_rt::test]
    async fn test_item_store_join_translator() {
        use crate::sync::test::test_data::item_store_join as test_data;
        let translator = ItemStoreJoinTranslation {};

        let (_, connection, _, _) =
            setup_all("test_item_store_join_translator", MockDataInserts::none()).await;

        for record in test_data::test_pull_upsert_records() {
            assert!(translator.should_translate_from_sync_record(&record.sync_buffer_row));
            let translation_result = translator
                .try_translate_from_upsert_sync_record(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }
    }
}
