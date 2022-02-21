use crate::sync::translation_central::{SyncTranslationError, TRANSLATION_RECORD_LIST_MASTER};
use repository::schema::{CentralSyncBufferRow, MasterListRow};

use serde::Deserialize;

#[allow(non_snake_case)]
#[derive(Deserialize)]
pub struct LegacyListMasterRow {
    ID: String,
    description: String,
    code: String,
    note: String,
}

impl LegacyListMasterRow {
    pub fn try_translate(
        sync_record: &CentralSyncBufferRow,
    ) -> Result<Option<MasterListRow>, SyncTranslationError> {
        let table_name = TRANSLATION_RECORD_LIST_MASTER;

        if sync_record.table_name != table_name {
            return Ok(None);
        }

        let data =
            serde_json::from_str::<LegacyListMasterRow>(&sync_record.data).map_err(|source| {
                SyncTranslationError {
                    table_name,
                    source: source.into(),
                    record: sync_record.data.clone(),
                }
            })?;

        Ok(Some(MasterListRow {
            id: data.ID,
            name: data.description,
            code: data.code,
            description: data.note,
        }))
    }
}

#[cfg(test)]
mod tests {
    use crate::sync::translation_central::{
        list_master::LegacyListMasterRow,
        test_data::{master_list::get_test_master_list_records, TestSyncDataRecord},
    };

    #[test]
    fn test_list_master_line_translation() {
        for record in get_test_master_list_records() {
            match record.translated_record {
                TestSyncDataRecord::MasterList(translated_record) => {
                    assert_eq!(
                        LegacyListMasterRow::try_translate(&record.central_sync_buffer_row)
                            .unwrap(),
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
