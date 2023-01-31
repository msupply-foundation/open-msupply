use serde::{Deserialize, Serialize};

use repository::{
    ChangelogRow, ChangelogTableName, ClinicianRow, ClinicianRowRepository, StorageConnection,
    SyncBufferRow,
};

use crate::sync::{
    api::RemoteSyncRecordV5, sync_serde::empty_str_as_option_string, translations::LegacyTableName,
};

use super::{IntegrationRecords, PullUpsertRecord, SyncTranslation};

#[derive(Deserialize, Serialize)]
pub struct LegacyClinicianRow {
    #[serde(rename = "ID")]
    pub id: String,

    #[serde(rename = "store_ID")]
    pub store_id: String,
    pub code: String,
    pub last_name: String,
    pub initials: String,

    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub first_name: Option<String>,

    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub address1: Option<String>,

    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub address2: Option<String>,

    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub phone: Option<String>,

    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub mobile: Option<String>,

    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub email: Option<String>,
    #[serde(rename = "female")]
    pub is_female: bool,
    #[serde(rename = "active")]
    pub is_active: bool,
}

fn match_pull_table(sync_record: &SyncBufferRow) -> bool {
    sync_record.table_name == LegacyTableName::CLINICIAN
}
fn match_push_table(changelog: &ChangelogRow) -> bool {
    changelog.table_name == ChangelogTableName::Clinician
}

pub(crate) struct ClinicianTranslation {}
impl SyncTranslation for ClinicianTranslation {
    fn try_translate_pull_upsert(
        &self,
        _connection: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<Option<IntegrationRecords>, anyhow::Error> {
        if !match_pull_table(sync_record) {
            return Ok(None);
        }
        let LegacyClinicianRow {
            id,
            store_id,
            code,
            last_name,
            initials,
            first_name,
            address1,
            address2,
            phone,
            mobile,
            email,
            is_female,
            is_active,
        } = serde_json::from_str::<LegacyClinicianRow>(&sync_record.data)?;

        let result = ClinicianRow {
            id,
            store_id,
            code,
            last_name,
            initials,
            first_name,
            address1,
            address2,
            phone,
            mobile,
            email,
            is_female,
            is_active,
        };
        Ok(Some(IntegrationRecords::from_upsert(
            PullUpsertRecord::Clinician(result),
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

        let ClinicianRow {
            id,
            store_id,
            code,
            last_name,
            initials,
            first_name,
            address1,
            address2,
            phone,
            mobile,
            email,
            is_female,
            is_active,
        } = ClinicianRowRepository::new(connection)
            .find_one_by_id(&changelog.record_id)?
            .ok_or(anyhow::Error::msg(format!(
                "Clinician row ({}) not found",
                changelog.record_id
            )))?;

        let legacy_row = LegacyClinicianRow {
            id: id.clone(),
            store_id,
            code,
            last_name,
            initials,
            first_name,
            address1,
            address2,
            phone,
            mobile,
            email,
            is_female,
            is_active,
        };

        Ok(Some(vec![RemoteSyncRecordV5::new_upsert(
            changelog,
            LegacyTableName::CLINICIAN,
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
                LegacyTableName::CLINICIAN,
            )]
        });

        Ok(result)
    }
}
