use chrono::Utc;
use repository::{
    item_category::{ItemCategoryFilter, ItemCategoryRepository},
    item_category_row::ItemCategoryJoinRow,
    ChangelogRow, ChangelogTableName, EqualFilter, ItemRow, ItemRowDelete, ItemType, Row,
    StorageConnection, SyncBufferRow, VENCategory,
};
use serde::{Deserialize, Serialize};

use crate::sync::{
    translations::{
        category::CategoryTranslation, location_type::LocationTypeTranslation,
        unit::UnitTranslation, FkField,
    },
    CentralServerConfig,
};

use util::sync_serde::empty_str_as_option_string;

use super::{
    utils::{legacy_custom_fields_if_central, LegacyCustomFieldsBuilder},
    IntegrationOperation, PullTranslateResult, PushTranslateResult, SyncTranslation,
};

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
    // Two additional flat category dimensions (`item_category2`/`3`), parallel to
    // the main hierarchical `category_ID`. Stored as OPTION ids; no relational
    // counterpart. `default` so older payloads still deserialize.
    #[serde(default, deserialize_with = "empty_str_as_option_string")]
    category2_ID: Option<String>,
    #[serde(default, deserialize_with = "empty_str_as_option_string")]
    category3_ID: Option<String>,
    #[serde(deserialize_with = "empty_str_as_option_string")]
    restricted_location_type_ID: Option<String>,
    volume_per_pack: f64,
    #[serde(deserialize_with = "empty_str_as_option_string")]
    #[serde(rename = "universalcodes_code")]
    universal_code: Option<String>,
    // Legacy 4D `[item]user_field_1..7` custom fields. Unlike name's
    // `custom1/2/3`, the 4D column names are already snake_case so the wire key
    // matches the OMS-side `custom_field.key` 1:1 — no rename needed. Types come
    // from the 4D catalog: 1/2/3/6 Text, 5 Real, 4/7 Boolean. All `default` so
    // payloads from older central versions that omit them still deserialize.
    #[serde(default, deserialize_with = "empty_str_as_option_string")]
    user_field_1: Option<String>,
    #[serde(default, deserialize_with = "empty_str_as_option_string")]
    user_field_2: Option<String>,
    #[serde(default, deserialize_with = "empty_str_as_option_string")]
    user_field_3: Option<String>,
    #[serde(default)]
    user_field_4: Option<bool>,
    #[serde(default)]
    user_field_5: Option<f64>,
    #[serde(default, deserialize_with = "empty_str_as_option_string")]
    user_field_6: Option<String>,
    #[serde(default)]
    user_field_7: Option<bool>,
}

/// Build the `item.custom_fields` JSONB from legacy `[item]user_field_1..7`.
///
/// Each field is stored under its wire key (`user_field_N`, matching the central
/// mapping custom field seeder `central_mapping_custom_fields`) as its native JSON type
/// — text for `1/2/3/6`, real for `5`, boolean for `4/7` — via the shared
/// [`LegacyCustomFieldsBuilder`]. The builder applies the per-type
/// "untouched rows stay clean" rule (empty text, `0.0` and `false` are omitted),
/// so default-only items keep `custom_fields` NULL rather than carrying noise
/// rows that 4D would otherwise emit for every item.
fn build_legacy_item_custom_fields(legacy: &LegacyItemRow) -> Option<serde_json::Value> {
    use crate::sync::central_mapping_custom_fields::keys;
    LegacyCustomFieldsBuilder::new()
        .text(keys::ITEM_USER_FIELD_1, legacy.user_field_1.as_deref())
        .text(keys::ITEM_USER_FIELD_2, legacy.user_field_2.as_deref())
        .text(keys::ITEM_USER_FIELD_3, legacy.user_field_3.as_deref())
        .text(keys::ITEM_USER_FIELD_6, legacy.user_field_6.as_deref())
        .real(keys::ITEM_USER_FIELD_5, legacy.user_field_5)
        .boolean(keys::ITEM_USER_FIELD_4, legacy.user_field_4)
        .boolean(keys::ITEM_USER_FIELD_7, legacy.user_field_7)
        // Item category as a customFields OPTION (parallel to the existing
        // relational `item_category_join` path, which is left untouched). 4D
        // gives an item one leaf `category_ID`; stored as the option id so the
        // client resolves it against the `custom_field_option` rows authored by
        // the category import. See central_mapping_custom_fields (`ITEM_CATEGORY_1`).
        .option(keys::ITEM_CATEGORY_1, legacy.category_ID.as_deref())
        // Flat category dimensions 2 & 3 (`item_category2`/`3`).
        .option(keys::ITEM_CATEGORY_2, legacy.category2_ID.as_deref())
        .option(keys::ITEM_CATEGORY_3, legacy.category3_ID.as_deref())
        .build()
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
    let mut json: serde_json::Value = serde_json::from_str(text)?;
    // Saving dose_picture 'picture' type as incoming 'empty string' causes issues in integration tests
    if let Some(json_as_object) = json.as_object_mut() {
        json_as_object.remove("dose_picture");
    }
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
        let mut deps = vec![
            UnitTranslation.table_name(),
            LocationTypeTranslation.table_name(),
        ];
        deps.extend(CategoryTranslation.table_names());

        deps
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        connection: &StorageConnection,
        fk_checker: &crate::sync::translations::FkChecker,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let data = sync_record.deserialize::<LegacyItemRow>()?;

        // Custom fields import is central-only (see `legacy_custom_fields_if_central`).
        // Computed before `data`'s fields are moved into `item_row` below.
        let custom_fields = legacy_custom_fields_if_central(|| build_legacy_item_custom_fields(&data));

        let mut integration_operations = Vec::new();

        // Translate the item_category join row
        let item_category_upserts = translate_item_category_join(connection, fk_checker, &data)?;

        let fk_check = fk_checker.with_table(connection, "item", &data.ID);

        let unit_id = fk_check(data.unit_ID, "unit_id", FkField::Unit)?;
        let restricted_location_type_id = fk_check(
            data.restricted_location_type_ID,
            "restricted_location_type_id",
            FkField::LocationType,
        )?;

        // Translate the item row
        let item_row = ItemRow {
            id: data.ID.clone(),
            name: data.item_name,
            code: data.code,
            unit_id,
            r#type: to_item_type(data.type_of),
            legacy_record: ordered_simple_json(&serde_json::to_string(&sync_record.data.0)?)?,
            default_pack_size: data.default_pack_size,
            is_active: true,
            is_vaccine: data.is_vaccine,
            strength: data.strength,
            ven_category: to_ven_category(data.VEN_category),
            vaccine_doses: data.doses,
            restricted_location_type_id,
            volume_per_pack: data.volume_per_pack,
            universal_code: data.universal_code,
            custom_fields,
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
        _connection: &StorageConnection,
        changelog: &ChangelogRow,
        row: Row,
    ) -> Result<PushTranslateResult, anyhow::Error> {
        if !CentralServerConfig::is_central_server() {
            return Err(anyhow::anyhow!(
                "Item push is only supported from the central server"
            ));
        }

        let Row::Item(item) = row else {
            return Ok(PushTranslateResult::NotMatched);
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
            restricted_location_type_id,
            volume_per_pack,
            universal_code,
            // Push is one-way: legacy mSupply remains source of truth for the
            // `user_field_*` columns, so we never emit `custom_fields` back.
            custom_fields: _,
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
            category2_ID: None,
            category3_ID: None,
            restricted_location_type_ID: restricted_location_type_id,
            volume_per_pack,
            universal_code,
            // One-way push — see note above.
            user_field_1: None,
            user_field_2: None,
            user_field_3: None,
            user_field_4: None,
            user_field_5: None,
            user_field_6: None,
            user_field_7: None,
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
    fk_checker: &crate::sync::translations::FkChecker,
    data: &LegacyItemRow,
) -> Result<Vec<IntegrationOperation>, anyhow::Error> {
    let mut integration_operations = Vec::new();

    let existing_item_category_join = ItemCategoryRepository::new(connection)
        .query_one(ItemCategoryFilter::new().item_id(EqualFilter::equal_to(data.ID.to_owned())))?;

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

    // Upsert the new item category join only when the referenced category exists.
    // category_id is a NOT NULL FK, so a dangling category_ID is cleared + logged and the
    // join is skipped entirely (rather than raising a raw ForeignKeyViolation at integrate).
    let fk_check = fk_checker.with_table(connection, "item_category_join", &data.ID);
    if let Some(category_id) = fk_check(data.category_ID.clone(), "category_id", FkField::Category)?
    {
        let item_category_join_row = ItemCategoryJoinRow {
            id: format!("{}-{}", data.ID.clone(), &category_id),
            item_id: data.ID.clone(),
            category_id,
            deleted_datetime: None,
        };
        integration_operations.push(IntegrationOperation::upsert(item_category_join_row));
    }

    Ok(integration_operations)
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{
        mock::{MockData, MockDataInserts},
        system_log_row::{SystemLogRowRepository, SystemLogType},
        test_db::{setup_all, setup_all_with_data},
        CategoryRow, LocationTypeRow, SyncAction, SyncRecordData, UnitRow,
    };

    #[actix_rt::test]
    async fn test_item_translation() {
        use crate::sync::test::test_data::item as test_data;
        use crate::sync::test_util_set_is_central_server;
        let translator = ItemTranslation {};

        // The custom fields import (ITEM_4_WITH_CUSTOM_FIELDS fixture) only derives
        // on central, mirroring where the OG→OMS import runs (COMS). Other item
        // fixtures carry no user fields, so this doesn't affect them.
        test_util_set_is_central_server(true);

        // FK validation requires the units and location types referenced by test data to exist
        let (_, connection, _, _) = setup_all_with_data(
            "test_item_translation",
            MockDataInserts::none(),
            MockData {
                units: vec![
                    UnitRow {
                        id: "A02C91EB6C77400BA783C4CD7C565F29".to_string(),
                        ..Default::default()
                    },
                    UnitRow {
                        id: "97674EFD5DFD4D8CABCAF58AAB4ED054".to_string(),
                        ..Default::default()
                    },
                ],
                location_types: vec![LocationTypeRow {
                    id: "84AA2B7A18694A2AB1E84DCABAD19617".to_string(),
                    ..Default::default()
                }],
                // Category referenced by the test item — required by the new category_id FK check.
                categories: vec![CategoryRow {
                    id: "FA6FC67251CC4560AC7FED0C0B23E5A0".to_string(),
                    name: "test".to_string(),
                    description: None,
                    parent_id: None,
                    deleted_datetime: None,
                }],
                ..Default::default()
            },
        )
        .await;

        for record in test_data::test_pull_upsert_records() {
            assert!(translator.should_translate_from_sync_record(&record.sync_buffer_row));
            let translation_result = translator
                .try_translate_from_upsert_sync_record(
                    &connection,
                    &crate::sync::translations::FkChecker::new(),
                    &record.sync_buffer_row,
                )
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

    #[actix_rt::test]
    async fn test_item_clears_invalid_optional_fks_and_writes_system_log() {
        let translator = ItemTranslation {};
        let (_, connection, _, _) = setup_all(
            "test_item_clears_invalid_optional_fks_and_writes_system_log",
            MockDataInserts::none(),
        )
        .await;

        let sync_record = SyncBufferRow {
            table_name: "item".to_string(),
            record_id: "ITEM_FK_INVALID".to_string(),
            data: SyncRecordData(
                serde_json::from_str(
                    r#"{
                "ID": "ITEM_FK_INVALID",
                "item_name": "Bad FK Item",
                "code": "code",
                "unit_ID": "does_not_exist_unit",
                "type_of": "general",
                "default_pack_size": 1.0,
                "is_vaccine": false,
                "VEN_category": "",
                "strength": "",
                "doses": 0,
                "category_ID": "",
                "restricted_location_type_ID": "does_not_exist_location_type",
                "volume_per_pack": 0,
                "universalcodes_code": ""
            }"#,
                )
                .unwrap(),
            ),
            action: SyncAction::Upsert,
            ..Default::default()
        };

        let result = translator
            .try_translate_from_upsert_sync_record(
                &connection,
                &crate::sync::translations::FkChecker::new(),
                &sync_record,
            )
            .unwrap();
        let debug = format!("{result:?}");
        assert!(
            debug.contains("unit_id: None"),
            "{}",
            format!("expected unit_id None; got:\n{debug}")
        );
        assert!(
            debug.contains("restricted_location_type_id: None"),
            "{}",
            format!("expected restricted_location_type_id None; got:\n{debug}")
        );

        let logs = SystemLogRowRepository::new(&connection).find_all().unwrap();
        let fk_errors: Vec<_> = logs
            .iter()
            .filter(|l| l.r#type == SystemLogType::SyncTranslationFkError && l.is_error)
            .collect();
        assert_eq!(fk_errors.len(), 2, "got {fk_errors:?}");
    }

    fn legacy_with(
        user_field_1: Option<&str>,
        user_field_4: Option<bool>,
        user_field_5: Option<f64>,
        user_field_7: Option<bool>,
    ) -> LegacyItemRow {
        LegacyItemRow {
            ID: "id".to_string(),
            item_name: "name".to_string(),
            code: "code".to_string(),
            unit_ID: None,
            type_of: LegacyItemType::general,
            default_pack_size: 1.0,
            is_vaccine: false,
            VEN_category: "".to_string(),
            strength: None,
            doses: 0,
            category_ID: None,
            category2_ID: None,
            category3_ID: None,
            restricted_location_type_ID: None,
            volume_per_pack: 0.0,
            universal_code: None,
            user_field_1: user_field_1.map(String::from),
            user_field_2: None,
            user_field_3: None,
            user_field_4,
            user_field_5,
            user_field_6: None,
            user_field_7,
        }
    }

    #[test]
    fn build_legacy_item_custom_fields_empty_and_defaults() {
        // Nothing set.
        assert_eq!(
            build_legacy_item_custom_fields(&legacy_with(None, None, None, None)),
            None
        );
        // 4D defaults (empty text, false, 0.0) are omitted — untouched item
        // stays NULL rather than carrying default rows.
        assert_eq!(
            build_legacy_item_custom_fields(&legacy_with(
                Some(""),
                Some(false),
                Some(0.0),
                Some(false)
            )),
            None
        );
    }

    #[test]
    fn build_legacy_item_custom_fields_typed_values() {
        let result = build_legacy_item_custom_fields(&legacy_with(
            Some("Cold chain"),
            Some(false), // omitted
            Some(12.5),
            Some(true),
        ));
        assert_eq!(
            result,
            Some(serde_json::json!({
                "user_field_1": "Cold chain",
                "user_field_5": 12.5,
                "user_field_7": true,
            }))
        );
    }

    #[test]
    fn build_legacy_item_custom_fields_category_option() {
        // The leaf `category_ID` is stored under the `item_category_1` key as the
        // option id (parallel to the relational item_category_join path).
        let mut legacy = legacy_with(None, None, None, None);
        legacy.category_ID = Some("CAT_LEAF_ID".to_string());
        assert_eq!(
            build_legacy_item_custom_fields(&legacy),
            Some(serde_json::json!({ "item_category_1": "CAT_LEAF_ID" }))
        );

        // Empty/absent category is omitted, like every other default field.
        legacy.category_ID = Some("".to_string());
        assert_eq!(build_legacy_item_custom_fields(&legacy), None);
        legacy.category_ID = None;
        assert_eq!(build_legacy_item_custom_fields(&legacy), None);

        // The two flat dimensions store their ids under `item_category_2`/`_3`.
        legacy.category2_ID = Some("CAT2_ID".to_string());
        legacy.category3_ID = Some("CAT3_ID".to_string());
        assert_eq!(
            build_legacy_item_custom_fields(&legacy),
            Some(serde_json::json!({ "item_category_2": "CAT2_ID", "item_category_3": "CAT3_ID" }))
        );
    }

    #[test]
    fn legacy_item_custom_fields_only_derived_on_central() {
        use crate::sync::test_util_set_is_central_server;
        let legacy = legacy_with(Some("Cold chain"), None, Some(12.5), Some(true));

        // A V5V6 remote must not derive item custom fields locally.
        test_util_set_is_central_server(false);
        assert_eq!(
            legacy_custom_fields_if_central(|| build_legacy_item_custom_fields(&legacy)),
            None
        );

        // The central server derives custom fields (and fans them out over v7).
        test_util_set_is_central_server(true);
        assert_eq!(
            legacy_custom_fields_if_central(|| build_legacy_item_custom_fields(&legacy)),
            Some(serde_json::json!({
                "user_field_1": "Cold chain",
                "user_field_5": 12.5,
                "user_field_7": true,
            }))
        );

        // Reset shared state for other tests (cargo test runs in-process).
        test_util_set_is_central_server(false);
    }
}
