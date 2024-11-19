use chrono::Utc;
use repository::{
    item_category::{ItemCategoryFilter, ItemCategoryRepository},
    item_category_row::ItemCategoryJoinRow,
    ChangelogRow, ChangelogTableName, EqualFilter, ItemRow, ItemRowDelete, ItemRowRepository,
    ItemType, StorageConnection, SyncBufferRow, VENCategory,
};
use serde::{Deserialize, Serialize};

use crate::sync::{
    sync_serde::empty_str_as_option_string, translations::unit::UnitTranslation,
    CentralServerConfig,
};

use super::{IntegrationOperation, PullTranslateResult, PushTranslateResult, SyncTranslation};

#[allow(non_camel_case_types)]
#[derive(Deserialize, Serialize)]
pub enum LegacyItemType {
    non_stock,
    service,
    general,
}

#[allow(non_snake_case)]
#[derive(Deserialize, Serialize)]
pub struct LegacyItemRow {
    ID: String,
    item_name: String,
    code: String,
    #[serde(deserialize_with = "empty_str_as_option_string")]
    unit_ID: Option<String>,
    type_of: LegacyItemType,
    default_pack_size: f64,
    is_vaccine: bool,
    VEN_category: String,
    #[serde(deserialize_with = "empty_str_as_option_string")]
    strength: Option<String>,
    doses: i32,
    #[serde(deserialize_with = "empty_str_as_option_string")]
    category_ID: Option<String>,
}

fn to_item_type(type_of: LegacyItemType) -> ItemType {
    match type_of {
        LegacyItemType::non_stock => ItemType::NonStock,
        LegacyItemType::service => ItemType::Service,
        LegacyItemType::general => ItemType::Stock,
    }
}
fn to_legacy_item_type(r#type: ItemType) -> LegacyItemType {
    match r#type {
        ItemType::NonStock => LegacyItemType::non_stock,
        ItemType::Service => LegacyItemType::service,
        ItemType::Stock => LegacyItemType::general,
    }
}

fn to_ven_category(ven_category: String) -> VENCategory {
    match ven_category.as_str() {
        "V" => VENCategory::V,
        "E" => VENCategory::E,
        "N" => VENCategory::N,
        _ => VENCategory::NotAssigned,
    }
}
fn to_legacy_ven_category(ven_category: VENCategory) -> String {
    match ven_category {
        VENCategory::V => "V".to_string(),
        VENCategory::E => "E".to_string(),
        VENCategory::N => "N".to_string(),
        VENCategory::NotAssigned => "".to_string(),
    }
}

pub(crate) fn ordered_simple_json(text: &str) -> Result<String, serde_json::Error> {
    let json: serde_json::Value = serde_json::from_str(text)?;
    serde_json::to_string(&json)
}

// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(ItemTranslation)
}

pub(super) struct ItemTranslation;
impl SyncTranslation for ItemTranslation {
    fn table_name(&self) -> &str {
        "item"
    }

    fn pull_dependencies(&self) -> Vec<&str> {
        vec![UnitTranslation.table_name()]
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        connection: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let data = serde_json::from_str::<LegacyItemRow>(&sync_record.data)?;

        let mut integration_operations = Vec::new();

        // Translate the item_category join row
        let item_category_upserts = translate_item_category_join(connection, &data)?;

        // Translate the item row
        let item_row = ItemRow {
            id: data.ID.clone(),
            name: data.item_name,
            code: data.code,
            unit_id: data.unit_ID,
            r#type: to_item_type(data.type_of),
            legacy_record: ordered_simple_json(&sync_record.data)?,
            default_pack_size: data.default_pack_size,
            is_active: true,
            is_vaccine: data.is_vaccine,
            strength: data.strength,
            ven_category: to_ven_category(data.VEN_category),
            vaccine_doses: data.doses,
        };

        integration_operations.push(IntegrationOperation::upsert(item_row));
        integration_operations.extend(item_category_upserts);

        Ok(PullTranslateResult::IntegrationOperations(
            integration_operations,
        ))
    }

    fn try_translate_from_delete_sync_record(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        Ok(PullTranslateResult::delete(ItemRowDelete(
            sync_record.record_id.clone(),
        )))
    }

    fn change_log_type(&self) -> Option<ChangelogTableName> {
        Some(ChangelogTableName::Item)
    }

    fn try_translate_to_upsert_sync_record(
        &self,
        connection: &StorageConnection,
        changelog: &ChangelogRow,
    ) -> Result<PushTranslateResult, anyhow::Error> {
        if !CentralServerConfig::is_central_server() {
            return Err(anyhow::anyhow!(
                "Item push is only supported from the central server"
            ));
        }

        let Some(item) = ItemRowRepository::new(connection).find_one_by_id(&changelog.record_id)?
        else {
            return Err(anyhow::anyhow!(
                "Item with ID {} could not be found",
                changelog.record_id
            ));
        };

        let ItemRow {
            id,
            name,
            code,
            unit_id,
            r#type,
            legacy_record: _,
            default_pack_size,
            is_active: _,
            is_vaccine,
            strength,
            ven_category,
            vaccine_doses,
        } = item;

        let legacy_row = LegacyItemRow {
            ID: id,
            item_name: name,
            code,
            default_pack_size,
            is_vaccine,
            doses: vaccine_doses,
            unit_ID: unit_id,
            strength,
            type_of: to_legacy_item_type(r#type),
            VEN_category: to_legacy_ven_category(ven_category),
            // Item push is only used for GAPS, which doesn't use item categories
            // Probably better to move management of categories to OMS Central than
            // build out the syncing back and forth of categories to OG!
            category_ID: None,
        };

        let json_record = serde_json::to_value(legacy_row)?;

        Ok(PushTranslateResult::upsert(
            changelog,
            self.table_name(),
            json_record,
        ))
    }
}

fn translate_item_category_join(
    connection: &StorageConnection,
    data: &LegacyItemRow,
) -> Result<Vec<IntegrationOperation>, anyhow::Error> {
    let mut integration_operations = Vec::new();

    let existing_item_category_join = ItemCategoryRepository::new(connection)
        .query_one(ItemCategoryFilter::new().item_id(EqualFilter::equal_to(&data.ID)))?;

    if let Some(item_category) = existing_item_category_join {
        let existing_category_id = item_category.item_category_join_row.category_id.clone();

        let new_category_id = data.category_ID.clone().unwrap_or_default();

        // If latest item data has a different category ID than that in the existing join,
        // or if category has been removed, mark existing join as deleted
        if existing_category_id != new_category_id {
            let deleted_join = ItemCategoryJoinRow {
                deleted_datetime: Some(Utc::now().naive_utc()),
                ..item_category.item_category_join_row
            };
            integration_operations.push(IntegrationOperation::upsert(deleted_join));
        }
    }

    // Upsert the new item category join if a category ID is provided in the latest item data
    if let Some(category_id) = &data.category_ID {
        let item_category_join_row = ItemCategoryJoinRow {
            id: format!("{}-{}", data.ID.clone(), category_id.clone()),
            item_id: data.ID.clone(),
            category_id: category_id.clone(),
            deleted_datetime: None,
        };
        integration_operations.push(IntegrationOperation::upsert(item_category_join_row));
    }

    Ok(integration_operations)
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
            assert!(translator.should_translate_from_sync_record(&record.sync_buffer_row));
            let translation_result = translator
                .try_translate_from_upsert_sync_record(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }

        for record in test_data::test_pull_delete_records() {
            assert!(translator.should_translate_from_sync_record(&record.sync_buffer_row));
            let translation_result = translator
                .try_translate_from_delete_sync_record(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }
    }
}
