use super::SyncRecord;

use crate::database::schema::NameRow;

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
    pub fn try_translate(sync_record: &SyncRecord) -> Result<Option<NameRow>, String> {
        if sync_record.record_type != "name" {
            return Ok(None);
        }
        let data = serde_json::from_str::<LegacyNameRow>(&sync_record.data)
            .map_err(|_| "Deserialization Error".to_string())?;
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
                        LegacyNameRow::try_translate(&record.sync_record).unwrap(),
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
