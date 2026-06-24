use chrono::Utc;
use repository::{
    PropertyOptionV2Row, PropertyOptionV2RowRepository, StorageConnection, SyncBufferRow,
};
use serde::{Deserialize, Serialize};
use util::sync_serde::empty_str_as_option_string;

use crate::sync::central_mapping_properties::keys;
use crate::sync::CentralServerConfig;

use super::{PullTranslateResult, SyncTranslation};

/// mSupply name categories modelled as propertiesV2 OPTIONs — a **central-only**
/// path with no relational counterpart (unlike item categories, names have no
/// relational `category` table in OMS). Each `name_category*` record becomes a
/// `property_option_v2` row under the matching `name_category*` property
/// (seeded by `central_mapping_properties`); the name stores the chosen leaf id
/// under its `name_categoryN` key (see `translations/name.rs`).
///
/// 4D has six independent dimensions. `category1` is hierarchical
/// (`name_category1_level1` → `name_category1_level2` → `name_category1`,
/// `parent_ID → parent_option_id`); `category2..6` are flat single tables. The
/// option `id` equals the category record id so the stored value resolves.
///
/// Mirrors `translations/category.rs` (item categories); remotes receive these
/// over v7 and must not author them locally.

/// Map a `name_category*` sync table name to the `property_v2.id` its options
/// belong to. The three category1 levels share [`keys::NAME_CATEGORY_1`]; the
/// flat dimensions map 1:1. The property ids are the shared [`keys`] constants
/// (the key *is* the id).
fn property_id_for_table(table_name: &str) -> Option<&'static str> {
    match table_name {
        "name_category1" | "name_category1_level1" | "name_category1_level2" => {
            Some(keys::NAME_CATEGORY_1)
        }
        "name_category2" => Some(keys::NAME_CATEGORY_2),
        "name_category3" => Some(keys::NAME_CATEGORY_3),
        "name_category4" => Some(keys::NAME_CATEGORY_4),
        "name_category5" => Some(keys::NAME_CATEGORY_5),
        "name_category6" => Some(keys::NAME_CATEGORY_6),
        _ => None,
    }
}

#[allow(non_snake_case)]
#[derive(Deserialize, Serialize)]
pub struct LegacyNameCategoryRow {
    ID: String,
    // 4D uses lowercase `description` on the name_category* tables (cf. item's
    // capitalised `Description`).
    description: String,
    // Present only on the hierarchical category1 tables (`name_category1`,
    // `name_category1_level2`); absent/empty on level1 and the flat dimensions.
    #[serde(default, deserialize_with = "empty_str_as_option_string")]
    parent_ID: Option<String>,
}

// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(NameCategoryTranslation)
}

pub(super) struct NameCategoryTranslation;
impl SyncTranslation for NameCategoryTranslation {
    fn table_names(&self) -> Vec<&str> {
        vec![
            "name_category1",
            "name_category1_level1",
            "name_category1_level2",
            "name_category2",
            "name_category3",
            "name_category4",
            "name_category5",
            "name_category6",
        ]
    }

    fn pull_dependencies(&self) -> Vec<&str> {
        vec![]
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        // Central-only: remotes receive the options over v7 and must not author
        // them locally.
        if !CentralServerConfig::is_central_server() {
            return Ok(PullTranslateResult::Ignored(
                "Name category options are central-authored".to_string(),
            ));
        }

        let Some(property_id) = property_id_for_table(&sync_record.table_name) else {
            return Ok(PullTranslateResult::NotMatched);
        };

        let data = sync_record.deserialize::<LegacyNameCategoryRow>()?;

        Ok(PullTranslateResult::upsert(PropertyOptionV2Row {
            id: data.ID.clone(),
            property_id: property_id.to_string(),
            key: data.ID,
            name: data.description,
            parent_option_id: data.parent_ID,
            deleted_datetime: None,
        }))
    }

    fn try_translate_from_delete_sync_record(
        &self,
        connection: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        // Central-only, mirroring the upsert path.
        if !CentralServerConfig::is_central_server() {
            return Ok(PullTranslateResult::Ignored(
                "Name category options are central-authored".to_string(),
            ));
        }

        // Soft-delete the matching option (by re-upserting it with
        // `deleted_datetime` set) so the option set tracks 4D category removals
        // and the read dataloader filters it out.
        let record_id = sync_record.record_id.clone();
        let Some(option) =
            PropertyOptionV2RowRepository::new(connection).find_one_by_id(&record_id)?
        else {
            return Ok(PullTranslateResult::Ignored(
                "No matching name category option to soft-delete".to_string(),
            ));
        };

        Ok(PullTranslateResult::upsert(PropertyOptionV2Row {
            deleted_datetime: Some(Utc::now().naive_utc()),
            ..option
        }))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::sync::test_util_set_is_central_server;
    use repository::{mock::MockDataInserts, test_db::setup_all, SyncAction, SyncRecordData};

    #[actix_rt::test]
    async fn name_category_emits_property_option_on_central() {
        let translator = NameCategoryTranslation {};

        let (_, connection, _, _) = setup_all(
            "name_category_emits_property_option_on_central",
            MockDataInserts::none(),
        )
        .await;

        // A hierarchical category1 leaf carries its parent.
        let cat1 = SyncBufferRow {
            table_name: "name_category1".to_string(),
            record_id: "N_CAT1".to_string(),
            data: SyncRecordData(serde_json::json!({
                "ID": "N_CAT1",
                "description": "VIP",
                "parent_ID": "N_CAT1_L2",
            })),
            action: SyncAction::Upsert,
            ..Default::default()
        };
        // A flat dimension has no parent.
        let cat4 = SyncBufferRow {
            table_name: "name_category4".to_string(),
            record_id: "N_CAT4".to_string(),
            data: SyncRecordData(serde_json::json!({
                "ID": "N_CAT4",
                "description": "Region A",
            })),
            action: SyncAction::Upsert,
            ..Default::default()
        };

        // On central, both author a PropertyOptionV2Row under the right property,
        // mapping parent_ID -> parent_option_id (None for the flat dimension).
        test_util_set_is_central_server(true);

        let result = translator
            .try_translate_from_upsert_sync_record(&connection, &cat1)
            .unwrap();
        let debug = format!("{result:?}");
        assert!(debug.contains("PropertyOptionV2Row"), "{debug}");
        // Hardcoded, not `keys::*`: these keys are a frozen contract once released,
        // so a const rename must fail the test rather than silently pass.
        assert!(debug.contains("name_category_1"), "{debug}");
        assert!(
            debug.contains("N_CAT1_L2"),
            "category1 hierarchy must map parent_ID -> parent_option_id: {debug}"
        );

        let result = translator
            .try_translate_from_upsert_sync_record(&connection, &cat4)
            .unwrap();
        let debug = format!("{result:?}");
        assert!(debug.contains("name_category_4"), "{debug}");

        // On a remote, nothing is authored (options arrive via v7).
        test_util_set_is_central_server(false);
        let result = translator
            .try_translate_from_upsert_sync_record(&connection, &cat1)
            .unwrap();
        assert!(
            matches!(result, PullTranslateResult::Ignored(_)),
            "remote must not author name category options: {result:?}"
        );
    }
}
