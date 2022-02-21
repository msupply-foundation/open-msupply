use crate::sync::translation_central::{SyncTranslationError, TRANSLATION_RECORD_STORE};
use repository::schema::{CentralSyncBufferRow, StoreRow};

use serde::Deserialize;

#[allow(non_snake_case)]
#[derive(Deserialize)]
pub struct LegacyStoreRow {
    ID: String,
    name_ID: String,
    code: String,
}

impl LegacyStoreRow {
    pub fn try_translate(
        sync_record: &CentralSyncBufferRow,
    ) -> Result<Option<StoreRow>, SyncTranslationError> {
        let table_name = TRANSLATION_RECORD_STORE;

        if sync_record.table_name != table_name {
            return Ok(None);
        }

        let data = serde_json::from_str::<LegacyStoreRow>(&sync_record.data).map_err(|source| {
            SyncTranslationError {
                table_name,
                source: source.into(),
                record: sync_record.data.clone(),
            }
        })?;

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

        Ok(Some(StoreRow {
            id: data.ID,
            name_id: data.name_ID,
            code: data.code,
        }))
    }
}

#[cfg(test)]
mod tests {
    use crate::sync::translation_central::{
        store::LegacyStoreRow,
        test_data::{store::get_test_store_records, TestSyncDataRecord},
    };

    #[test]
    fn test_store_translation() {
        for record in get_test_store_records() {
            match record.translated_record {
                TestSyncDataRecord::Store(translated_record) => {
                    assert_eq!(
                        LegacyStoreRow::try_translate(&record.central_sync_buffer_row).unwrap(),
                        translated_record,
                        "{}",
                        record.identifier
                    )
                }
                _ => panic!("Testing wrong record type {:#?}", record.translated_record),
            }
        }
    }
}
