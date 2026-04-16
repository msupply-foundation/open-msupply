use super::{PullTranslateResult, SyncTranslation};
use repository::{SiteRow, SiteRowDelete, StorageConnection, SyncBufferRow};
use serde::{Deserialize, Serialize};

#[allow(non_snake_case)]
#[derive(Deserialize, Serialize, Debug)]
pub struct LegacySiteRow {
    #[serde(rename = "ID")]
    pub id: i32,
    pub name: String,
    #[serde(rename = "password")]
    pub hashed_password: String,
    #[serde(rename = "hardwareID")]
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

    fn try_translate_from_upsert_sync_record(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let data = serde_json::from_str::<LegacySiteRow>(&sync_record.data)?;

        let result = SiteRow {
            id: data.id,
            name: data.name,
            hashed_password: data.hashed_password,
            hardware_id: data.hardware_id,
            // token is OMS-managed and never comes from OG
            token: None,
        };

        Ok(PullTranslateResult::upsert(result))
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
