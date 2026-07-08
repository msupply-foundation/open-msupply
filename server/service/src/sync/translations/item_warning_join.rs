use serde::{Deserialize, Serialize};

use crate::sync::translations::{item::ItemTranslation, warning::WarningTranslation};
use repository::{ItemWarningJoinRow, StorageConnection, SyncBufferRow};

use super::{FkField, PullTranslateResult, SyncTranslation};

#[derive(Deserialize, Serialize)]

pub struct LegacyItemWarningJoinRow {
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
        connection: &StorageConnection,
        fk_checker: &crate::sync::translations::FkChecker,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let LegacyItemWarningJoinRow {
            id,
            item_link_id,
            warning_id,
            priority,
        } = sync_record.deserialize()?;

        let check_fk = fk_checker.with_table_required(connection, "item_warning_join", &id);

        let result = ItemWarningJoinRow {
            id,
            item_id: check_fk(item_link_id, "item_link_id", FkField::ItemLink)?,
            warning_id: check_fk(warning_id, "warning_id", FkField::Warning)?,
            priority,
        };
        Ok(PullTranslateResult::upsert(result))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{
        mock::MockDataInserts, test_db::setup_all, ItemLinkRow, ItemLinkRowRepository, WarningRow,
        WarningRowRepository,
    };

    #[actix_rt::test]
    async fn test_item_warning_join_translation() {
        use crate::sync::test::test_data::item_warning_join as test_data;
        let translator = ItemWarningJoinTranslation {};

        let (_, connection, _, _) = setup_all(
            "test_item_warning_join_translation",
            MockDataInserts::all(),
        )
        .await;

        // Seed the item_link + warning parents the join's required FKs point at.
        ItemLinkRowRepository::new(&connection)
            .upsert_one(&ItemLinkRow {
                id: "8F252B5884B74888AAB73A0D42C09E7A".to_string(),
                item_id: "item_a".to_string(),
            })
            .unwrap();
        for warning_id in ["WARNING_1", "WARNING_2", "WARNING_3"] {
            WarningRowRepository::new(&connection)
                .upsert_one(&WarningRow {
                    id: warning_id.to_string(),
                    warning_text: "test".to_string(),
                    code: "test".to_string(),
                })
                .unwrap();
        }

        for record in test_data::test_pull_upsert_records() {
            assert!(translator.should_translate_from_sync_record(&record.sync_buffer_row));
            let translation_result = translator
                .try_translate_from_upsert_sync_record(
                    &connection,
                    &crate::sync::translations::FkChecker::new(),
                    &record.sync_buffer_row,
                )
                .unwrap();
            assert_eq!(translation_result, record.translated_record);
        }
    }
}
