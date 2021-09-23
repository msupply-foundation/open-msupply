use crate::database::schema::{CentralSyncBufferRow, NameRow};

use serde::Deserialize;

#[allow(non_snake_case)]
#[derive(Deserialize)]
pub struct LegacyNameRow {
    ID: String,
    name: String,
    code: String,
    customer: bool,
    supplier: bool,
}

impl LegacyNameRow {
    pub fn try_translate(
        sync_record: &CentralSyncBufferRow,
    ) -> Result<Option<NameRow>, serde_json::Error> {
        if sync_record.table_name != "name" {
            return Ok(None);
        }
        let data = serde_json::from_str::<LegacyNameRow>(&sync_record.data)?;

        Ok(Some(NameRow {
            id: data.ID.to_string(),
            name: data.name.to_string(),
            code: data.code.to_string(),
            is_customer: data.customer,
            is_supplier: data.supplier,
        }))
    }
}

#[cfg(test)]
mod tests {
    use crate::util::sync::translation::{
        name::LegacyNameRow,
        test_data::{name::get_test_name_records, TestSyncDataRecord},
    };

    #[test]
    fn test_name_translation() {
        for record in get_test_name_records() {
            match record.translated_record {
                TestSyncDataRecord::Name(translated_record) => {
                    assert_eq!(
                        LegacyNameRow::try_translate(&record.central_sync_buffer_row).unwrap(),
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
