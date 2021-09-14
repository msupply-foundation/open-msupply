use super::SyncRecord;

use crate::database::schema::StoreRow;

use serde::Deserialize;

#[allow(non_snake_case)]
#[derive(Deserialize)]
pub struct LegacyStoreRow {
    ID: String,
    name_ID: String,
    code: String,
}

impl LegacyStoreRow {
    pub fn try_translate(sync_record: &SyncRecord) -> Result<Option<StoreRow>, String> {
        if sync_record.record_type != "store" {
            return Ok(None);
        }

        let data = serde_json::from_str::<LegacyStoreRow>(&sync_record.data)
            .map_err(|_| "Deserialization Error".to_string())?;

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
    use crate::util::sync::translation::{
        store::LegacyStoreRow,
        test_data::{store::get_test_store_records, TestSyncDataRecord},
    };

    #[test]
    fn test_store_translation() {
        for record in get_test_store_records() {
            match record.translated_record {
                TestSyncDataRecord::Store(translated_record) => {
                    assert_eq!(
                        LegacyStoreRow::try_translate(&record.sync_record).unwrap(),
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
