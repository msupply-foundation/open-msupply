use repository::{RemoteSyncBufferRow, StorageConnection};

use crate::sync::translation_central::{translate_name, LegacyNameRow};

use super::{
    pull::{IntegrationRecord, IntegrationUpsertRecord, RemotePullTranslation},
    TRANSLATION_RECORD_NAME,
};

pub struct NameTranslation {}
impl RemotePullTranslation for NameTranslation {
    fn try_translate_pull(
        &self,
        _: &StorageConnection,
        sync_record: &RemoteSyncBufferRow,
    ) -> Result<Option<super::pull::IntegrationRecord>, anyhow::Error> {
        let table_name = TRANSLATION_RECORD_NAME;

        if sync_record.table_name != table_name {
            return Ok(None);
        }

        let data = serde_json::from_str::<LegacyNameRow>(&sync_record.data)?;
        Ok(Some(IntegrationRecord::from_upsert(
            IntegrationUpsertRecord::Name(translate_name(data)),
        )))
    }
}
