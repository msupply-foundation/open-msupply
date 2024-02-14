use serde::{Deserialize, Serialize};

use repository::{
    ChangelogRow, ChangelogTableName, ClinicianLinkRowRepository, ClinicianStoreJoinRow,
    ClinicianStoreJoinRowRepository, StorageConnection, SyncBufferRow,
};

use crate::sync::{api::RemoteSyncRecordV5, translations::LegacyTableName};

use super::{IntegrationRecords, PullDependency, PullUpsertRecord, SyncTranslation};

#[derive(Deserialize, Serialize)]
pub struct LegacyClinicianStoreJoinRow {
    #[serde(rename = "ID")]
    pub id: String,
    #[serde(rename = "store_ID")]
    pub store_id: String,
    #[serde(rename = "prescriber_ID")]
    pub prescriber_id: String,
}

fn match_pull_table(sync_record: &SyncBufferRow) -> bool {
    sync_record.table_name == LegacyTableName::CLINICIAN_STORE_JOIN
}
fn match_push_table(changelog: &ChangelogRow) -> bool {
    changelog.table_name == ChangelogTableName::ClinicianStoreJoin
}

pub(crate) struct ClinicianStoreJoinTranslation {}
impl SyncTranslation for ClinicianStoreJoinTranslation {
    fn pull_dependencies(&self) -> PullDependency {
        PullDependency {
            table: LegacyTableName::CLINICIAN_STORE_JOIN,
            dependencies: vec![LegacyTableName::STORE, LegacyTableName::CLINICIAN],
        }
    }

    fn try_translate_pull_upsert(
        &self,
        _connection: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<Option<IntegrationRecords>, anyhow::Error> {
        if !match_pull_table(sync_record) {
            return Ok(None);
        }
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
        Ok(Some(IntegrationRecords::from_upsert(
            PullUpsertRecord::ClinicianStoreJoin(result),
        )))
    }

    fn try_translate_push_upsert(
        &self,
        connection: &StorageConnection,
        changelog: &ChangelogRow,
    ) -> Result<Option<Vec<RemoteSyncRecordV5>>, anyhow::Error> {
        if !match_push_table(changelog) {
            return Ok(None);
        }

        let ClinicianStoreJoinRow {
            id,
            store_id,
            clinician_link_id,
        } = ClinicianStoreJoinRowRepository::new(connection)
            .find_one_by_id_option(&changelog.record_id)?
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

        Ok(Some(vec![RemoteSyncRecordV5::new_upsert(
            changelog,
            LegacyTableName::CLINICIAN_STORE_JOIN,
            serde_json::to_value(&legacy_row)?,
        )]))
    }

    fn try_translate_push_delete(
        &self,
        _: &StorageConnection,
        changelog: &ChangelogRow,
    ) -> Result<Option<Vec<RemoteSyncRecordV5>>, anyhow::Error> {
        let result = match_push_table(changelog).then(|| {
            vec![RemoteSyncRecordV5::new_delete(
                changelog,
                LegacyTableName::CLINICIAN_STORE_JOIN,
            )]
        });

        Ok(result)
    }
}
