use crate::sync::translation_central::TRANSLATION_RECORD_NAME;
use repository::{schema::CentralSyncBufferRow, NameRow};

use serde::Deserialize;

use super::{CentralPushTranslation, IntegrationUpsertRecord};

#[allow(non_snake_case)]
#[derive(Deserialize)]
pub struct LegacyNameRow {
    ID: String,
    name: String,
    code: String,
    customer: bool,
    supplier: bool,
}

pub struct NameTranslation {}
impl CentralPushTranslation for NameTranslation {
    fn try_translate(
        &self,
        sync_record: &CentralSyncBufferRow,
    ) -> Result<Option<IntegrationUpsertRecord>, anyhow::Error> {
        let table_name = TRANSLATION_RECORD_NAME;
        if sync_record.table_name != table_name {
            return Ok(None);
        }

        let data = serde_json::from_str::<LegacyNameRow>(&sync_record.data)?;
        Ok(Some(IntegrationUpsertRecord::Name(NameRow {
            id: data.ID.to_string(),
            name: data.name.to_string(),
            code: data.code.to_string(),
            is_customer: data.customer,
            is_supplier: data.supplier,
            legacy_record: sync_record.data.clone(),
        })))
    }
}

#[cfg(test)]
mod tests {
    use super::CentralPushTranslation;
    use crate::sync::translation_central::{
        name::NameTranslation,
        test_data::{name::get_test_name_records, TestSyncDataRecord},
        IntegrationUpsertRecord,
    };

    #[test]
    fn test_name_translation() {
        for record in get_test_name_records() {
            match record.translated_record {
                TestSyncDataRecord::Name(translated_record) => {
                    assert_eq!(
                        NameTranslation {}
                            .try_translate(&record.central_sync_buffer_row)
                            .unwrap(),
                        translated_record.map(|r| (IntegrationUpsertRecord::Name(r))),
                        "{}",
                        record.identifier
                    )
                }
                _ => panic!("Testing wrong record type {:#?}", record.translated_record),
            }
        }
    }
}
