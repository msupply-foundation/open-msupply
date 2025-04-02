use serde::{Deserialize, Serialize};

use repository::{ItemWarningLinkRow, StorageConnection, SyncBufferRow};

use super::{PullTranslateResult, SyncTranslation};

#[derive(Deserialize, Serialize)]

struct LegacyItemWarningLinkRow {
    #[serde(rename = "ID")]
    pub id: String,
    #[serde(rename = "item_ID")]
    pub item_link_id: String,
    #[serde(rename = "warning_ID")]
    pub warning_id: String,
    pub priority: bool,
}

// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(ItemWarningLinkTranslation)
}

pub(super) struct ItemWarningLinkTranslation;
impl SyncTranslation for ItemWarningLinkTranslation {
    fn table_name(&self) -> &str {
        "item_warning_link"
    }

    fn pull_dependencies(&self) -> Vec<&str> {
        vec![]
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        _connection: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let LegacyItemWarningLinkRow {
            id,
            item_link_id,
            warning_id,
            priority,
        } = serde_json::from_str::<LegacyItemWarningLinkRow>(&sync_record.data)?;

        let result = ItemWarningLinkRow {
            id,
            item_link_id,
            warning_id,
            priority,
        };
        Ok(PullTranslateResult::upsert(result))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{mock::MockDataInserts, test_db::setup_all};

    #[actix_rt::test]
    async fn test_item_warning_link_translation() {
        use crate::sync::test::test_data::item_warning_link as test_data;
        let translator = ItemWarningLinkTranslation {};

        let (_, connection, _, _) = setup_all(
            "test_item_warning_link__translation",
            MockDataInserts::none(),
        )
        .await;
        // println!("connection {:?}", connection);

        for record in test_data::test_pull_upsert_records() {
            assert!(translator.should_translate_from_sync_record(&record.sync_buffer_row));
            let translation_result = translator
                .try_translate_from_upsert_sync_record(&connection, &record.sync_buffer_row)
                .unwrap();
            println!("result {:?}", translation_result);
            println!("records {:?}", record.translated_record);
            assert_eq!(translation_result, record.translated_record);
        }
    }
}
