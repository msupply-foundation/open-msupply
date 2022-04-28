use crate::sync::translation_central::TRANSLATION_RECORD_UNIT;
use repository::{schema::CentralSyncBufferRow, UnitRow};

use serde::Deserialize;

use super::{CentralPushTranslation, IntegrationUpsertRecord};

#[allow(non_snake_case)]
#[derive(Deserialize)]
pub struct LegacyUnitRow {
    ID: String,
    units: String,
    comment: String,
    order_number: i32,
}

pub struct UnitTranslation {}
impl CentralPushTranslation for UnitTranslation {
    fn try_translate(
        &self,
        sync_record: &CentralSyncBufferRow,
    ) -> Result<Option<IntegrationUpsertRecord>, anyhow::Error> {
        let table_name = TRANSLATION_RECORD_UNIT;
        if sync_record.table_name != table_name {
            return Ok(None);
        }

        let data = serde_json::from_str::<LegacyUnitRow>(&sync_record.data)?;
        let mut result = UnitRow {
            id: data.ID,
            name: data.units,
            description: None,
            index: data.order_number,
        };

        if data.comment != "" {
            result.description = Some(data.comment);
        }

        Ok(Some(IntegrationUpsertRecord::Unit(result)))
    }
}

#[cfg(test)]
mod tests {
    use super::CentralPushTranslation;
    use crate::sync::translation_central::{
        test_data::{unit::get_test_unit_records, TestSyncDataRecord},
        unit::UnitTranslation,
        IntegrationUpsertRecord,
    };

    #[test]
    fn test_unit_translation() {
        for record in get_test_unit_records() {
            match record.translated_record {
                TestSyncDataRecord::Unit(translated_record) => {
                    assert_eq!(
                        UnitTranslation {}
                            .try_translate(&record.central_sync_buffer_row)
                            .unwrap(),
                        translated_record.map(|r| (IntegrationUpsertRecord::Unit(r))),
                        "{}",
                        record.identifier
                    )
                }
                _ => panic!("Testing wrong record type {:#?}", record.translated_record),
            }
        }
    }
}
