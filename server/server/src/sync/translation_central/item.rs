use crate::sync::{translation_central::TRANSLATION_RECORD_ITEM, SyncTranslationError};
use repository::schema::{CentralSyncBufferRow, ItemRow, ItemRowType};

use serde::Deserialize;

#[allow(non_camel_case_types)]
#[derive(Deserialize)]
pub enum LegacyItemType {
    non_stock,
    service,
    general,
}

#[allow(non_snake_case)]
#[derive(Deserialize)]
pub struct LegacyItemRow {
    ID: String,
    item_name: String,
    code: String,
    unit_ID: String,
    type_of: LegacyItemType,
}

fn to_item_type(type_of: LegacyItemType) -> ItemRowType {
    match type_of {
        LegacyItemType::non_stock => ItemRowType::NonStock,
        LegacyItemType::service => ItemRowType::Service,
        LegacyItemType::general => ItemRowType::Stock,
    }
}

impl LegacyItemRow {
    pub fn try_translate(
        sync_record: &CentralSyncBufferRow,
    ) -> Result<Option<ItemRow>, SyncTranslationError> {
        let table_name = TRANSLATION_RECORD_ITEM;

        if sync_record.table_name != table_name {
            return Ok(None);
        }
        let data = serde_json::from_str::<LegacyItemRow>(&sync_record.data).map_err(|source| {
            SyncTranslationError {
                table_name,
                source: source.into(),
                record: sync_record.data.clone(),
            }
        })?;

        let mut result = ItemRow {
            id: data.ID,
            name: data.item_name,
            code: data.code,
            unit_id: None,
            r#type: to_item_type(data.type_of),
            legacy_record: sync_record.data.clone(),
        };

        if data.unit_ID != "" {
            result.unit_id = Some(data.unit_ID);
        }

        Ok(Some(result))
    }
}

#[cfg(test)]
mod tests {
    use crate::sync::translation_central::{
        item::LegacyItemRow,
        test_data::{item::get_test_item_records, TestSyncDataRecord},
    };

    #[test]
    fn test_item_translation() {
        for record in get_test_item_records() {
            match record.translated_record {
                TestSyncDataRecord::Item(translated_record) => {
                    assert_eq!(
                        LegacyItemRow::try_translate(&record.central_sync_buffer_row).unwrap(),
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
