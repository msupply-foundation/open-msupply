use super::SyncRecord;

use crate::database::schema::ItemRow;

use serde::Deserialize;

#[allow(non_snake_case)]
#[derive(Deserialize)]
pub struct LegacyItemRow {
    ID: String,
    item_name: String,
    code: String,
}

impl LegacyItemRow {
    pub fn try_translate(sync_record: &SyncRecord) -> Result<Option<ItemRow>, String> {
        if sync_record.record_type != "item" {
            return Ok(None);
        }
        let data = serde_json::from_str::<LegacyItemRow>(&sync_record.data)
            .map_err(|_| "Deserialization Error".to_string())?;
        Ok(Some(ItemRow {
            id: data.ID,
            name: data.item_name,
            code: data.code,
        }))
    }
}

#[cfg(test)]
mod tests {
    use crate::util::sync::translation::{
        item::LegacyItemRow,
        test_data::{item::get_test_item_records, TestSyncDataRecord},
    };

    #[test]
    fn test_item_translation() {
        for record in get_test_item_records() {
            match record.translated_record {
                TestSyncDataRecord::Item(translated_record) => {
                    assert_eq!(
                        LegacyItemRow::try_translate(&record.sync_record).unwrap(),
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
