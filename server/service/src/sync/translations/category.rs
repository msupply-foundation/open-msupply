use crate::sync::sync_serde::empty_str_as_option_string;
use repository::{
    category_row::{CategoryRow, CategoryRowDelete},
    StorageConnection, SyncBufferRow,
};
use serde::{Deserialize, Serialize};

use super::{PullTranslateResult, SyncTranslation};

#[allow(non_camel_case_types)]
#[derive(Deserialize, Serialize)]
pub enum LegacyItemType {
    non_stock,
    service,
    general,
}

#[allow(non_snake_case)]
#[derive(Deserialize, Serialize)]
pub struct LegacyItemCategoryRow {
    ID: String,
    Description: String,
    sort_order: i32,
    #[serde(default, deserialize_with = "empty_str_as_option_string")]
    parent_ID: Option<String>,
}

// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(CategoryTranslation)
}

pub(super) struct CategoryTranslation;
impl SyncTranslation for CategoryTranslation {
    
    fn table_names(&self) -> Vec<&str> {
        vec!["item_category", "item_category_level1", "item_category_level2"]
    }

    fn pull_dependencies(&self) -> Vec<&str> {
        vec![]
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let data = serde_json::from_str::<LegacyItemCategoryRow>(&sync_record.data)?;

        let category_row = CategoryRow {
            id: data.ID,
            name: data.Description.clone(),
            description: Some(data.Description),
            parent_id: data.parent_ID,
            deleted_datetime: None,
        };

        Ok(PullTranslateResult::upsert(category_row))
    }

    fn try_translate_from_delete_sync_record(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        Ok(PullTranslateResult::delete(CategoryRowDelete(
            sync_record.record_id.clone(),
        )))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{mock::MockDataInserts, test_db::setup_all};

    #[actix_rt::test]
    async fn test_item_category_translation() {
        use crate::sync::test::test_data::item_category as test_data;
        let translator = CategoryTranslation {};

        let (_, connection, _, _) =
            setup_all("test_item_category_translation", MockDataInserts::none()).await;

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
