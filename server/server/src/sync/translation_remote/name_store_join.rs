use repository::{
    schema::{NameStoreJoinRow, RemoteSyncBufferRow},
    NameRepository, StorageConnection,
};

use serde::Deserialize;

use crate::sync::SyncTranslationError;

use super::{
    IntegrationRecord, IntegrationUpsertRecord, RemotePullTranslation,
    TRANSLATION_RECORD_NAME_STORE_JOIN,
};

#[allow(non_snake_case)]
#[derive(Deserialize)]
struct LegacyNameStoreJoinRow {
    ID: String,
    store_ID: String,
    name_ID: String,
}

pub struct NameStoreJoinTranslation {}
impl RemotePullTranslation for NameStoreJoinTranslation {
    fn try_translate_pull(
        &self,
        connection: &StorageConnection,
        sync_record: &RemoteSyncBufferRow,
    ) -> Result<Option<super::IntegrationRecord>, SyncTranslationError> {
        let table_name = TRANSLATION_RECORD_NAME_STORE_JOIN;

        if sync_record.table_name != table_name {
            return Ok(None);
        }

        let data = serde_json::from_str::<LegacyNameStoreJoinRow>(&sync_record.data).map_err(
            |source| SyncTranslationError {
                table_name,
                source: source.into(),
                record: sync_record.data.clone(),
            },
        )?;

        let name = match NameRepository::new(connection)
            .find_one_by_id(&data.name_ID)
            .map_err(|source| SyncTranslationError {
                table_name,
                source: source.into(),
                record: sync_record.data.clone(),
            })? {
            Some(name) => name,
            None => {
                return Err(SyncTranslationError {
                    table_name,
                    source: anyhow::Error::msg(format!("Failed to get name: {}", data.name_ID)),
                    record: sync_record.data.clone(),
                })
            }
        };

        Ok(Some(IntegrationRecord::from_upsert(
            IntegrationUpsertRecord::NameStoreJoin(NameStoreJoinRow {
                id: data.ID,
                name_id: data.name_ID,
                store_id: data.store_ID,
                name_is_customer: name.is_customer,
                name_is_supplier: name.is_supplier,
            }),
        )))
    }
}
