use repository::{
    PropertyDisplayModeV2, PropertyKindV2, PropertyTableV2Row, PropertyTableV2RowRepository,
    PropertyV2Row, PropertyV2RowRepository, PropertyValueTypeV2, RepositoryError, StorageConnection,
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
    /// Per-scope display mode applied to each `property_table_v2` row this
    /// definition seeds. `Prominent` promotes the property to the scope's
    /// primary surface (e.g. the invoice detail-view toolbar); most mappings are
    /// plain `Visible`. Only applied on create — a later admin edit is preserved.
    display_mode: PropertyDisplayModeV2,
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
    // Import variants explicitly rather than glob-importing both enums: each
    // carries an `Other` variant, so two globs would clash.
    use PropertyDisplayModeV2::{Prominent, Visible};
    use PropertyValueTypeV2::{Boolean, Option, Real, Text};
    vec![
        // name `[name]custom1/2/3` — 4D column names are mapped onto snake_case
        // slugs by the v5 name translator.
        MappingProperty {
            id: "legacy_name_custom_1",
            key: "custom_1",
            name: "Custom 1",
            value_type: Text,
            display_mode: Visible,
            table_names: &["name", "patient"],
        },
        MappingProperty {
            id: "legacy_name_custom_2",
            key: "custom_2",
            name: "Custom 2",
            value_type: Text,
            display_mode: Visible,
            table_names: &["name", "patient"],
        },
        MappingProperty {
            id: "legacy_name_custom_3",
            key: "custom_3",
            name: "Custom 3",
            value_type: Text,
            display_mode: Visible,
            table_names: &["name", "patient"],
        },
        // item `[item]user_field_1..7` — 4D names are already snake_case, so the
        // OMS key matches the wire key 1:1. Value types come from the 4D catalog.
        MappingProperty {
            id: "legacy_item_user_field_1",
            key: "user_field_1",
            name: "User field 1",
            value_type: Text,
            display_mode: Visible,
            table_names: &["item"],
        },
        MappingProperty {
            id: "legacy_item_user_field_2",
            key: "user_field_2",
            name: "User field 2",
            value_type: Text,
            display_mode: Visible,
            table_names: &["item"],
        },
        MappingProperty {
            id: "legacy_item_user_field_3",
            key: "user_field_3",
            name: "User field 3",
            value_type: Text,
            display_mode: Visible,
            table_names: &["item"],
        },
        MappingProperty {
            id: "legacy_item_user_field_4",
            key: "user_field_4",
            name: "User field 4",
            value_type: Boolean,
            display_mode: Visible,
            table_names: &["item"],
        },
        MappingProperty {
            id: "legacy_item_user_field_5",
            key: "user_field_5",
            name: "User field 5",
            value_type: Real,
            display_mode: Visible,
            table_names: &["item"],
        },
        MappingProperty {
            id: "legacy_item_user_field_6",
            key: "user_field_6",
            name: "User field 6",
            value_type: Text,
            display_mode: Visible,
            table_names: &["item"],
        },
        MappingProperty {
            id: "legacy_item_user_field_7",
            key: "user_field_7",
            name: "User field 7",
            value_type: Boolean,
            display_mode: Visible,
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
            display_mode: Visible,
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
            display_mode: Visible,
            table_names: &["item"],
        },
        MappingProperty {
            id: "legacy_item_category_3",
            key: "item_category3",
            name: "Category 3",
            value_type: Option,
            display_mode: Visible,
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
            id: "legacy_name_category_1",
            key: "name_category1",
            name: "Category 1",
            value_type: Option,
            display_mode: Visible,
            table_names: &["name", "patient"],
        },
        MappingProperty {
            id: "legacy_name_category_2",
            key: "name_category2",
            name: "Category 2",
            value_type: Option,
            display_mode: Visible,
            table_names: &["name", "patient"],
        },
        MappingProperty {
            id: "legacy_name_category_3",
            key: "name_category3",
            name: "Category 3",
            value_type: Option,
            display_mode: Visible,
            table_names: &["name", "patient"],
        },
        MappingProperty {
            id: "legacy_name_category_4",
            key: "name_category4",
            name: "Category 4",
            value_type: Option,
            display_mode: Visible,
            table_names: &["name", "patient"],
        },
        MappingProperty {
            id: "legacy_name_category_5",
            key: "name_category5",
            name: "Category 5",
            value_type: Option,
            display_mode: Visible,
            table_names: &["name", "patient"],
        },
        MappingProperty {
            id: "legacy_name_category_6",
            key: "name_category6",
            name: "Category 6",
            value_type: Option,
            display_mode: Visible,
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
            id: "legacy_transaction_category_si",
            key: "inbound_shipment_category",
            name: "Category",
            value_type: Option,
            display_mode: Prominent,
            table_names: &["inbound_shipment"],
        },
        MappingProperty {
            id: "legacy_transaction_category_ci",
            key: "outbound_shipment_category",
            name: "Category",
            value_type: Option,
            display_mode: Prominent,
            table_names: &["outbound_shipment"],
        },
        MappingProperty {
            id: "legacy_transaction_category_pi",
            key: "prescription_category",
            name: "Category",
            value_type: Option,
            display_mode: Prominent,
            table_names: &["prescription"],
        },
        MappingProperty {
            id: "legacy_transaction_category_sc",
            key: "supplier_return_category",
            name: "Category",
            value_type: Option,
            display_mode: Prominent,
            table_names: &["supplier_return"],
        },
        MappingProperty {
            id: "legacy_transaction_category_cc",
            key: "customer_return_category",
            name: "Category",
            value_type: Option,
            display_mode: Prominent,
            table_names: &["customer_return"],
        },
        // OG's second prescription dimension — the "Prescriptions (2)" category
        // pool ("pi2"), shown on the OG prescription form as the Patient Type
        // dropdown and stored in `transact.category2_ID` (dispensary mode only).
        MappingProperty {
            id: "legacy_transaction_category_pi2",
            key: "prescription_category2",
            name: "Patient type",
            value_type: Option,
            display_mode: Prominent,
            table_names: &["prescription"],
        },
    ]
}

/// Seed the code-defined mapping property definitions. **Central-server only** —
/// callers must gate on `CentralServerConfig::is_central_server()`. Remotes
/// receive these over v7; they must never seed their own (see the properties
/// dev doc for why version-safety lives entirely in the v7 path).
///
/// Idempotent and change-aware: a row is only upserted when missing or when its
/// code-authoritative content differs, so steady-state runs add no changelog
/// churn. The `property_table_v2` mapping is only created when **absent**, so a
/// later display-mode edit (`display_mode`) is preserved rather than reset here.
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
        // so an admin's future display-mode change isn't reset on the next sync.
        for table_name in def.table_names {
            let table_id = format!("{}__{}", def.id, table_name);
            if table_repo.find_one_by_id(&table_id)?.is_none() {
                table_repo.upsert_one(&PropertyTableV2Row {
                    id: table_id,
                    property_id: def.id.to_string(),
                    table_name: table_name.to_string(),
                    display_mode: def.display_mode.clone(),
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

        let trans_si = property_repo
            .find_one_by_id("legacy_transaction_category_si")
            .unwrap()
            .expect("missing legacy_transaction_category_si");
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
            .find_one_by_id("legacy_name_custom_1__patient")
            .unwrap()
            .expect("missing legacy_name_custom_1__patient mapping");
        assert_eq!(patient_mapping.property_id, "legacy_name_custom_1");
        assert_eq!(patient_mapping.table_name, "patient");
        assert_eq!(patient_mapping.display_mode, PropertyDisplayModeV2::Visible);

        // A second run is a no-op: change-aware seeding must not write (and so
        // must not add changelog rows) when nothing has changed.
        let cursor_before = changelog_repo.max_cursor().unwrap();
        seed_central_mapping_properties(&connection).unwrap();
        assert_eq!(changelog_repo.max_cursor().unwrap(), cursor_before);

        // A display-mode edit on a table mapping must be preserved across re-seeds.
        table_repo
            .upsert_one(&PropertyTableV2Row {
                id: "legacy_name_custom_1__name".to_string(),
                property_id: "legacy_name_custom_1".to_string(),
                table_name: "name".to_string(),
                display_mode: PropertyDisplayModeV2::Hidden,
            })
            .unwrap();
        seed_central_mapping_properties(&connection).unwrap();
        let table_row = table_repo
            .find_one_by_id("legacy_name_custom_1__name")
            .unwrap()
            .unwrap();
        assert_eq!(
            table_row.display_mode,
            PropertyDisplayModeV2::Hidden,
            "seeder must not reset display_mode"
        );
    }

    /// The transaction category type→key/scope relationship is encoded in
    /// several places that the compiler can't tie together: the seeder entries
    /// here, the invoice translator's `category_key_for_invoice_type` +
    /// `LEGACY_INVOICE_OWNED_KEYS`, and `invoice_property_table_name`. This
    /// test fails if any of them drift (the migration SQL backfill is the one
    /// copy it can't reach — but shipped migrations are frozen, so a future
    /// category-bearing type needs a new migration regardless).
    #[test]
    fn transaction_category_mappings_stay_in_lock_step() {
        use crate::invoice::invoice_property_table_name;
        use crate::sync::translations::invoice::{
            category_key_for_invoice_type, LEGACY_INVOICE_OWNED_KEYS, PRESCRIPTION_CATEGORY2_KEY,
        };
        use repository::InvoiceType::*;

        let seeded: Vec<_> = mapping_properties()
            .into_iter()
            .filter(|def| def.id.starts_with("legacy_transaction_category_"))
            .collect();

        // Transaction categories are promoted to the invoice toolbar; lock that
        // in so a future seeder edit can't silently demote them.
        assert!(
            seeded
                .iter()
                .all(|def| def.display_mode == PropertyDisplayModeV2::Prominent),
            "every transaction category mapping must be Prominent"
        );

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
        let mut expected_keys = vec![PRESCRIPTION_CATEGORY2_KEY];
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
