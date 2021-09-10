use super::SyncRecord;

use crate::database::schema::StoreRow;

use serde::Deserialize;

#[derive(Deserialize)]
pub struct LegacyStoreRow {
    #[serde(rename = "ID")]
    id: String,
    #[serde(rename = "name_ID")]
    name_id: String,
    code: String,
    /*
    name: String,
    code: String,
    mwks_export_mode: String,
    IS_HIS: bool,
    sort_issues_by_status_spare: bool,
    disabled: bool,
    responsible_user_ID: String,
    organisation_name: String,
    address_1: String,
    address_2: String,
    //logo": "[object Picture]",
    sync_id_remote_site: u64,
    address_3: String,
    address_4: String,
    address_5: String,
    postal_zip_code: String,
    store_mode: String,
    phone: String,
    tags: String,
    spare_user_1: String,
    spare_user_2: String,
    spare_user_3: String,
    spare_user_4: String,
    spare_user_5: String,
    spare_user_6: String,
    spare_user_7: String,
    spare_user_8: String,
    spare_user_9: String,
    spare_user_10: String,
    spare_user_11: String,
    spare_user_12: String,
    spare_user_13: String,
    spare_user_14: String,
    spare_user_15: String,
    spare_user_16: String,
    //custom_data: null,
    created_date: String,
    */
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
            id: data.id,
            name_id: data.name_id,
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
