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

    // transaction categories — one OPTION property per OG transact type, keyed
    // by the invoice type it surfaces as. `PRESCRIPTION_CATEGORY_2` is the second
    // prescription dimension (OG "pi2" Patient Type, `transact.category2_ID`).
    pub(crate) const INBOUND_SHIPMENT_CATEGORY: &str = "inbound_shipment_category";
    pub(crate) const OUTBOUND_SHIPMENT_CATEGORY: &str = "outbound_shipment_category";
    pub(crate) const PRESCRIPTION_CATEGORY: &str = "prescription_category";
    pub(crate) const SUPPLIER_RETURN_CATEGORY: &str = "supplier_return_category";
    pub(crate) const CUSTOMER_RETURN_CATEGORY: &str = "customer_return_category";
    pub(crate) const PRESCRIPTION_CATEGORY_2: &str = "prescription_category2";
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
    /// Initial display name, used only when the row is first created. Once a
    /// row exists its name is owned by the label sync (mSupply's configurable
    /// field labels, see `translations/legacy_field_labels.rs`) — the seeder
    /// never overwrites it.
    name: &'static str,
    value_type: PropertyValueTypeV2,
    /// Record tables the property applies to (one `property_table_v2` row per
    /// entry). A definition can be visible on more than one table — names'
    /// `custom1/2/3` are shared by every name type, so they map to both `"name"`
    /// (customers/suppliers/facilities) and `"patient"`.
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
            table_names: &["name", "patient"],
        },
        MappingProperty {
            key: NAME_CUSTOM_2,
            name: "Custom 2",
            value_type: Text,
            table_names: &["name", "patient"],
        },
        MappingProperty {
            key: NAME_CUSTOM_3,
            name: "Custom 3",
            value_type: Text,
            table_names: &["name", "patient"],
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
        // the name stores the chosen leaf id under each key. Shared by every name
        // type, so visible on both "name" (customers/suppliers/facilities) and
        // "patient" — where they are editable (the first editable OPTION).
        //
        // NOTE: `property_v2.key` is globally unique, so the name dimensions can't
        // reuse item's `category2`/`category3` keys — they are prefixed
        // `name_category*` (this is the JSONB key on the name record too).
        MappingProperty {
            key: NAME_CATEGORY_1,
            name: "Category 1",
            value_type: Option,
            table_names: &["name", "patient"],
        },
        MappingProperty {
            key: NAME_CATEGORY_2,
            name: "Category 2",
            value_type: Option,
            table_names: &["name", "patient"],
        },
        MappingProperty {
            key: NAME_CATEGORY_3,
            name: "Category 3",
            value_type: Option,
            table_names: &["name", "patient"],
        },
        MappingProperty {
            key: NAME_CATEGORY_4,
            name: "Category 4",
            value_type: Option,
            table_names: &["name", "patient"],
        },
        MappingProperty {
            key: NAME_CATEGORY_5,
            name: "Category 5",
            value_type: Option,
            table_names: &["name", "patient"],
        },
        MappingProperty {
            key: NAME_CATEGORY_6,
            name: "Category 6",
            value_type: Option,
            table_names: &["name", "patient"],
        },
        // transaction categories — mSupply's `transaction_category` table holds
        // one flat pool of categories partitioned by a 3-char `type` matching the
        // transact type they apply to. Each OMS-supported type becomes its own
        // OPTION property (one option set per type), scoped to the UI record kind
        // the invoice type renders as. Options are authored by
        // `translations/transaction_category.rs` (central-only); the invoice
        // stores the chosen id under the type's key, mapped to/from legacy
        // `transact.category_ID` by the invoice translator. `master_category_ID`
        // grouping is ignored for now (flat). OG types with no OMS UI surface
        // (sr repack, bu build, in inventory adjustment, te tender) are not
        // mapped.
        MappingProperty {
            key: INBOUND_SHIPMENT_CATEGORY,
            name: "Category",
            value_type: Option,
            table_names: &["inbound_shipment"],
        },
        MappingProperty {
            key: OUTBOUND_SHIPMENT_CATEGORY,
            name: "Category",
            value_type: Option,
            table_names: &["outbound_shipment"],
        },
        MappingProperty {
            key: PRESCRIPTION_CATEGORY,
            name: "Category",
            value_type: Option,
            table_names: &["prescription"],
        },
        MappingProperty {
            key: SUPPLIER_RETURN_CATEGORY,
            name: "Category",
            value_type: Option,
            table_names: &["supplier_return"],
        },
        MappingProperty {
            key: CUSTOMER_RETURN_CATEGORY,
            name: "Category",
            value_type: Option,
            table_names: &["customer_return"],
        },
        // OG's second prescription dimension — the "Prescriptions (2)" category
        // pool ("pi2"), shown on the OG prescription form as the Patient Type
        // dropdown and stored in `transact.category2_ID` (dispensary mode only).
        MappingProperty {
            key: PRESCRIPTION_CATEGORY_2,
            name: "Patient type",
            value_type: Option,
            table_names: &["prescription"],
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
/// churn. An existing row's `name` is preserved (it's owned by the mSupply
/// field-label sync once created), and the `property_table_v2` mapping is only
/// created when **absent**, so a later visibility edit (`is_visible`) is
/// preserved rather than reset here.
pub(crate) fn seed_central_mapping_properties(
    connection: &StorageConnection,
) -> Result<(), RepositoryError> {
    let property_repo = PropertyV2RowRepository::new(connection);
    let table_repo = PropertyTableV2RowRepository::new(connection);

    for def in mapping_properties() {
        let existing = property_repo.find_one_by_id(def.key)?;
        let property = PropertyV2Row {
            id: def.key.to_string(),
            key: def.key.to_string(),
            // Code is the source of truth for key/value_type, but only the
            // *initial* name: once the row exists, the name is owned by the
            // mSupply field-label sync (`translations/legacy_field_labels.rs`)
            // and must survive re-seeds.
            name: existing
                .as_ref()
                .map_or_else(|| def.name.to_string(), |row| row.name.clone()),
            value_type: def.value_type.clone(),
            kind: PropertyKindV2::Legacy,
            deleted_datetime: None,
        };
        if existing.as_ref() != Some(&property) {
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

        let trans_si = property_repo
            .find_one_by_id("inbound_shipment_category")
            .unwrap()
            .expect("missing inbound_shipment_category");
        assert_eq!(trans_si.key, "inbound_shipment_category");
        assert_eq!(trans_si.value_type, PropertyValueTypeV2::Option);

        // 25 properties: 3 name customs + 6 name categories + 7 item user fields
        // + 3 item categories (main + 2 & 3) + 6 transaction categories (5 typed
        // + the pi2 prescription "Patient type" dimension).
        assert_eq!(property_repo.find_all().unwrap().len(), 25);
        // 34 table mappings: the 3 name customs + 6 name categories map to both
        // "name" and "patient" (9×2 = 18), the 7 item fields + 3 item categories
        // to "item" (10×1 = 10), the 6 transaction categories to one invoice
        // scope each (6×1 = 6).
        assert_eq!(table_repo.find_all().unwrap().len(), 34);

        // The name customs are shared by patients (same definition, extra mapping).
        let patient_mapping = table_repo
            .find_one_by_id("custom_1__patient")
            .unwrap()
            .expect("missing custom_1__patient mapping");
        assert_eq!(patient_mapping.property_id, "custom_1");
        assert_eq!(patient_mapping.table_name, "patient");
        assert!(patient_mapping.is_visible);

        // A second run is a no-op: change-aware seeding must not write (and so
        // must not add changelog rows) when nothing has changed.
        let cursor_before = changelog_repo.max_cursor().unwrap();
        seed_central_mapping_properties(&connection).unwrap();
        assert_eq!(changelog_repo.max_cursor().unwrap(), cursor_before);

        // A renamed property (mSupply label sync / admin edit) must keep its
        // name across re-seeds — only key/value_type are code-authoritative.
        property_repo
            .upsert_one(&PropertyV2Row {
                name: "ABC classification".to_string(),
                ..name_1.clone()
            })
            .unwrap();
        seed_central_mapping_properties(&connection).unwrap();
        let renamed = property_repo
            .find_one_by_id("custom_1")
            .unwrap()
            .unwrap();
        assert_eq!(
            renamed.name, "ABC classification",
            "seeder must not reset a synced name"
        );

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

    /// A category-bearing invoice type is wired up across four places the
    /// compiler can't tie together: the seeder entries here,
    /// `category_key_for_invoice_type`, `LEGACY_INVOICE_OWNED_KEYS`, and
    /// `invoice_property_table_name`. Shared `keys::` constants keep the key
    /// strings in step; this guards the rest — that every type appears in all
    /// four, and that the seeder's scope matches `invoice_property_table_name`.
    /// (The migration SQL backfill can't be reached, but shipped migrations are
    /// frozen so a new category-bearing type needs a new migration anyway.)
    #[test]
    fn transaction_category_mappings_stay_in_lock_step() {
        use crate::invoice::invoice_property_table_name;
        use crate::sync::translations::invoice::{
            category_key_for_invoice_type, LEGACY_INVOICE_OWNED_KEYS,
        };
        use repository::InvoiceType::*;

        let seeded: Vec<_> = mapping_properties()
            .into_iter()
            .filter(|def| LEGACY_INVOICE_OWNED_KEYS.contains(&def.key))
            .collect();

        // Every invoice type with a properties scope has exactly one seeded
        // category property whose key and scope match the translator's maps.
        let all_types = [
            OutboundShipment,
            InboundShipment,
            Prescription,
            InventoryAddition,
            InventoryReduction,
            Repack,
            SupplierReturn,
            CustomerReturn,
        ];
        let mut expected_keys = vec![keys::PRESCRIPTION_CATEGORY_2];
        for invoice_type in &all_types {
            let (key, scope) = (
                category_key_for_invoice_type(invoice_type),
                invoice_property_table_name(invoice_type),
            );
            assert_eq!(
                key.is_some(),
                scope.is_some(),
                "type {invoice_type:?}: category key and properties scope must both exist or both not"
            );
            let (Some(key), Some(scope)) = (key, scope) else {
                continue;
            };
            expected_keys.push(key);
            let def = seeded
                .iter()
                .find(|def| def.key == key)
                .unwrap_or_else(|| panic!("no seeded property for key {key:?}"));
            assert_eq!(
                def.table_names,
                &[scope],
                "seeded scope for {key:?} must match invoice_property_table_name"
            );
        }

        // The owned-keys list is exactly the seeded category keys (the per-type
        // keys + the pi2 prescription dimension), no more, no less.
        let mut owned: Vec<_> = LEGACY_INVOICE_OWNED_KEYS.to_vec();
        let mut seeded_keys: Vec<_> = seeded.iter().map(|def| def.key).collect();
        owned.sort_unstable();
        seeded_keys.sort_unstable();
        expected_keys.sort_unstable();
        assert_eq!(owned, seeded_keys);
        assert_eq!(owned, expected_keys);
    }
}
