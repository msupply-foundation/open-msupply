use serde::{Deserialize, Serialize};

use repository::{
    ChangelogRow, ClinicianLinkRowRepository, ClinicianStoreJoinRow, ClinicianStoreJoinRowDelete,
    ClinicianStoreJoinRowRepository, StorageConnection, SyncBufferRow,
};

use crate::sync::translations::{clinician::ClinicianTranslation, store::StoreTranslation};

use super::{PullTranslateResult, PushTranslateResult, SyncTranslation};

#[derive(Deserialize, Serialize)]
pub struct LegacyClinicianStoreJoinRow {
    #[serde(rename = "ID")]
    pub id: String,
    #[serde(rename = "store_ID")]
    pub store_id: String,
    #[serde(rename = "prescriber_ID")]
    pub prescriber_id: String,
}

// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(ClinicianStoreJoinTranslation)
}

pub(super) struct ClinicianStoreJoinTranslation;
impl SyncTranslation for ClinicianStoreJoinTranslation {
    fn table_name(&self) -> &str {
        "clinician_store_join"
    }

    fn pull_dependencies(&self) -> Vec<&str> {
        vec![
            StoreTranslation.table_name(),
            ClinicianTranslation.table_name(),
        ]
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        _connection: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let LegacyClinicianStoreJoinRow {
            id,
            store_id,
            prescriber_id,
        } = serde_json::from_str::<LegacyClinicianStoreJoinRow>(&sync_record.data)?;

        let result = ClinicianStoreJoinRow {
            id,
            store_id,
            clinician_link_id: prescriber_id,
        };
        Ok(PullTranslateResult::upsert(result))
    }

    fn try_translate_to_upsert_sync_record(
        &self,
        connection: &StorageConnection,
        changelog: &ChangelogRow,
    ) -> Result<PushTranslateResult, anyhow::Error> {
        let ClinicianStoreJoinRow {
            id,
            store_id,
            clinician_link_id,
        } = ClinicianStoreJoinRowRepository::new(connection)
            .find_one_by_id(&changelog.record_id)?
            .ok_or(anyhow::Error::msg(format!(
                "Clinician row ({}) not found",
                changelog.record_id
            )))?;

        let clinician_link_row = ClinicianLinkRowRepository::new(connection)
            .find_one_by_id(&clinician_link_id)?
            .ok_or_else(|| {
                anyhow::anyhow!(format!(
                    "Clinician link row ({}) not found",
                    clinician_link_id
                ))
            })?;

        let legacy_row = LegacyClinicianStoreJoinRow {
            id: id.clone(),
            store_id,
            prescriber_id: clinician_link_row.clinician_id,
        };

        Ok(PushTranslateResult::upsert(
            changelog,
            self.table_name(),
            serde_json::to_value(legacy_row)?,
        ))
    }

    fn try_translate_from_delete_sync_record(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        Ok(PullTranslateResult::delete(ClinicianStoreJoinRowDelete(
            sync_record.record_id.clone(),
        )))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{mock::MockDataInserts, test_db::setup_all};

    #[actix_rt::test]
    async fn test_clinician_store_join_translation() {
        use crate::sync::test::test_data::clinician_store_join as test_data;
        let translator = ClinicianStoreJoinTranslation {};

        let (_, connection, _, _) = setup_all(
            "test_clinician_store_join_translation",
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

        for record in test_data::test_pull_delete_records() {
            assert!(translator.should_translate_from_sync_record(&record.sync_buffer_row));
            let translation_result = translator
                .try_translate_from_delete_sync_record(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }
    }
}
