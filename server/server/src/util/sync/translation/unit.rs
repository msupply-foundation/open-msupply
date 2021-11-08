use crate::{
    database::schema::{CentralSyncBufferRow, UnitRow},
    util::sync::translation::{SyncTranslationError, TRANSLATION_RECORD_UNIT},
};

use serde::Deserialize;

#[allow(non_snake_case)]
#[derive(Deserialize)]
pub struct LegacyUnitRow {
    ID: String,
    units: String,
    comment: String,
    order_number: i32,
}

impl LegacyUnitRow {
    pub fn try_translate(
        sync_record: &CentralSyncBufferRow,
    ) -> Result<Option<UnitRow>, SyncTranslationError> {
        let table_name = TRANSLATION_RECORD_UNIT;

        if sync_record.table_name != table_name {
            return Ok(None);
        }

        let data = serde_json::from_str::<LegacyUnitRow>(&sync_record.data).map_err(|source| {
            SyncTranslationError {
                table_name,
                source,
                record: sync_record.data.clone(),
            }
        })?;

        let mut result = UnitRow {
            id: data.ID,
            name: data.units,
            description: None,
            index: data.order_number,
        };

        if data.comment != "" {
            result.description = Some(data.comment);
        }

        Ok(Some(result))
    }
}

#[cfg(test)]
mod tests {
    use crate::util::sync::translation::{
        test_data::{unit::get_test_unit_records, TestSyncDataRecord},
        unit::LegacyUnitRow,
    };

    #[test]
    fn test_unit_translation() {
        for record in get_test_unit_records() {
            match record.translated_record {
                TestSyncDataRecord::Unit(translated_record) => {
                    assert_eq!(
                        LegacyUnitRow::try_translate(&record.central_sync_buffer_row).unwrap(),
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
