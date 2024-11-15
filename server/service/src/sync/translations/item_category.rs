use repository::{
    item_category::{ItemCategoryFilter, ItemCategoryRepository},
    item_category_row::ItemCategoryRow,
    EqualFilter, ItemRowDelete, StorageConnection, SyncBufferRow,
};
use serde::{Deserialize, Serialize};

use crate::sync::{
    sync_serde::empty_str_as_option_string,
    translations::{category::CategoryTranslation, item::ItemTranslation},
};

use super::{PullTranslateResult, SyncTranslation};

#[allow(non_snake_case)]
#[derive(Deserialize, Serialize)]
pub struct LegacyCategorisedItemRow {
    ID: String,
    #[serde(deserialize_with = "empty_str_as_option_string")]
    category_ID: Option<String>,
}

// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(ItemCategoryTranslation)
}

pub(super) struct ItemCategoryTranslation;
impl SyncTranslation for ItemCategoryTranslation {
    // Item is already translated by the ItemTranslation translator, to create item records.
    // However we also need to create item_category records from that item, so we need to
    // translate it again here (can't return multiple upsert types from same translator)
    fn table_name(&self) -> &str {
        "item"
    }

    fn pull_dependencies(&self) -> Vec<&str> {
        vec![
            CategoryTranslation.table_name(),
            ItemTranslation.table_name(),
        ]
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        connection: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let data = serde_json::from_str::<LegacyCategorisedItemRow>(&sync_record.data)?;

        // We only create one item_category join per item for now. We might move to a join for every level
        // in the hierarchy in the future, but keeping translations simpler for now :)

        // search by item id
        let item_category_join = ItemCategoryRepository::new(connection)
            .query_one(ItemCategoryFilter::new().item_id(EqualFilter::equal_to(&data.ID)))?;

        // if no join and no category, return not matched

        // if join and no category, delete join

        // if join and category, delete and insert join

        let category_id = match data.category_ID {
            Some(category_id) => category_id,
            None => {
                return Ok(PullTranslateResult::NotMatched);
            }
        };

        let result = ItemCategoryRow {
            id: format!("{}-{}", data.ID.clone(), category_id.clone()),
            item_id: data.ID,
            category_id,
            deleted_datetime: None,
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
