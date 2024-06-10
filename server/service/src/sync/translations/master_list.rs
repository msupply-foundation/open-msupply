use repository::{
    MasterListRow, MasterListRowRepository, ProgramRowRepository, StorageConnection, SyncBufferRow,
};

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
        };
        Ok(PullTranslateResult::upsert(result))
    }

    // Soft deletes were implemented in OG months after program requisitions was
    // rolled out, so previously hard deleted records may be gone even if they
    // are linked to program. Set these records to inactive.
    fn try_translate_from_delete_sync_record(
        &self,
        connection: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let program =
            ProgramRowRepository::new(connection).find_one_by_id(&sync_record.record_id)?;
        let master_list =
            MasterListRowRepository::new(connection).find_one_by_id(&sync_record.record_id)?;

        if let (Some(_), Some(master_list)) = (program, master_list) {
            let result = MasterListRow {
                id: master_list.id,
                name: master_list.name,
                code: master_list.code,
                description: master_list.description,
                is_active: false,
            };
            return Ok(PullTranslateResult::upsert(result));
        }

        Ok(PullTranslateResult::Ignored(
            "Master list not in use".to_string(),
        ))
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
