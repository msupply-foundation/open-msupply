use repository::{ItemRow, ItemRowType, StorageConnection, SyncBufferRow};
use serde::Deserialize;

use super::{IntegrationRecords, LegacyTableName, PullUpsertRecord, SyncTranslation};

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

pub(crate) struct ItemTranslation {}
impl SyncTranslation for ItemTranslation {
    fn try_translate_pull(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<Option<IntegrationRecords>, anyhow::Error> {
        let table_name = LegacyTableName::ITEM;

        if sync_record.table_name != table_name {
            return Ok(None);
        }
        let data = serde_json::from_str::<LegacyItemRow>(&sync_record.data)?;

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

        Ok(Some(IntegrationRecords::from_upsert(
            PullUpsertRecord::Item(result),
        )))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{mock::MockDataInserts, test_db::setup_all};

    #[actix_rt::test]
    async fn test_item_translation() {
        use crate::sync::test::test_data::item as test_data;
        let translator = ItemTranslation {};

        let (_, connection, _, _) =
            setup_all("test_item_translation", MockDataInserts::none()).await;

        for record in test_data::test_pull_records() {
            let translation_result = translator
                .try_translate_pull(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }
    }
}
