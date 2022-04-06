use crate::sync::translation_central::TRANSLATION_RECORD_STORE;
use repository::schema::{CentralSyncBufferRow, StoreRow};

use serde::Deserialize;

use super::{CentralPushTranslation, IntegrationUpsertRecord};

#[allow(non_snake_case)]
#[derive(Deserialize)]
pub struct LegacyStoreRow {
    #[serde(rename = "ID")]
    id: String,
    #[serde(rename = "name_ID")]
    name_id: String,
    code: String,
    #[serde(rename = "sync_id_remote_site")]
    site_id: i32,
}

pub struct StoreTranslation {}
impl CentralPushTranslation for StoreTranslation {
    fn try_translate(
        &self,
        sync_record: &CentralSyncBufferRow,
    ) -> Result<Option<IntegrationUpsertRecord>, anyhow::Error> {
        let table_name = TRANSLATION_RECORD_STORE;
        if sync_record.table_name != table_name {
            return Ok(None);
        }

        let data = serde_json::from_str::<LegacyStoreRow>(&sync_record.data)?;

        // Ignore the following stores as they are system stores with some properties that prevent them from being integrated
        // HIS -> Hospital Information System (no name_id)
        // SM -> Supervisor Store
        // DRG -> Drug Registration (name_id exists but no name with that id)
        match &data.code[..] {
            "HIS" => return Ok(None),
            "DRG" => return Ok(None),
            "SM" => return Ok(None),
            _ => {}
        }

        // ignore stores without name
        if data.name_id == "" {
            return Ok(None);
        }

        Ok(Some(IntegrationUpsertRecord::Store(StoreRow {
            id: data.id,
            name_id: data.name_id,
            code: data.code,
            site_id: data.site_id,
        })))
    }
}

#[cfg(test)]
mod tests {
    use super::CentralPushTranslation;
    use crate::sync::translation_central::{
        store::StoreTranslation,
        test_data::{store::get_test_store_records, TestSyncDataRecord},
        IntegrationUpsertRecord,
    };

    #[test]
    fn test_store_translation() {
        for record in get_test_store_records() {
            match record.translated_record {
                TestSyncDataRecord::Store(translated_record) => {
                    assert_eq!(
                        StoreTranslation {}
                            .try_translate(&record.central_sync_buffer_row)
                            .unwrap(),
                        translated_record.map(|r| (IntegrationUpsertRecord::Store(r))),
                        "{}",
                        record.identifier
                    )
                }
                _ => panic!("Testing wrong record type {:#?}", record.translated_record),
            }
        }
    }
}
