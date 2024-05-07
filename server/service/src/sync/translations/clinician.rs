use serde::{Deserialize, Serialize};

use repository::{
    ChangelogRow, ChangelogTableName, ClinicianRow, ClinicianRowRepository, GenderType,
    StorageConnection, SyncBufferRow,
};

use crate::sync::sync_serde::empty_str_as_option_string;

use super::{PullTranslateResult, PushTranslateResult, SyncTranslation};

#[derive(Deserialize, Serialize)]
pub struct LegacyClinicianRow {
    #[serde(rename = "ID")]
    pub id: String,

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

// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(ClinicianTranslation)
}

pub(super) struct ClinicianTranslation;
impl SyncTranslation for ClinicianTranslation {
    fn table_name(&self) -> &str {
        "clinician"
    }

    fn pull_dependencies(&self) -> Vec<&str> {
        vec![]
    }

    fn change_log_type(&self) -> Option<ChangelogTableName> {
        Some(ChangelogTableName::Clinician)
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        _connection: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let LegacyClinicianRow {
            id,
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
            code,
            last_name,
            initials,
            first_name,
            address1,
            address2,
            phone,
            mobile,
            email,
            gender: if is_female {
                Some(GenderType::Female)
            } else {
                Some(GenderType::Male)
            },
            is_active,
        };
        Ok(PullTranslateResult::upsert(result))
    }

    fn try_translate_to_upsert_sync_record(
        &self,
        connection: &StorageConnection,
        changelog: &ChangelogRow,
    ) -> Result<PushTranslateResult, anyhow::Error> {
        let ClinicianRow {
            id,
            code,
            last_name,
            initials,
            first_name,
            address1,
            address2,
            phone,
            mobile,
            email,
            gender,
            is_active,
        } = ClinicianRowRepository::new(connection)
            .find_one_by_id_option(&changelog.record_id)?
            .ok_or(anyhow::Error::msg(format!(
                "Clinician row ({}) not found",
                changelog.record_id
            )))?;

        let is_female = gender
            .map(|gender| matches!(gender, GenderType::Female))
            .unwrap_or(false);

        let legacy_row = LegacyClinicianRow {
            id,
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
        Ok(PushTranslateResult::upsert(
            changelog,
            self.table_name(),
            serde_json::to_value(legacy_row)?,
        ))
    }

    // TODO should not be deleting clinicians
    // TODO soft delete
    fn try_translate_to_delete_sync_record(
        &self,
        _: &StorageConnection,
        changelog: &ChangelogRow,
    ) -> Result<PushTranslateResult, anyhow::Error> {
        Ok(PushTranslateResult::delete(changelog, self.table_name()))
    }
}
