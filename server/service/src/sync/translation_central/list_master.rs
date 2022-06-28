use crate::sync::translation_central::TRANSLATION_RECORD_LIST_MASTER;
use repository::{CentralSyncBufferRow, MasterListRow};

use serde::Deserialize;

use super::{CentralPushTranslation, IntegrationUpsertRecord};

#[allow(non_snake_case)]
#[derive(Deserialize)]
pub struct LegacyListMasterRow {
    ID: String,
    description: String,
    code: String,
    note: String,
}

pub struct MasterListTranslation {}
impl CentralPushTranslation for MasterListTranslation {
    fn try_translate(
        &self,
        sync_record: &CentralSyncBufferRow,
    ) -> Result<Option<IntegrationUpsertRecord>, anyhow::Error> {
        let table_name = TRANSLATION_RECORD_LIST_MASTER;
        if sync_record.table_name != table_name {
            return Ok(None);
        }

        let data = serde_json::from_str::<LegacyListMasterRow>(&sync_record.data)?;
        Ok(Some(IntegrationUpsertRecord::MasterList(MasterListRow {
            id: data.ID,
            name: data.description,
            code: data.code,
            description: data.note,
        })))
    }
}

#[cfg(test)]
mod tests {
    use super::CentralPushTranslation;
    use crate::sync::translation_central::{
        list_master::MasterListTranslation,
        test_data::{master_list::get_test_master_list_records, TestSyncDataRecord},
        IntegrationUpsertRecord,
    };

    #[test]
    fn test_list_master_line_translation() {
        for record in get_test_master_list_records() {
            match record.translated_record {
                TestSyncDataRecord::MasterList(translated_record) => {
                    assert_eq!(
                        MasterListTranslation {}
                            .try_translate(&record.central_sync_buffer_row)
                            .unwrap(),
                        translated_record.map(|r| (IntegrationUpsertRecord::MasterList(r))),
                        "{}",
                        record.identifier
                    )
                }
                _ => panic!("Testing wrong record type {:#?}", record.translated_record),
            }
        }
    }
}
