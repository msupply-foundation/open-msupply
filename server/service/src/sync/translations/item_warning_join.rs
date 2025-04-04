use serde::{Deserialize, Serialize};

use crate::sync::translations::{item::ItemTranslation, warning::WarningTranslation};
use repository::{ItemWarningJoinRow, StorageConnection, SyncBufferRow};

use super::{PullTranslateResult, SyncTranslation};

#[derive(Deserialize, Serialize)]

pub struct LegacyItemWarningJoinRow {
    #[serde(rename = "Spare")] // Spare column not used in oms
    spare: f64,
    #[serde(rename = "item_ID")]
    item_link_id: String,
    #[serde(rename = "warning_ID")]
    warning_id: String,
    priority: bool,
    #[serde(rename = "ID")]
    id: String,
}

// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(ItemWarningJoinTranslation)
}

pub(super) struct ItemWarningJoinTranslation;
impl SyncTranslation for ItemWarningJoinTranslation {
    fn table_name(&self) -> &str {
        "item_warning_link"
    }

    fn pull_dependencies(&self) -> Vec<&str> {
        vec![
            ItemTranslation.table_name(),
            WarningTranslation.table_name(),
        ]
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        _connection: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let data = serde_json::from_str::<LegacyItemWarningJoinRow>(&sync_record.data)?;

        let result = ItemWarningJoinRow {
            id: data.id,
            item_link_id: data.item_link_id,
            warning_id: data.warning_id,
            priority: data.priority,
        };
        Ok(PullTranslateResult::upsert(result))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{mock::MockDataInserts, test_db::setup_all};

    #[actix_rt::test]
    async fn test_item_warning_join_translation() {
        use crate::sync::test::test_data::item_warning_join as test_data;
        let translator = ItemWarningJoinTranslation {};

        let (_, connection, _, _) = setup_all(
            "test_item_warning_join_translation",
            MockDataInserts::none(),
        )
        .await;

        for record in test_data::test_pull_upsert_records() {
            assert!(translator.should_translate_from_sync_record(&record.sync_buffer_row));
            let translation_result = translator
                .try_translate_from_upsert_sync_record(&connection, &record.sync_buffer_row)
                .unwrap();
            assert_eq!(translation_result, record.translated_record);
        }
    }
}
