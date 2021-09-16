use super::SyncRecord;

use crate::database::schema::MasterListNameJoinRow;

use serde::Deserialize;

#[allow(non_snake_case)]
#[derive(Deserialize)]
pub struct LegacyListMasterNameJoinRow {
    ID: String,
    name_ID: String,
    list_master_ID: String,
}

impl LegacyListMasterNameJoinRow {
    pub fn try_translate(
        sync_record: &SyncRecord,
    ) -> Result<Option<MasterListNameJoinRow>, String> {
        if sync_record.record_type != "list_master_name_join" {
            return Ok(None);
        }
        let data = serde_json::from_str::<LegacyListMasterNameJoinRow>(&sync_record.data)
            .map_err(|_| "Deserialization Error".to_string())?;
        Ok(Some(MasterListNameJoinRow {
            id: data.ID,
            master_list_id: data.list_master_ID,
            name_id: data.name_ID,
        }))
    }
}

#[cfg(test)]
mod tests {
    use crate::util::sync::translation::{
        list_master_name_join::LegacyListMasterNameJoinRow,
        test_data::{
            master_list_name_join::get_test_master_list_name_join_records, TestSyncDataRecord,
        },
    };

    #[test]
    fn test_list_master_line_translation() {
        for record in get_test_master_list_name_join_records() {
            match record.translated_record {
                TestSyncDataRecord::MasterListNameJoin(translated_record) => {
                    assert_eq!(
                        LegacyListMasterNameJoinRow::try_translate(&record.sync_record).unwrap(),
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
