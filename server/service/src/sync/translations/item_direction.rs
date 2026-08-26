use repository::{ItemDirectionRow, ItemDirectionRowDelete, StorageConnection, SyncBufferRow};

use serde::Deserialize;

use crate::sync::translations::item::ItemTranslation;

use super::{FkField, PullTranslateResult, SyncTranslation};

#[allow(non_snake_case)]
#[derive(Deserialize)]
pub struct LegacyItemDirectionRow {
    ID: String,
    item_ID: String,
    directions: String,
    priority: i64,
}

// Needs to be added to all_translators()
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(ItemDirectionTranslation)
}

pub(super) struct ItemDirectionTranslation;
impl SyncTranslation for ItemDirectionTranslation {
    fn table_name(&self) -> &str {
        "item_direction"
    }

    fn pull_dependencies(&self) -> Vec<&str> {
        vec![ItemTranslation.table_name()]
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        connection: &StorageConnection,
        fk_checker: &crate::sync::translations::FkChecker,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let data = sync_record.deserialize::<LegacyItemDirectionRow>()?;

        let check_fk = fk_checker.with_table_required(connection, "item_direction", &data.ID);

        let result = ItemDirectionRow {
            id: data.ID,
            item_id: check_fk(data.item_ID, "item_link_id", FkField::ItemLink)?,
            directions: data.directions,
            priority: data.priority,
        };

        Ok(PullTranslateResult::upsert(result))
    }

    fn try_translate_from_delete_sync_record(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        Ok(PullTranslateResult::delete(ItemDirectionRowDelete(
            sync_record.record_id.clone(),
        )))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{
        mock::MockDataInserts, test_db::setup_all, ItemLinkRow, ItemLinkRowRepository,
    };

    #[actix_rt::test]
    async fn test_item_direction_translation() {
        use crate::sync::test::test_data::item_direction as test_data;
        let translator = ItemDirectionTranslation {};

        let (_, connection, _, _) =
            setup_all("test_item_direction_translation", MockDataInserts::all()).await;

        // Seed the item_link parent the direction's required FK points at.
        ItemLinkRowRepository::new(&connection)
            .upsert_one(&ItemLinkRow {
                id: "8F252B5884B74888AAB73A0D42C09E7A".to_string(),
                item_id: "item_a".to_string(),
            })
            .unwrap();

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

        for record in test_data::test_pull_delete_records() {
            assert!(translator.should_translate_from_sync_record(&record.sync_buffer_row));
            let translation_result = translator
                .try_translate_from_delete_sync_record(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }
    }
}
