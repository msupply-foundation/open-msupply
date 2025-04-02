use serde::{Deserialize, Serialize};

use repository::{StorageConnection, SyncBufferRow, WarningRow};

use super::{PullTranslateResult, SyncTranslation};

#[derive(Deserialize, Serialize)]
pub struct LegacyWarningRow {
    #[serde(rename = "ID")]
    pub id: String,

    pub warning_text: String,
    pub code: String,
}

// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(WarningTranslation)
}

pub(super) struct WarningTranslation;
impl SyncTranslation for WarningTranslation {
    fn table_name(&self) -> &str {
        "warning"
    }

    fn pull_dependencies(&self) -> Vec<&str> {
        vec![]
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        _connection: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let LegacyWarningRow {
            id,
            warning_text,
            code,
        } = serde_json::from_str::<LegacyWarningRow>(&sync_record.data)?;

        let result = WarningRow {
            id,
            code,
            warning_text,
        };
        Ok(PullTranslateResult::upsert(result))
    }
}
