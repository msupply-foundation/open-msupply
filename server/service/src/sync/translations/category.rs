use chrono::Utc;
use repository::{
    category_row::{CategoryRow, CategoryRowDelete},
    CustomFieldOptionRow, CustomFieldOptionRowRepository, StorageConnection, SyncBufferRow,
};
use serde::{Deserialize, Serialize};
use util::sync_serde::empty_str_as_option_string;

use crate::sync::central_mapping_custom_fields::keys;
use crate::sync::CentralServerConfig;

use super::{IntegrationOperation, PullTranslateResult, SyncTranslation};

/// Map an `item_category*` sync table to `(custom_field.id, is_relational)`.
///
/// The main hierarchy (`item_category` / `_level1` / `_level2`) feeds both the
/// relational `category` tree **and** the [`keys::ITEM_CATEGORY_1`] OPTION. The two
/// extra flat dimensions (`item_category2`/`3`, no level tables) are
/// customFields-only — they have no relational counterpart, so `is_relational`
/// is false and no `CategoryRow` is emitted.
fn item_category_mapping(table_name: &str) -> (&'static str, bool) {
    match table_name {
        "item_category2" => (keys::ITEM_CATEGORY_2, false),
        "item_category3" => (keys::ITEM_CATEGORY_3, false),
        // item_category / item_category_level1 / item_category_level2
        _ => (keys::ITEM_CATEGORY_1, true),
    }
}

#[allow(non_snake_case)]
#[derive(Deserialize, Serialize)]
pub struct LegacyItemCategoryRow {
    ID: String,
    Description: String,
    sort_order: i32,
    #[serde(default, deserialize_with = "empty_str_as_option_string")]
    parent_ID: Option<String>,
}

// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(CategoryTranslation)
}

pub(super) struct CategoryTranslation;
impl SyncTranslation for CategoryTranslation {
    fn table_names(&self) -> Vec<&str> {
        vec![
            "item_category",
            "item_category_level1",
            "item_category_level2",
            "item_category2",
            "item_category3",
        ]
    }

    fn pull_dependencies(&self) -> Vec<&str> {
        vec![]
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        _: &StorageConnection,
        _fk_checker: &crate::sync::translations::FkChecker,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let data = sync_record.deserialize::<LegacyItemCategoryRow>()?;
        let (custom_field_id, is_relational) = item_category_mapping(&sync_record.table_name);

        let mut operations = Vec::new();

        // Existing relational path — only the main category hierarchy feeds it
        // (left untouched, runs on every site). The flat dimensions 2 & 3 have no
        // relational counterpart, so they emit no `CategoryRow`.
        if is_relational {
            operations.push(IntegrationOperation::upsert(CategoryRow {
                id: data.ID.clone(),
                name: data.Description.clone(),
                description: Some(data.Description.clone()),
                parent_id: data.parent_ID.clone(),
                deleted_datetime: None,
            }));
        }

        // Parallel customFields path — central-only. Each category record becomes
        // a `custom_field_option` row under its mapped custom_field, with the 4D
        // `parent_ID` hierarchy preserved via `parent_option_id` (None for the
        // flat dimensions). The option `id` equals the category id so the item's
        // stored value resolves. Remotes receive these over v7; they must not
        // author them locally.
        if CentralServerConfig::is_central_server() {
            operations.push(IntegrationOperation::upsert(CustomFieldOptionRow {
                id: data.ID.clone(),
                custom_field_id: custom_field_id.to_string(),
                key: data.ID,
                name: data.Description,
                parent_option_id: data.parent_ID,
                deleted_datetime: None,
                // OG `sort_order` (an integer) as a fixed-width zero-padded string
                // so lexical order matches the numeric order and stays comparable
                // with the field-rank scheme (see custom_field_option_row.rs).
                sort_order: format!("{:06}", data.sort_order),
            }));
        }

        Ok(PullTranslateResult::IntegrationOperations(operations))
    }

    fn try_translate_from_delete_sync_record(
        &self,
        connection: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let record_id = sync_record.record_id.clone();
        let (_custom_field_id, is_relational) = item_category_mapping(&sync_record.table_name);

        let mut operations = Vec::new();

        // Existing relational path — only the main category hierarchy (flat
        // dimensions 2 & 3 have no relational row to delete). Left untouched.
        if is_relational {
            operations.push(IntegrationOperation::delete(CategoryRowDelete(
                record_id.clone(),
            )));
        }

        // Parallel customFields path — central-only. Soft-delete the matching
        // option (by re-upserting it with `deleted_datetime` set) so the option
        // set tracks 4D category removals and the read dataloader filters it out.
        if CentralServerConfig::is_central_server() {
            if let Some(option) =
                CustomFieldOptionRowRepository::new(connection).find_one_by_id(&record_id)?
            {
                operations.push(IntegrationOperation::upsert(CustomFieldOptionRow {
                    deleted_datetime: Some(Utc::now().naive_utc()),
                    ..option
                }));
            }
        }

        Ok(PullTranslateResult::IntegrationOperations(operations))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{mock::MockDataInserts, test_db::setup_all, SyncAction, SyncRecordData};

    #[actix_rt::test]
    async fn test_item_category_translation() {
        use crate::sync::test::test_data::item_category as test_data;
        use crate::sync::test_util_set_is_central_server;
        let translator = CategoryTranslation {};

        // Non-central path: only the existing relational CategoryRow is emitted,
        // matching the test_data fixtures (the customFields option is central-only).
        test_util_set_is_central_server(false);

        let (_, connection, _, _) =
            setup_all("test_item_category_translation", MockDataInserts::none()).await;

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
    async fn test_item_category_emits_custom_field_option_on_central() {
        use crate::sync::test_util_set_is_central_server;
        let translator = CategoryTranslation {};

        let (_, connection, _, _) = setup_all(
            "test_item_category_emits_custom_field_option_on_central",
            MockDataInserts::none(),
        )
        .await;

        let sync_record = SyncBufferRow {
            table_name: "item_category".to_string(),
            record_id: "CAT_LEAF".to_string(),
            data: SyncRecordData(serde_json::json!({
                "ID": "CAT_LEAF",
                "Description": "Antibacterials",
                "parent_ID": "CAT_PARENT",
                "sort_order": 1,
            })),
            action: SyncAction::Upsert,
            ..Default::default()
        };

        // On central, the relational category row AND the customFields option are
        // emitted (parent_ID -> parent_option_id; option id == category id).
        test_util_set_is_central_server(true);
        let result = translator
            .try_translate_from_upsert_sync_record(
                &connection,
                &crate::sync::translations::FkChecker::new(),
                &sync_record,
            )
            .unwrap();
        let debug = format!("{result:?}");
        assert!(debug.contains("CategoryRow"), "{}", debug);
        assert!(debug.contains("CustomFieldOptionRow"), "{}", debug);
        // Hardcoded, not `keys::ITEM_CATEGORY_1`: this key is a frozen contract
        // once released, so the test must fail if the const is ever changed.
        assert!(
            debug.contains("item_category_1"),
            "option must reference the mapping custom_field: {}",
            debug
        );
        assert!(
            debug.contains("CAT_PARENT"),
            "hierarchy must map parent_ID -> parent_option_id: {}",
            debug
        );

        // On a remote, only the relational category row is emitted.
        test_util_set_is_central_server(false);
        let result = translator
            .try_translate_from_upsert_sync_record(
                &connection,
                &crate::sync::translations::FkChecker::new(),
                &sync_record,
            )
            .unwrap();
        let debug = format!("{result:?}");
        assert!(debug.contains("CategoryRow"), "{}", debug);
        assert!(
            !debug.contains("CustomFieldOptionRow"),
            "remote must not author options: {}",
            debug
        );
    }

    #[actix_rt::test]
    async fn test_item_category_2_and_3_emit_option_but_no_category_row() {
        use crate::sync::test_util_set_is_central_server;
        let translator = CategoryTranslation {};

        let (_, connection, _, _) = setup_all(
            "test_item_category_2_and_3_emit_option_but_no_category_row",
            MockDataInserts::none(),
        )
        .await;

        // Flat dimensions (no level tables, no parent): central emits the option
        // under the matching custom_field but NO relational CategoryRow.
        // (sync table name -> custom_field key). Keys hardcoded, not `keys::*`: they
        // are a frozen contract, so a const rename must fail the test.
        for (table_name, custom_field_id) in [
            ("item_category2", "item_category_2"),
            ("item_category3", "item_category_3"),
        ] {
            let sync_record = SyncBufferRow {
                table_name: table_name.to_string(),
                record_id: "CAT_FLAT".to_string(),
                data: SyncRecordData(serde_json::json!({
                    "ID": "CAT_FLAT",
                    "Description": "Flat dimension",
                    "sort_order": 1,
                })),
                action: SyncAction::Upsert,
                ..Default::default()
            };

            test_util_set_is_central_server(true);
            let result = translator
                .try_translate_from_upsert_sync_record(
                    &connection,
                    &crate::sync::translations::FkChecker::new(),
                    &sync_record,
                )
                .unwrap();
            let debug = format!("{result:?}");
            assert!(debug.contains("CustomFieldOptionRow"), "{}", debug);
            assert!(debug.contains(custom_field_id), "{}", debug);
            assert!(
                !debug.contains("CategoryRow"),
                "flat dimensions have no relational category row: {}",
                debug
            );

            // On a remote, nothing is authored at all for the flat dimensions.
            test_util_set_is_central_server(false);
            let result = translator
                .try_translate_from_upsert_sync_record(
                    &connection,
                    &crate::sync::translations::FkChecker::new(),
                    &sync_record,
                )
                .unwrap();
            let debug = format!("{result:?}");
            assert!(
                !debug.contains("CustomFieldOptionRow") && !debug.contains("CategoryRow"),
                "remote authors nothing for flat dimensions: {}",
                debug
            );
        }
    }
}
