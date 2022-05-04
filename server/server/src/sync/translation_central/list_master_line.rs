use crate::sync::translation_central::TRANSLATION_RECORD_LIST_MASTER_LINE;
use repository::{CentralSyncBufferRow, MasterListLineRow};

use serde::Deserialize;

use super::{CentralPushTranslation, IntegrationUpsertRecord};

#[allow(non_snake_case)]
#[derive(Deserialize)]
pub struct LegacyListMasterLineRow {
    ID: String,
    item_master_ID: String,
    item_ID: String,
}

pub struct MasterListLineTranslation {}
impl CentralPushTranslation for MasterListLineTranslation {
    fn try_translate(
        &self,
        sync_record: &CentralSyncBufferRow,
    ) -> Result<Option<IntegrationUpsertRecord>, anyhow::Error> {
        let table_name = TRANSLATION_RECORD_LIST_MASTER_LINE;
        if sync_record.table_name != table_name {
            return Ok(None);
        }

        let data = serde_json::from_str::<LegacyListMasterLineRow>(&sync_record.data)?;
        Ok(Some(IntegrationUpsertRecord::MasterListLine(
            MasterListLineRow {
                id: data.ID,
                item_id: data.item_ID,
                master_list_id: data.item_master_ID,
            },
        )))
    }
}

#[cfg(test)]
mod tests {
    use super::CentralPushTranslation;
    use crate::sync::translation_central::{
        list_master_line::MasterListLineTranslation,
        test_data::{master_list_line::get_test_master_list_line_records, TestSyncDataRecord},
        IntegrationUpsertRecord,
    };

    #[test]
    fn test_list_master_line_translation() {
        for record in get_test_master_list_line_records() {
            match record.translated_record {
                TestSyncDataRecord::MasterListLine(translated_record) => {
                    assert_eq!(
                        MasterListLineTranslation {}
                            .try_translate(&record.central_sync_buffer_row)
                            .unwrap(),
                        translated_record.map(|r| (IntegrationUpsertRecord::MasterListLine(r))),
                        "{}",
                        record.identifier
                    )
                }
                _ => panic!("Testing wrong record type {:#?}", record.translated_record),
            }
        }
    }
}
