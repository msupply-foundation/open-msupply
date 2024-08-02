use repository::{ItemRow, ItemRowDelete, ItemType, StorageConnection, SyncBufferRow, VENCategory};
use serde::Deserialize;

use crate::sync::{sync_serde::empty_str_as_option_string, translations::unit::UnitTranslation};

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
    #[serde(deserialize_with = "empty_str_as_option_string")]
    unit_ID: Option<String>,
    type_of: LegacyItemType,
    default_pack_size: f64,
    is_vaccine: bool,
    VEN_category: String,
    #[serde(deserialize_with = "empty_str_as_option_string")]
    strength: Option<String>,
}

fn to_item_type(type_of: LegacyItemType) -> ItemType {
    match type_of {
        LegacyItemType::non_stock => ItemType::NonStock,
        LegacyItemType::service => ItemType::Service,
        LegacyItemType::general => ItemType::Stock,
    }
}
fn to_ven_category(ven_category: String) -> VENCategory {
    match ven_category.as_str() {
        "V" => VENCategory::V,
        "E" => VENCategory::E,
        "N" => VENCategory::N,
        _ => VENCategory::NotAssigned,
    }
}

pub(crate) fn ordered_simple_json(text: &str) -> Result<String, serde_json::Error> {
    let json: serde_json::Value = serde_json::from_str(text)?;
    serde_json::to_string(&json)
}

// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(ItemTranslation)
}

pub(super) struct ItemTranslation;
impl SyncTranslation for ItemTranslation {
    fn table_name(&self) -> &str {
        "item"
    }

    fn pull_dependencies(&self) -> Vec<&str> {
        vec![UnitTranslation.table_name()]
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let data = serde_json::from_str::<LegacyItemRow>(&sync_record.data)?;

        let result = ItemRow {
            id: data.ID,
            name: data.item_name,
            code: data.code,
            unit_id: data.unit_ID,
            r#type: to_item_type(data.type_of),
            legacy_record: ordered_simple_json(&sync_record.data)?,
            default_pack_size: data.default_pack_size,
            is_active: true,
            is_vaccine: data.is_vaccine,
            strength: data.strength,
            ven_category: to_ven_category(data.VEN_category),
        };

        Ok(PullTranslateResult::upsert(result))
    }

    fn try_translate_from_delete_sync_record(
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
            assert!(translator.should_translate_from_sync_record(&record.sync_buffer_row));
            let translation_result = translator
                .try_translate_from_upsert_sync_record(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }

        for record in test_data::test_pull_delete_records() {
            assert!(translator.should_translate_from_sync_record(&record.sync_buffer_row));
            let translation_result = translator
                .try_translate_from_delete_sync_record(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }
    }
}
