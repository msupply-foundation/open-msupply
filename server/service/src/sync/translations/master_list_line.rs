use repository::{
    MasterListLineRow, MasterListLineRowDelete, MasterListRowRepository, StorageConnection,
    SyncBufferRow,
};

use serde::Deserialize;

use crate::sync::translations::{item::ItemTranslation, master_list::MasterListTranslation};

use super::{PullTranslateResult, SyncTranslation};

#[allow(non_snake_case)]
#[derive(Deserialize)]
pub struct LegacyListMasterLineRow {
    ID: String,
    item_master_ID: String,
    item_ID: String,
}

// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(MasterListLineTranslation)
}

pub(super) struct MasterListLineTranslation;
impl SyncTranslation for MasterListLineTranslation {
    fn table_name(&self) -> &str {
        "list_master_line"
    }

    fn pull_dependencies(&self) -> Vec<&str> {
        vec![
            MasterListTranslation.table_name(),
            ItemTranslation.table_name(),
        ]
    }

    fn try_translate_from_delete_sync_record(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        // TODO, check site ? (should never get delete records for this site,
        // only transfer other half)
        Ok(PullTranslateResult::delete(MasterListLineRowDelete(
            sync_record.record_id.clone(),
        )))
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        connection: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let data = serde_json::from_str::<LegacyListMasterLineRow>(&sync_record.data)?;
        let master_list =
            MasterListRowRepository::new(connection).find_one_by_id(&data.item_master_ID)?;
        if master_list.is_none() {
            return Ok(PullTranslateResult::Ignored(
                "Missing master list".to_string(),
            ));
        }

        let result = MasterListLineRow {
            id: data.ID,
            item_link_id: data.item_ID,
            master_list_id: data.item_master_ID,
        };

        Ok(PullTranslateResult::upsert(result))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{mock::MockDataInserts, test_db::setup_all};

    #[actix_rt::test]
    async fn test_invoice_translation() {
        use crate::sync::test::test_data::master_list_line as test_data;
        let translator = MasterListLineTranslation {};

        // Using all() because pull_upserts requires master_list from mock data
        let (_, connection, _, _) =
            setup_all("test_master_list_line_translation", MockDataInserts::all()).await;

        for record in test_data::test_pull_upsert_records() {
            assert!(translator.should_translate_from_sync_record(&record.sync_buffer_row));
            let translation_result = translator
                .try_translate_from_upsert_sync_record(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }
    }
}
