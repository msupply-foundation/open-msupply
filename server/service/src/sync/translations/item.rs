use crate::sync::sync_serde::empty_str_as_option_string;
use repository::{ItemRow, ItemRowType, StorageConnection, SyncBufferRow};
use serde::Deserialize;

use super::{
    IntegrationRecords, LegacyTableName, PullDeleteRecordTable, PullDependency, PullUpsertRecord,
    SyncTranslation,
};

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
    #[serde(deserialize_with = "empty_str_as_option_string")]
    unit_ID: Option<String>,
    type_of: LegacyItemType,
    default_pack_size: u32,
}

fn to_item_type(type_of: LegacyItemType) -> ItemRowType {
    match type_of {
        LegacyItemType::non_stock => ItemRowType::NonStock,
        LegacyItemType::service => ItemRowType::Service,
        LegacyItemType::general => ItemRowType::Stock,
    }
}

fn match_pull_table(sync_record: &SyncBufferRow) -> bool {
    sync_record.table_name == LegacyTableName::ITEM
}

pub(crate) fn ordered_simple_json(text: &str) -> Result<String, serde_json::Error> {
    let json: serde_json::Value = serde_json::from_str(&text)?;
    serde_json::to_string(&json)
}

pub(crate) struct ItemTranslation {}
impl SyncTranslation for ItemTranslation {
    fn pull_dependencies(&self) -> PullDependency {
        PullDependency {
            table: LegacyTableName::ITEM,
            dependencies: vec![LegacyTableName::UNIT],
        }
    }

    fn try_translate_pull_upsert(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<Option<IntegrationRecords>, anyhow::Error> {
        if !match_pull_table(sync_record) {
            return Ok(None);
        }
        let data = serde_json::from_str::<LegacyItemRow>(&sync_record.data)?;

        let result = ItemRow {
            id: data.ID,
            name: data.item_name,
            code: data.code,
            unit_id: data.unit_ID,
            r#type: to_item_type(data.type_of),
            legacy_record: ordered_simple_json(&sync_record.data)?,
            default_pack_size: data.default_pack_size as i32,
            is_active: true,
        };

        Ok(Some(IntegrationRecords::from_upsert(
            PullUpsertRecord::Item(result),
        )))
    }

    fn try_translate_pull_delete(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<Option<IntegrationRecords>, anyhow::Error> {
        let result = match_pull_table(sync_record).then(|| {
            IntegrationRecords::from_delete(&sync_record.record_id, PullDeleteRecordTable::Item)
        });

        Ok(result)
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

        for record in test_data::test_pull_upsert_records() {
            let translation_result = translator
                .try_translate_pull_upsert(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }

        for record in test_data::test_pull_delete_records() {
            let translation_result = translator
                .try_translate_pull_delete(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }
    }
}
