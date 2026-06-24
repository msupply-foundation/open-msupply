use repository::{
    PropertyKindV2, PropertyTableV2Row, PropertyTableV2RowRepository, PropertyV2Row,
    PropertyV2RowRepository, PropertyValueTypeV2, RepositoryError, StorageConnection,
};

/// A code-defined mSupply "mapping property" — a property in the new system
/// that maps to a legacy mSupply field. These are authored in code (not config)
/// because the hardcoded v5 import translators depend on their `key` and
/// `value_type`; changing those beyond visibility breaks the import.
struct MappingProperty {
    /// Stable `property_v2.id`. Never change once released.
    id: &'static str,
    /// JSONB key written into `<table>.properties_v2` by the v5 import.
    key: &'static str,
    /// Display name (overridable later only via a visibility/label UI).
    name: &'static str,
    value_type: PropertyValueTypeV2,
    /// Record tables the property applies to (one `property_table_v2` row per
    /// entry). A definition can be visible on more than one table.
    table_names: &'static [&'static str],
}

/// The full set of legacy mSupply mapping properties. Add new ones here; the
/// central server seeds them on its next sync and they fan out to v7 remotes
/// from there.
fn mapping_properties() -> Vec<MappingProperty> {
    use PropertyValueTypeV2::*;
    vec![
        // name `[name]custom1/2/3` — 4D column names are mapped onto snake_case
        // slugs by the v5 name translator.
        MappingProperty {
            id: "legacy_name_custom_1",
            key: "custom_1",
            name: "Custom 1",
            value_type: Text,
            table_names: &["name"],
        },
        MappingProperty {
            id: "legacy_name_custom_2",
            key: "custom_2",
            name: "Custom 2",
            value_type: Text,
            table_names: &["name"],
        },
        MappingProperty {
            id: "legacy_name_custom_3",
            key: "custom_3",
            name: "Custom 3",
            value_type: Text,
            table_names: &["name"],
        },
        // item `[item]user_field_1..7` — 4D names are already snake_case, so the
        // OMS key matches the wire key 1:1. Value types come from the 4D catalog.
        MappingProperty {
            id: "legacy_item_user_field_1",
            key: "user_field_1",
            name: "User field 1",
            value_type: Text,
            table_names: &["item"],
        },
        MappingProperty {
            id: "legacy_item_user_field_2",
            key: "user_field_2",
            name: "User field 2",
            value_type: Text,
            table_names: &["item"],
        },
        MappingProperty {
            id: "legacy_item_user_field_3",
            key: "user_field_3",
            name: "User field 3",
            value_type: Text,
            table_names: &["item"],
        },
        MappingProperty {
            id: "legacy_item_user_field_4",
            key: "user_field_4",
            name: "User field 4",
            value_type: Boolean,
            table_names: &["item"],
        },
        MappingProperty {
            id: "legacy_item_user_field_5",
            key: "user_field_5",
            name: "User field 5",
            value_type: Real,
            table_names: &["item"],
        },
        MappingProperty {
            id: "legacy_item_user_field_6",
            key: "user_field_6",
            name: "User field 6",
            value_type: Text,
            table_names: &["item"],
        },
        MappingProperty {
            id: "legacy_item_user_field_7",
            key: "user_field_7",
            name: "User field 7",
            value_type: Boolean,
            table_names: &["item"],
        },
        // item categories — a single OPTION property whose options are the
        // mSupply `item_category*` levels. Unlike the fields above, its *options*
        // are not seeded here: they are authored dynamically by the v5 category
        // import (`translations/category.rs`, central-only) as `property_option_v2`
        // rows. The item stores the leaf `category_ID` under this key. See the
        // properties dev doc — this is the deliberate "hard" mapping test.
        MappingProperty {
            id: "legacy_item_category",
            key: "item_category",
            name: "Category",
            value_type: Option,
            table_names: &["item"],
        },
        // item categories 2 & 3 — two additional *flat* OPTION dimensions
        // (`[item]category2_ID`/`category3_ID` → `item_category2`/`item_category3`,
        // which have no level tables). Options are authored by the category import
        // (`translations/category.rs`, central-only); the item stores the chosen id
        // under these keys. Keys are prefixed `item_category*` (globally-unique
        // `property_v2.key`, distinct from name's `name_category*`).
        MappingProperty {
            id: "legacy_item_category_2",
            key: "item_category2",
            name: "Category 2",
            value_type: Option,
            table_names: &["item"],
        },
        MappingProperty {
            id: "legacy_item_category_3",
            key: "item_category3",
            name: "Category 3",
            value_type: Option,
            table_names: &["item"],
        },
        // name categories 1–6 — six independent OPTION dimensions
        // (`[name]category1_ID..category6_ID`). category1 is hierarchical (its
        // `name_category1*` level tables map via `parent_option_id`); 2–6 are flat.
        // Options are authored by `translations/name_category.rs` (central-only);
        // the name stores the chosen leaf id under each key.
        //
        // NOTE: `property_v2.key` is globally unique, so the name dimensions can't
        // reuse item's `category2`/`category3` keys — they are prefixed
        // `name_category*` (this is the JSONB key on the name record too).
        MappingProperty {
            id: "legacy_name_category_1",
            key: "name_category1",
            name: "Category 1",
            value_type: Option,
            table_names: &["name"],
        },
        MappingProperty {
            id: "legacy_name_category_2",
            key: "name_category2",
            name: "Category 2",
            value_type: Option,
            table_names: &["name"],
        },
        MappingProperty {
            id: "legacy_name_category_3",
            key: "name_category3",
            name: "Category 3",
            value_type: Option,
            table_names: &["name"],
        },
        MappingProperty {
            id: "legacy_name_category_4",
            key: "name_category4",
            name: "Category 4",
            value_type: Option,
            table_names: &["name"],
        },
        MappingProperty {
            id: "legacy_name_category_5",
            key: "name_category5",
            name: "Category 5",
            value_type: Option,
            table_names: &["name"],
        },
        MappingProperty {
            id: "legacy_name_category_6",
            key: "name_category6",
            name: "Category 6",
            value_type: Option,
            table_names: &["name"],
        },
    ]
}

/// Seed the code-defined mapping property definitions. **Central-server only** —
/// callers must gate on `CentralServerConfig::is_central_server()` and exclude
/// standalone central (`!is_standalone_central()`): standalone has no legacy
/// mSupply upstream, so the v5 import never runs and these definitions could only
/// ever be empty. Remotes receive these over v7; they must never seed their own
/// (see the properties dev doc for why version-safety lives entirely in the v7
/// path).
///
/// Idempotent and change-aware: a row is only upserted when missing or when its
/// code-authoritative content differs, so steady-state runs add no changelog
/// churn. The `property_table_v2` mapping is only created when **absent**, so a
/// later visibility edit (`is_visible`) is preserved rather than reset here.
pub(crate) fn seed_central_mapping_properties(
    connection: &StorageConnection,
) -> Result<(), RepositoryError> {
    let property_repo = PropertyV2RowRepository::new(connection);
    let table_repo = PropertyTableV2RowRepository::new(connection);

    for def in mapping_properties() {
        let property = PropertyV2Row {
            id: def.id.to_string(),
            key: def.key.to_string(),
            name: def.name.to_string(),
            value_type: def.value_type.clone(),
            kind: PropertyKindV2::Legacy,
            deleted_datetime: None,
        };
        // Code is the source of truth for the definition (key/name/value_type).
        if property_repo.find_one_by_id(def.id)?.as_ref() != Some(&property) {
            property_repo.upsert_one(&property)?;
        }

        // Only create each table mapping if it doesn't exist — never overwrite,
        // so an admin's future visibility change isn't reset on the next sync.
        for table_name in def.table_names {
            let table_id = format!("{}__{}", def.id, table_name);
            if table_repo.find_one_by_id(&table_id)?.is_none() {
                table_repo.upsert_one(&PropertyTableV2Row {
                    id: table_id,
                    property_id: def.id.to_string(),
                    table_name: table_name.to_string(),
                    is_visible: true,
                })?;
            }
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{mock::MockDataInserts, test_db::setup_all, ChangelogRepository};

    #[actix_rt::test]
    async fn seeds_mapping_properties_idempotently() {
        let (_, connection, _, _) =
            setup_all("seed_central_mapping_properties", MockDataInserts::none()).await;

        let property_repo = PropertyV2RowRepository::new(&connection);
        let table_repo = PropertyTableV2RowRepository::new(&connection);
        let changelog_repo = ChangelogRepository::new(&connection);

        // First run creates all definitions + table mappings.
        seed_central_mapping_properties(&connection).unwrap();

        let name_1 = property_repo
            .find_one_by_id("legacy_name_custom_1")
            .unwrap()
            .expect("missing legacy_name_custom_1");
        assert_eq!(name_1.key, "custom_1");
        assert_eq!(name_1.kind, PropertyKindV2::Legacy);
        assert_eq!(name_1.value_type, PropertyValueTypeV2::Text);

        let item_5 = property_repo
            .find_one_by_id("legacy_item_user_field_5")
            .unwrap()
            .expect("missing legacy_item_user_field_5");
        assert_eq!(item_5.value_type, PropertyValueTypeV2::Real);

        // 19 properties: 3 name customs + 6 name categories + 7 item user fields
        // + 3 item categories (main + 2 & 3).
        assert_eq!(property_repo.find_all().unwrap().len(), 19);
        // 19 table mappings: the 3 name customs + 6 name categories map to
        // "name", the 7 item fields + 3 item categories to "item" (1 each).
        assert_eq!(table_repo.find_all().unwrap().len(), 19);

        // A second run is a no-op: change-aware seeding must not write (and so
        // must not add changelog rows) when nothing has changed.
        let cursor_before = changelog_repo.max_cursor().unwrap();
        seed_central_mapping_properties(&connection).unwrap();
        assert_eq!(changelog_repo.max_cursor().unwrap(), cursor_before);

        // A visibility edit on a table mapping must be preserved across re-seeds.
        table_repo
            .upsert_one(&PropertyTableV2Row {
                id: "legacy_name_custom_1__name".to_string(),
                property_id: "legacy_name_custom_1".to_string(),
                table_name: "name".to_string(),
                is_visible: false,
            })
            .unwrap();
        seed_central_mapping_properties(&connection).unwrap();
        let table_row = table_repo
            .find_one_by_id("legacy_name_custom_1__name")
            .unwrap()
            .unwrap();
        assert!(!table_row.is_visible, "seeder must not reset is_visible");
    }
}
