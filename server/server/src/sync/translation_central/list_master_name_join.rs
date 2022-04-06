use crate::sync::translation_central::TRANSLATION_RECORD_LIST_MASTER_NAME_JOIN;
use repository::schema::{CentralSyncBufferRow, MasterListNameJoinRow};

use serde::Deserialize;

use super::{CentralPushTranslation, IntegrationUpsertRecord};

#[allow(non_snake_case)]
#[derive(Deserialize)]
pub struct LegacyListMasterNameJoinRow {
    ID: String,
    name_ID: String,
    list_master_ID: String,
}

pub struct MasterListNameJoinTranslation {}
impl CentralPushTranslation for MasterListNameJoinTranslation {
    fn try_translate(
        &self,
        sync_record: &CentralSyncBufferRow,
    ) -> Result<Option<IntegrationUpsertRecord>, anyhow::Error> {
        let table_name = TRANSLATION_RECORD_LIST_MASTER_NAME_JOIN;
        if sync_record.table_name != table_name {
            return Ok(None);
        }

        let data = serde_json::from_str::<LegacyListMasterNameJoinRow>(&sync_record.data)?;
        if data.name_ID == "" {
            return Ok(None);
        }

        Ok(Some(IntegrationUpsertRecord::MasterListNameJoin(
            MasterListNameJoinRow {
                id: data.ID,
                master_list_id: data.list_master_ID,
                name_id: data.name_ID,
            },
        )))
    }
}

#[cfg(test)]
mod tests {
    use crate::sync::translation_central::{
        list_master_name_join::MasterListNameJoinTranslation,
        test_data::{
            master_list_name_join::get_test_master_list_name_join_records, TestSyncDataRecord,
        },
        CentralPushTranslation, IntegrationUpsertRecord,
    };

    #[test]
    fn test_list_master_line_translation() {
        for record in get_test_master_list_name_join_records() {
            match record.translated_record {
                TestSyncDataRecord::MasterListNameJoin(translated_record) => {
                    assert_eq!(
                        MasterListNameJoinTranslation {}
                            .try_translate(&record.central_sync_buffer_row)
                            .unwrap(),
                        translated_record.map(|r| (IntegrationUpsertRecord::MasterListNameJoin(r))),
                        "{}",
                        record.identifier
                    )
                }
                _ => panic!("Testing wrong record type {:#?}", record.translated_record),
            }
        }
    }
}
