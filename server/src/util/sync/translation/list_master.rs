use super::SyncRecord;

use crate::database::schema::MasterListRow;

use serde::Deserialize;

#[allow(non_snake_case)]
#[derive(Deserialize)]
pub struct LegacyListMasterRow {
    ID: String,
    description: String,
    code: String,
}

impl LegacyListMasterRow {
    pub fn try_translate(sync_record: &SyncRecord) -> Result<Option<MasterListRow>, String> {
        if sync_record.record_type != "list_master" {
            return Ok(None);
        }
        let data = serde_json::from_str::<LegacyListMasterRow>(&sync_record.data)
            .map_err(|_| "Deserialization Error".to_string())?;
        Ok(Some(MasterListRow {
            id: data.ID,
            // There is no name in list_master use an empty name
            name: "".to_string(),
            code: data.code,
            description: data.description,
        }))
    }
}

#[cfg(test)]
mod tests {
    use crate::util::sync::translation::{
        list_master::LegacyListMasterRow,
        test_data::{master_list::get_test_master_list_records, TestSyncDataRecord},
    };

    #[test]
    fn test_list_master_line_translation() {
        for record in get_test_master_list_records() {
            match record.translated_record {
                TestSyncDataRecord::MasterList(translated_record) => {
                    assert_eq!(
                        LegacyListMasterRow::try_translate(&record.sync_record).unwrap(),
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
