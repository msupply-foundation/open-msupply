use serde::{Deserialize, Serialize};

use repository::{ItemWarningLinkRow, StorageConnection, SyncBufferRow};

use super::{PullTranslateResult, SyncTranslation};

#[derive(Deserialize, Serialize)]
pub struct LegacyItemWarningLinkRow {
    pub id: String,

    pub item_link_id: String,
    pub warning_id: String,
    pub priority: bool,
}

// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(ItemWarningLinkTranslation)
}

pub(super) struct ItemWarningLinkTranslation;
impl SyncTranslation for ItemWarningLinkTranslation {
    fn table_name(&self) -> &str {
        "item_warning_link"
    }

    fn pull_dependencies(&self) -> Vec<&str> {
        vec![]
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        _connection: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let LegacyItemWarningLinkRow {
            id,
            item_link_id,
            warning_id,
            priority,
        } = serde_json::from_str::<LegacyItemWarningLinkRow>(&sync_record.data)?;

        let result = ItemWarningLinkRow {
            id,
            item_link_id,
            warning_id,
            priority,
        };
        Ok(PullTranslateResult::upsert(result))
    }
}
