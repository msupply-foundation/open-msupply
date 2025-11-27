use repository::{MasterListRow, MasterListRowRepository, StorageConnection, SyncBufferRow};

use serde::Deserialize;

use super::{PullTranslateResult, SyncTranslation};

#[allow(non_snake_case)]
#[derive(Deserialize)]
pub struct LegacyListMasterRow {
    #[serde(rename = "ID")]
    id: String,
    description: String,
    code: String,
    note: String,
    inactive: Option<bool>,
    is_default_price_list: Option<bool>,
    discount_percentage: Option<f64>,
}
// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(MasterListTranslation)
}

pub(super) struct MasterListTranslation;
impl SyncTranslation for MasterListTranslation {
    fn table_name(&self) -> &str {
        "list_master"
    }

    fn pull_dependencies(&self) -> Vec<&str> {
        vec![]
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let data = serde_json::from_str::<LegacyListMasterRow>(&sync_record.data)?;

        let result = MasterListRow {
            id: data.id,
            name: data.description,
            code: data.code,
            description: data.note,
            // By default if inactive = null, or missing, it should mean is_active = true
            is_active: !data.inactive.unwrap_or(true),
            is_default_price_list: data.is_default_price_list.unwrap_or(false),
            discount_percentage: data.discount_percentage,
        };
        Ok(PullTranslateResult::upsert(result))
    }

    // Soft delete
    fn try_translate_from_delete_sync_record(
        &self,
        connection: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let master_list =
            MasterListRowRepository::new(connection).find_one_by_id(&sync_record.record_id)?;

        let Some(master_list) = master_list else {
            return Ok(PullTranslateResult::Ignored(
                "Deleting record not found".to_string(),
            ));
        };

        let result = MasterListRow {
            is_active: false,
            ..master_list
        };
        Ok(PullTranslateResult::upsert(result))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{mock::MockDataInserts, test_db::setup_all};

    #[actix_rt::test]
    async fn test_master_list_translation() {
        use crate::sync::test::test_data::master_list as test_data;
        let translator = MasterListTranslation;

        let (_, connection, _, _) =
            setup_all("test_master_list_translation", MockDataInserts::none()).await;

        for record in test_data::test_pull_upsert_records() {
            assert!(translator.should_translate_from_sync_record(&record.sync_buffer_row));
            let translation_result = translator
                .try_translate_from_upsert_sync_record(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }
    }
}
