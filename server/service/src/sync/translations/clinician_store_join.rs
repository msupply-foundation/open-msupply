use serde::{Deserialize, Serialize};

use repository::{
    ChangelogRow, ChangelogTableName, ClinicianLinkRowRepository, ClinicianStoreJoinRow,
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

    fn change_log_type(&self) -> Option<ChangelogTableName> {
        Some(ChangelogTableName::ClinicianStoreJoin)
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

    fn try_translate_to_delete_sync_record(
        &self,
        _: &StorageConnection,
        changelog: &ChangelogRow,
    ) -> Result<PushTranslateResult, anyhow::Error> {
        Ok(PushTranslateResult::delete(changelog, self.table_name()))
    }
}
