use super::{Migration, MigrationFragment, version::Version};
use crate::StorageConnection;

mod add_campaign_id_to_invoice;
mod add_campaign_to_requisition_line;
mod add_cancelled_status_to_purchase_order;
mod add_code_to_location_type;
mod add_exclude_principal_wastage_to_ancillary_item;
mod add_forecast_method_to_requisition_line;
mod add_kind_to_campaign;
mod add_line_total_to_purchase_order_line;
mod add_not_installed_status_to_asset_status_enum;
mod add_stock_campaign_change_activity_log_type;
mod add_uploader_to_sync_file_reference;
mod prescription_request_occupation_prominent;
mod refresh_who_pqs_catalogue;
mod update_default_asset_log_reasons;

pub(crate) struct V3_04_00;

impl Migration for V3_04_00 {
    fn version(&self) -> Version {
        Version::from_str("3.04.0")
    }

    fn migrate(&self, _connection: &StorageConnection) -> anyhow::Result<()> {
        Ok(())
    }

    fn migrate_fragments(&self) -> Vec<Box<dyn MigrationFragment>> {
        vec![
            Box::new(add_code_to_location_type::Migrate),
            Box::new(add_line_total_to_purchase_order_line::Migrate),
            Box::new(add_not_installed_status_to_asset_status_enum::Migrate),
            Box::new(add_uploader_to_sync_file_reference::Migrate),
            Box::new(prescription_request_occupation_prominent::Migrate),
            Box::new(add_campaign_id_to_invoice::Migrate),
            Box::new(refresh_who_pqs_catalogue::Migrate),
            Box::new(update_default_asset_log_reasons::Migrate),
            Box::new(add_forecast_method_to_requisition_line::Migrate),
            Box::new(add_cancelled_status_to_purchase_order::Migrate),
            Box::new(add_exclude_principal_wastage_to_ancillary_item::Migrate),
            Box::new(add_kind_to_campaign::Migrate),
            Box::new(add_campaign_to_requisition_line::Migrate),
            Box::new(add_stock_campaign_change_activity_log_type::Migrate),
        ]
    }
}

#[cfg(test)]
mod test {
    use crate::{
        migrations::{v3_02_00::V3_02_00, v3_04_00::V3_04_00, *},
        test_db::*,
    };
    use diesel::{RunQueryDsl, prelude::*, sql_query};

    table! {
        purchase_order_line (id) {
            id -> Text,
            line_total -> Double,
        }
    }

    table! {
        asset_catalogue_item (id) {
            id -> Text,
            code -> Text,
            sub_catalogue -> Text,
            asset_catalogue_type_id -> Text,
            properties -> Nullable<Text>,
        }
    }

    table! {
        asset_catalogue_type (id) {
            id -> Text,
            name -> Text,
        }
    }

    table! {
        changelog (cursor) {
            cursor -> BigInt,
            table_name -> Text,
            record_id -> Text,
            row_action -> Text,
            store_id -> Nullable<Text>,
            source_site_id -> Nullable<Integer>,
        }
    }

    fn run(connection: &StorageConnection, sql: &str) {
        sql_query(sql)
            .execute(connection.lock().connection())
            .unwrap();
    }

    fn insert_line(
        connection: &StorageConnection,
        id: &str,
        pack_size: f64,
        requested_units: f64,
        adjusted_units: Option<f64>,
        price_after_discount: f64,
    ) {
        let adjusted = adjusted_units
            .map(|u| u.to_string())
            .unwrap_or("NULL".to_string());
        run(
            connection,
            &format!(
                "INSERT INTO purchase_order_line (id, purchase_order_id, store_id, line_number, item_link_id, item_name, requested_pack_size, requested_number_of_units, adjusted_number_of_units, price_per_pack_before_discount, price_per_pack_after_discount, status) VALUES ('{id}', 'po', 'store_id', 1, 'item_link', 'Item', {pack_size}, {requested_units}, {adjusted}, {price_after_discount}, {price_after_discount}, 'NEW');"
            ),
        );
    }

    /// The backfill writes every existing line's total on the same rule the
    /// service uses from then on: after-discount price × (requested units over
    /// pack size), and 0 for a zero pack size.
    #[actix_rt::test]
    async fn migration_3_04_00() {
        let previous_version = V3_02_00.version();
        let version = V3_04_00.version();

        let SetupResult { connection, .. } = setup_test(SetupOption {
            db_name: &format!("migration_{version}"),
            version: Some(previous_version.clone()),
            ..Default::default()
        })
        .await;

        run(
            &connection,
            "INSERT INTO name (id, type, is_customer, is_supplier, code, name) VALUES ('supplier_name', 'FACILITY', false, true, 'SUP1', 'Supplier');",
        );
        run(
            &connection,
            "INSERT INTO name_link (id, name_id) VALUES ('supplier_name_link', 'supplier_name');",
        );
        run(
            &connection,
            "INSERT INTO name (id, type, is_customer, is_supplier, code, name) VALUES ('store_name', 'FACILITY', true, false, 'STORE', 'Store');",
        );
        run(
            &connection,
            "INSERT INTO name_link (id, name_id) VALUES ('store_name_link', 'store_name');",
        );
        run(
            &connection,
            "INSERT INTO store (id, name_link_id, code, site_id) VALUES ('store_id', 'store_name_link', 'STORE1', 1);",
        );
        run(
            &connection,
            "INSERT INTO item (id, name, code, default_pack_size, type, legacy_record) VALUES ('item_id', 'Item', 'ITEM1', 1.0, 'STOCK', '');",
        );
        run(
            &connection,
            "INSERT INTO item_link (id, item_id) VALUES ('item_link', 'item_id');",
        );
        run(
            &connection,
            "INSERT INTO purchase_order (id, store_id, supplier_name_link_id, purchase_order_number, status, created_datetime, foreign_exchange_rate) VALUES ('po', 'store_id', 'supplier_name_link', 1, 'NEW', '2026-01-01 00:00:00', 1.0);",
        );

        // 100 units at pack size 10 = 10 packs at 6.00 → 60.00
        insert_line(&connection, "pol_requested", 10.0, 100.0, None, 6.0);
        // An adjusted quantity is ignored: still 10 packs at 6.00 → 60.00
        insert_line(&connection, "pol_adjusted", 10.0, 100.0, Some(50.0), 6.0);
        // A zero pack size contributes nothing, whatever the quantity or price
        insert_line(&connection, "pol_zero_pack", 0.0, 50.0, None, 5.0);

        migrate(
            &connection,
            Some(version.clone()),
            MigrationConfig::default(),
        )
        .unwrap();
        assert_eq!(get_database_version(&connection), version);

        let mut rows: Vec<(String, f64)> = purchase_order_line::table
            .select((purchase_order_line::id, purchase_order_line::line_total))
            .load(connection.lock().connection())
            .unwrap();
        rows.sort_by(|a, b| a.0.cmp(&b.0));
        assert_eq!(
            rows,
            vec![
                ("pol_adjusted".to_string(), 60.0),
                ("pol_requested".to_string(), 60.0),
                ("pol_zero_pack".to_string(), 0.0),
            ]
        );
    }

    fn catalogue_item(
        connection: &StorageConnection,
        code: &str,
    ) -> (String, String, serde_json::Value) {
        let (id, sub_catalogue, properties) = asset_catalogue_item::table
            .filter(asset_catalogue_item::code.eq(code))
            .select((
                asset_catalogue_item::id,
                asset_catalogue_item::sub_catalogue,
                asset_catalogue_item::properties,
            ))
            .first::<(String, String, Option<String>)>(connection.lock().connection())
            .unwrap();
        let properties = serde_json::from_str(&properties.unwrap_or("{}".to_string())).unwrap();
        (id, sub_catalogue, properties)
    }

    fn type_of(connection: &StorageConnection, code: &str) -> String {
        let type_id: String = asset_catalogue_item::table
            .filter(asset_catalogue_item::code.eq(code))
            .select(asset_catalogue_item::asset_catalogue_type_id)
            .first(connection.lock().connection())
            .unwrap();
        asset_catalogue_type::table
            .filter(asset_catalogue_type::id.eq(type_id))
            .select(asset_catalogue_type::name)
            .first(connection.lock().connection())
            .unwrap()
    }

    fn count_in(connection: &StorageConnection, sub_catalogue: &str) -> i64 {
        asset_catalogue_item::table
            .filter(asset_catalogue_item::sub_catalogue.eq(sub_catalogue))
            .count()
            .get_result(connection.lock().connection())
            .unwrap()
    }

    /// The WHO PQS refresh (#1285): new products are added, under new types where
    /// they need one, withdrawn ones are relabelled rather than removed, a code the
    /// site already holds is left alone, freeze-free cold boxes move to their own
    /// type, and WHO PQS cold rooms move to a 20-year lifespan. Every type and
    /// item it adds or changes gets a changelog row stamped with the central
    /// site id, so central can send the refresh out; untouched rows get none.
    #[actix_rt::test]
    async fn migration_3_04_00_who_pqs_catalogue() {
        // Declared here rather than beside the module's other tables, so it
        // doesn't collide with another test's own `changelog` declaration.
        table! {
            changelog (cursor) {
                cursor -> BigInt,
                table_name -> Text,
                record_id -> Text,
                store_id -> Nullable<Text>,
                source_site_id -> Nullable<Integer>,
            }
        }

        let previous_version = V3_02_00.version();
        let version = V3_04_00.version();

        let SetupResult { connection, .. } = setup_test(SetupOption {
            db_name: &format!("migration_{version}_who_pqs_catalogue"),
            version: Some(previous_version.clone()),
            ..Default::default()
        })
        .await;

        // A site that imported E003/140 into its own sub-catalogue before the refresh
        run(
            &connection,
            "INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_catalogue_type_id, manufacturer, model) VALUES ('site_e003_140', 'General', 'E003/140', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '710194ce-8c6c-47ab-b7fe-13ba8cf091f6', 'EMK TEC GmbH', 'Indigo 201');",
        );
        // A site's own cold room, which keeps the lifespan it was given
        run(
            &connection,
            r#"INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_catalogue_type_id, manufacturer, model, properties) VALUES ('site_cold_room', 'General', 'SITE-CR', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '7db32eb6-5929-4dd1-a5e9-01e36baa73ad', '9a4ad0dd-138a-41b2-81df-08772635085e', 'Local', 'Room', '{"expected_lifespan":15}');"#,
        );
        assert_eq!(count_in(&connection, "WHO PQS"), 168);
        run(
            &connection,
            "INSERT INTO key_value_store (id, value_int) VALUES ('SETTINGS_SYNC_CENTRAL_SERVER_SITE_ID', 42);",
        );

        migrate(
            &connection,
            Some(version.clone()),
            MigrationConfig::default(),
        )
        .unwrap();

        // 168 - 86 withdrawn + 87 new, less the E003/140 the site already holds
        assert_eq!(count_in(&connection, "WHO PQS"), 168);
        assert_eq!(count_in(&connection, "WHO PQS (withdrawn)"), 86);

        let (_, sub_catalogue, properties) = catalogue_item(&connection, "E003/002");
        assert_eq!(sub_catalogue, "WHO PQS (withdrawn)");
        assert_eq!(properties["expected_lifespan"], 10);
        // Suspended by WHO, so marked withdrawn too
        let (_, sub_catalogue, _) = catalogue_item(&connection, "E004/061");
        assert_eq!(sub_catalogue, "WHO PQS (withdrawn)");
        // Still prequalified
        let (_, sub_catalogue, _) = catalogue_item(&connection, "E003/071");
        assert_eq!(sub_catalogue, "WHO PQS");

        let (_, sub_catalogue, properties) = catalogue_item(&connection, "E003/040e");
        assert_eq!(sub_catalogue, "WHO PQS");
        assert_eq!(properties["hold_over_time"], 90.5);
        assert_eq!(properties["expected_lifespan"], 10);

        assert_eq!(type_of(&connection, "E003/141"), "Other");
        assert_eq!(
            type_of(&connection, "E004/090"),
            "Cold box - long range - freeze-free"
        );
        assert_eq!(
            type_of(&connection, "E004/085"),
            "Cold box - short range - freeze-free"
        );
        // Filed until now as freeze-free vaccine carriers
        assert_eq!(
            type_of(&connection, "E004/057"),
            "Cold box - long range - freeze-free"
        );
        assert_eq!(
            type_of(&connection, "E004/064"),
            "Cold box - short range - freeze-free"
        );

        let (id, sub_catalogue, _) = catalogue_item(&connection, "E003/140");
        assert_eq!(
            (id.as_str(), sub_catalogue.as_str()),
            ("site_e003_140", "General")
        );

        let (_, _, properties) = catalogue_item(&connection, "E001/001-C");
        assert_eq!(properties["expected_lifespan"], 20);
        let (_, _, properties) = catalogue_item(&connection, "SITE-CR");
        assert_eq!(properties["expected_lifespan"], 15);

        let changelog_rows = |table_name: &str| {
            changelog::table
                .filter(changelog::table_name.eq(table_name.to_string()))
                .select((
                    changelog::record_id,
                    changelog::store_id,
                    changelog::source_site_id,
                ))
                .load::<(String, Option<String>, Option<i32>)>(connection.lock().connection())
                .unwrap()
        };
        let types = changelog_rows("asset_catalogue_type");
        let items = changelog_rows("asset_catalogue_item");
        assert!(
            types
                .iter()
                .chain(items.iter())
                .all(|(_, store_id, site_id)| store_id.is_none() && *site_id == Some(42)),
            "changelog rows are central rows, stamped with the central site id"
        );
        assert_eq!(types.len(), 3);

        let announced = |code: &str| {
            let (id, _, _) = catalogue_item(&connection, code);
            items
                .iter()
                .filter(|(record_id, _, _)| *record_id == id)
                .count()
        };
        assert_eq!(announced("E003/141"), 1, "new");
        assert_eq!(announced("E003/002"), 1, "withdrawn");
        assert_eq!(announced("E004/057"), 1, "retyped");
        assert_eq!(announced("E001/001-C"), 1, "cold room lifespan");
        assert_eq!(announced("E003/071"), 0, "untouched");
        assert_eq!(announced("E003/140"), 0, "the site's own import");
        assert_eq!(announced("SITE-CR"), 0, "the site's own cold room");
    }

    /// The Not functioning reasons match UNICEF's list: the temperature
    /// reason moves over from Not in use under its new name, and the two
    /// missing reasons are added alongside the existing ones. "Other" is the
    /// only one that requires a comment. The three changed rows get changelog
    /// rows stamped with the central site id, so central can send them out.
    #[actix_rt::test]
    async fn migration_3_04_00_asset_log_reasons() {
        use crate::{AssetLogReasonRowRepository, asset_log_row::AssetLogStatus};

        let previous_version = V3_02_00.version();
        let version = V3_04_00.version();

        let SetupResult { connection, .. } = setup_test(SetupOption {
            db_name: &format!("migration_{version}_asset_log_reasons"),
            version: Some(previous_version.clone()),
            ..Default::default()
        })
        .await;

        run(
            &connection,
            "INSERT INTO key_value_store (id, value_int) VALUES ('SETTINGS_SYNC_CENTRAL_SERVER_SITE_ID', 42)",
        );

        migrate(
            &connection,
            Some(version.clone()),
            MigrationConfig::default(),
        )
        .unwrap();

        let reasons = |status: AssetLogStatus| {
            let mut reasons: Vec<String> = AssetLogReasonRowRepository::new(&connection)
                .find_all()
                .unwrap()
                .into_iter()
                .filter(|row| row.asset_log_status == status)
                .map(|row| row.reason)
                .collect();
            reasons.sort();
            reasons
        };

        assert_eq!(
            reasons(AssetLogStatus::NotFunctioning),
            vec![
                "Lack of power",
                "Multiple temperature excursions",
                "Needs spare parts",
                "Other",
                "Solar panel failure",
            ]
        );
        assert_eq!(
            reasons(AssetLogStatus::NotInUse),
            vec![
                "Awaiting decommissioning",
                "Awaiting installation",
                "Offsite for repairs",
                "Stored",
                "Unknown",
            ]
        );

        let comments_required: Vec<String> = AssetLogReasonRowRepository::new(&connection)
            .find_all()
            .unwrap()
            .into_iter()
            .filter(|row| row.asset_log_status == AssetLogStatus::NotFunctioning)
            .filter(|row| row.comments_required)
            .map(|row| row.reason)
            .collect();
        assert_eq!(comments_required, vec!["Other"]);

        let mut changelog_rows = changelog::table
            .filter(changelog::table_name.eq("asset_log_reason"))
            .select((
                changelog::record_id,
                changelog::row_action,
                changelog::store_id,
                changelog::source_site_id,
            ))
            .load::<(String, String, Option<String>, Option<i32>)>(connection.lock().connection())
            .unwrap();
        changelog_rows.sort();
        let central = |id: &str| (id.to_string(), "UPSERT".to_string(), None, Some(42));
        assert_eq!(
            changelog_rows,
            vec![
                central("2f734462-c76d-4b08-b8d2-40b250538d46"),
                central("646c80b2-2ff7-4c50-916b-18ff3df5cfb5"),
                central("ba800d96-2cf6-44e8-8fbb-41fedb154265"),
            ]
        );
    }
}
