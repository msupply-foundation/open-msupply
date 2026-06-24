use repository::{
    PropertyKindV2, PropertyTableV2Row, PropertyTableV2RowRepository, PropertyV2Row,
    PropertyV2RowRepository, PropertyValueTypeV2, RepositoryError, StorageConnection,
};

/// Stable string identifiers for the code-defined legacy mapping properties.
///
/// Each constant is the property's **key** — and the key is the *only* identifier
/// these properties have, with `kind = Legacy` marking provenance instead of a
/// `legacy_`-prefixed id. So a single constant plays three roles, all enforced by
/// the compiler:
///
/// 1. seeded here as the `property_v2` row's `id` *and* `key`;
/// 2. written as the JSONB key into `<table>.properties_v2` by the value
///    translators ([`name`](super::translations::name) /
///    [`item`](super::translations::item));
/// 3. used as the `property_option_v2.property_id` by the category translators
///    ([`category`](super::translations::category) /
///    [`name_category`](super::translations::name_category)).
///
/// `property_v2.key` is globally unique. Because the key is also the id, that
/// uniqueness is automatic; the name vs item category dimensions are kept distinct
/// purely by their `name_`/`item_` prefixes (they share no bare `categoryN` key).
pub(crate) mod keys {
    // name `[name]custom1/2/3` — 4D column names are mapped onto snake_case slugs
    // by the v5 name translator (decoupled from the 4D names).
    pub(crate) const NAME_CUSTOM_1: &str = "custom_1";
    pub(crate) const NAME_CUSTOM_2: &str = "custom_2";
    pub(crate) const NAME_CUSTOM_3: &str = "custom_3";

    // item `[item]user_field_1..7` — 4D names are already snake_case, so the key
    // matches the wire field name 1:1.
    pub(crate) const ITEM_USER_FIELD_1: &str = "user_field_1";
    pub(crate) const ITEM_USER_FIELD_2: &str = "user_field_2";
    pub(crate) const ITEM_USER_FIELD_3: &str = "user_field_3";
    pub(crate) const ITEM_USER_FIELD_4: &str = "user_field_4";
    pub(crate) const ITEM_USER_FIELD_5: &str = "user_field_5";
    pub(crate) const ITEM_USER_FIELD_6: &str = "user_field_6";
    pub(crate) const ITEM_USER_FIELD_7: &str = "user_field_7";

    // item categories — main hierarchy plus two flat dimensions.
    pub(crate) const ITEM_CATEGORY_1: &str = "item_category_1";
    pub(crate) const ITEM_CATEGORY_2: &str = "item_category_2";
    pub(crate) const ITEM_CATEGORY_3: &str = "item_category_3";

    // name categories 1–6 (category1 hierarchical, 2–6 flat).
    pub(crate) const NAME_CATEGORY_1: &str = "name_category_1";
    pub(crate) const NAME_CATEGORY_2: &str = "name_category_2";
    pub(crate) const NAME_CATEGORY_3: &str = "name_category_3";
    pub(crate) const NAME_CATEGORY_4: &str = "name_category_4";
    pub(crate) const NAME_CATEGORY_5: &str = "name_category_5";
    pub(crate) const NAME_CATEGORY_6: &str = "name_category_6";
}

/// A code-defined mSupply "mapping property" — a property in the new system that
/// maps to a legacy mSupply field. These are authored in code (not config) because
/// the hardcoded v5 import translators depend on their `key` and `value_type`;
/// changing those beyond visibility breaks the import.
struct MappingProperty {
    /// The property's sole identifier: the JSONB key written into
    /// `<table>.properties_v2` by the v5 import, and also seeded as the
    /// `property_v2.id` (the key *is* the id — see [`keys`]). Never change once
    /// released. Always one of the [`keys`] constants.
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
    use keys::*;
    use PropertyValueTypeV2::*;
    vec![
        // name `[name]custom1/2/3` — 4D column names are mapped onto snake_case
        // slugs by the v5 name translator.
        MappingProperty {
            key: NAME_CUSTOM_1,
            name: "Custom 1",
            value_type: Text,
            table_names: &["name"],
        },
        MappingProperty {
            key: NAME_CUSTOM_2,
            name: "Custom 2",
            value_type: Text,
            table_names: &["name"],
        },
        MappingProperty {
            key: NAME_CUSTOM_3,
            name: "Custom 3",
            value_type: Text,
            table_names: &["name"],
        },
        // item `[item]user_field_1..7` — 4D names are already snake_case, so the
        // key matches the wire field 1:1. Value types come from the 4D catalog.
        MappingProperty {
            key: ITEM_USER_FIELD_1,
            name: "User field 1",
            value_type: Text,
            table_names: &["item"],
        },
        MappingProperty {
            key: ITEM_USER_FIELD_2,
            name: "User field 2",
            value_type: Text,
            table_names: &["item"],
        },
        MappingProperty {
            key: ITEM_USER_FIELD_3,
            name: "User field 3",
            value_type: Text,
            table_names: &["item"],
        },
        MappingProperty {
            key: ITEM_USER_FIELD_4,
            name: "User field 4",
            value_type: Boolean,
            table_names: &["item"],
        },
        MappingProperty {
            key: ITEM_USER_FIELD_5,
            name: "User field 5",
            value_type: Real,
            table_names: &["item"],
        },
        MappingProperty {
            key: ITEM_USER_FIELD_6,
            name: "User field 6",
            value_type: Text,
            table_names: &["item"],
        },
        MappingProperty {
            key: ITEM_USER_FIELD_7,
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
            key: ITEM_CATEGORY_1,
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
            key: ITEM_CATEGORY_2,
            name: "Category 2",
            value_type: Option,
            table_names: &["item"],
        },
        MappingProperty {
            key: ITEM_CATEGORY_3,
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
            key: NAME_CATEGORY_1,
            name: "Category 1",
            value_type: Option,
            table_names: &["name"],
        },
        MappingProperty {
            key: NAME_CATEGORY_2,
            name: "Category 2",
            value_type: Option,
            table_names: &["name"],
        },
        MappingProperty {
            key: NAME_CATEGORY_3,
            name: "Category 3",
            value_type: Option,
            table_names: &["name"],
        },
        MappingProperty {
            key: NAME_CATEGORY_4,
            name: "Category 4",
            value_type: Option,
            table_names: &["name"],
        },
        MappingProperty {
            key: NAME_CATEGORY_5,
            name: "Category 5",
            value_type: Option,
            table_names: &["name"],
        },
        MappingProperty {
            key: NAME_CATEGORY_6,
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
            id: def.key.to_string(),
            key: def.key.to_string(),
            name: def.name.to_string(),
            value_type: def.value_type.clone(),
            kind: PropertyKindV2::Legacy,
            deleted_datetime: None,
        };
        // Code is the source of truth for the definition (key/name/value_type).
        if property_repo.find_one_by_id(def.key)?.as_ref() != Some(&property) {
            property_repo.upsert_one(&property)?;
        }

        // Only create each table mapping if it doesn't exist — never overwrite,
        // so an admin's future visibility change isn't reset on the next sync.
        for table_name in def.table_names {
            let table_id = format!("{}__{}", def.key, table_name);
            if table_repo.find_one_by_id(&table_id)?.is_none() {
                table_repo.upsert_one(&PropertyTableV2Row {
                    id: table_id,
                    property_id: def.key.to_string(),
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

        // Look up by hardcoded key, not the `keys` consts: these keys are a frozen
        // wire/storage contract once released, so the test must fail if a const is
        // ever changed (testing the const against itself would mask that).
        let name_1 = property_repo
            .find_one_by_id("custom_1")
            .unwrap()
            .expect("missing custom_1");
        assert_eq!(name_1.id, name_1.key, "key is the id for legacy properties");
        assert_eq!(name_1.key, "custom_1");
        assert_eq!(name_1.kind, PropertyKindV2::Legacy);
        assert_eq!(name_1.value_type, PropertyValueTypeV2::Text);

        let item_5 = property_repo
            .find_one_by_id("user_field_5")
            .unwrap()
            .expect("missing user_field_5");
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
                id: "custom_1__name".to_string(),
                property_id: "custom_1".to_string(),
                table_name: "name".to_string(),
                is_visible: false,
            })
            .unwrap();
        seed_central_mapping_properties(&connection).unwrap();
        let table_row = table_repo
            .find_one_by_id("custom_1__name")
            .unwrap()
            .unwrap();
        assert!(!table_row.is_visible, "seeder must not reset is_visible");
    }
}
