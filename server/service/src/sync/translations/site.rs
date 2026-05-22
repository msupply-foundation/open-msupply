use super::serde_utils::deserialize_sync_version;
use super::{PullTranslateResult, SyncTranslation};
use crate::sync::CentralServerConfig;
use crate::sync::translations::PushTranslateResult;
use repository::{ChangelogRow, ChangelogTableName, Row, SiteRow, SiteRowDelete, StorageConnection, SyncBufferRow, SyncVersion};
use serde::{Deserialize, Serialize};
use util::sync_serde::{empty_str_as_option_string, option_string_as_empty_str};

#[allow(non_snake_case)]
#[derive(Deserialize, Debug)]
pub struct LegacySitePullRow {
    #[serde(rename = "ID")]
    pub id: String,
    #[serde(rename = "site_ID")]
    pub site_id: i32,
    pub name: String,
    #[serde(rename = "password_hash")]
    pub hashed_password: String,
    #[serde(rename = "hardwareID", deserialize_with = "empty_str_as_option_string")]
    pub hardware_id: Option<String>,
    pub code: Option<String>,
    /// 4D site.sync_version is a free-text field; "v7" upgrades the site,
    /// anything else (including empty) is treated as v5/v6.
    #[serde(default, deserialize_with = "deserialize_sync_version")]
    pub(crate) sync_version: SyncVersion,
}

#[derive(Serialize, Debug)]
pub struct LegacySitePushRow {
    #[serde(rename = "hardwareID", serialize_with = "option_string_as_empty_str")]
    pub hardware_id: Option<String>,
}

// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(SiteTranslation)
}

pub(super) struct SiteTranslation;

impl SyncTranslation for SiteTranslation {
    fn table_name(&self) -> &str {
        "site"
    }

    fn pull_dependencies(&self) -> Vec<&str> {
        vec![]
    }

    fn change_log_type(&self) -> Option<ChangelogTableName> {
        Some(ChangelogTableName::Site)
    }

    fn should_translate_from_sync_record(&self, row: &SyncBufferRow) -> bool {
        // Site rows are only integrated on the central server
        row.table_name == self.table_name() && CentralServerConfig::is_central_server()
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let data = serde_json::from_value::<LegacySitePullRow>(sync_record.data.0.clone())?;

        let result = SiteRow {
            id: data.site_id,
            og_id: Some(data.id),
            name: data.name,
            hashed_password: data.hashed_password,
            hardware_id: data.hardware_id,
            code: data.code.unwrap_or_default(),
            // token is OMS-managed and never comes from OG
            token: None,
            sync_version: data.sync_version,
        };

        Ok(PullTranslateResult::upsert(result))
    }
    
    fn try_translate_to_upsert_sync_record(
        &self,
        _connection: &StorageConnection,
        changelog: &ChangelogRow,
        row: Row,
    ) -> Result<PushTranslateResult, anyhow::Error>
    {
        let Row::Site(site_row) = row else {
            return Ok(PushTranslateResult::NotMatched);
        };
        
        let result = LegacySitePushRow { hardware_id: site_row.hardware_id };
        Ok(PushTranslateResult::upsert(changelog, self.table_name(), serde_json::to_value(result)?))
    }

    fn try_translate_from_delete_sync_record(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        Ok(PullTranslateResult::delete(SiteRowDelete(
            sync_record.record_id.clone(),
        )))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::sync::test_util_set_is_central_server;
    use repository::{mock::MockDataInserts, test_db::setup_all};

    #[actix_rt::test]
    async fn test_site_translation() {
        use crate::sync::test::test_data::site as test_data;
        let translator = SiteTranslation {};

        let (_, connection, _, _) =
            setup_all("test_site_translation", MockDataInserts::none()).await;

        // Should not translate on non-central sites
        test_util_set_is_central_server(false);
        for record in test_data::test_pull_upsert_records() {
            assert!(!translator.should_translate_from_sync_record(&record.sync_buffer_row));
        }

        test_util_set_is_central_server(true);

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
