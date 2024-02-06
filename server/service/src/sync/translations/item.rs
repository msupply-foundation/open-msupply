use repository::{ItemRow, ItemRowDelete, ItemRowType, StorageConnection, SyncBufferRow};
use serde::Deserialize;

use crate::sync::translations::unit::UnitTranslation;

use super::{PullTranslateResult, SyncTranslation};

#[allow(non_camel_case_types)]
#[derive(Deserialize)]
pub enum LegacyItemType {
    non_stock,
    service,
    general,
}

#[allow(non_snake_case)]
#[derive(Deserialize)]
pub struct LegacyItemRow {
    ID: String,
    item_name: String,
    code: String,
    unit_ID: String,
    type_of: LegacyItemType,
    default_pack_size: u32,
}

fn to_item_type(type_of: LegacyItemType) -> ItemRowType {
    match type_of {
        LegacyItemType::non_stock => ItemRowType::NonStock,
        LegacyItemType::service => ItemRowType::Service,
        LegacyItemType::general => ItemRowType::Stock,
    }
}

pub(crate) fn ordered_simple_json(text: &str) -> Result<String, serde_json::Error> {
    let json: serde_json::Value = serde_json::from_str(&text)?;
    serde_json::to_string(&json)
}

// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(ItemTranslation)
}

pub(super) struct ItemTranslation;
impl SyncTranslation for ItemTranslation {
    fn table_name(&self) -> &'static str {
        "item"
    }

    fn pull_dependencies(&self) -> Vec<&'static str> {
        vec![UnitTranslation.table_name()]
    }

    fn try_translate_pull_upsert(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let data = serde_json::from_str::<LegacyItemRow>(&sync_record.data)?;

        let mut result = ItemRow {
            id: data.ID,
            name: data.item_name,
            code: data.code,
            unit_id: None,
            r#type: to_item_type(data.type_of),
            legacy_record: ordered_simple_json(&sync_record.data)?,
            default_pack_size: data.default_pack_size as i32,
        };

        if data.unit_ID != "" {
            result.unit_id = Some(data.unit_ID);
        }

        Ok(PullTranslateResult::upsert(result))
    }

    // TODO soft delete
    fn try_translate_pull_delete(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        Ok(PullTranslateResult::delete(ItemRowDelete(
            sync_record.record_id.clone(),
        )))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{mock::MockDataInserts, test_db::setup_all};

    #[actix_rt::test]
    async fn test_item_translation() {
        use crate::sync::test::test_data::item as test_data;
        let translator = ItemTranslation {};

        let (_, connection, _, _) =
            setup_all("test_item_translation", MockDataInserts::none()).await;

        for record in test_data::test_pull_upsert_records() {
            assert!(translator.match_pull(&record.sync_buffer_row));
            let translation_result = translator
                .try_translate_pull_upsert(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }

        for record in test_data::test_pull_delete_records() {
            assert!(translator.match_pull(&record.sync_buffer_row));
            let translation_result = translator
                .try_translate_pull_delete(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }
    }
}
