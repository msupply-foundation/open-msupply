use super::SyncRecord;

use crate::database::schema::ItemRow;

use serde::Deserialize;

#[derive(Deserialize)]
pub struct LegacyItemRow {
    #[serde(rename = "ID")]
    id: String,
    item_name: String,
    type_of: String,
}

impl LegacyItemRow {
    pub fn try_translate(sync_record: &SyncRecord) -> Result<Option<ItemRow>, String> {
        if sync_record.record_type != "item" {
            return Ok(None);
        }
        let data = serde_json::from_str::<LegacyItemRow>(&sync_record.data)
            .map_err(|_| "Deserialization Error".to_string())?;
        Ok(Some(ItemRow {
            id: data.id.to_string(),
            name: data.item_name.to_string(),
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
