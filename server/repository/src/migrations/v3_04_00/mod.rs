use super::{Migration, MigrationFragment, version::Version};
use crate::StorageConnection;

mod add_code_to_location_type;
mod add_line_total_to_purchase_order_line;
mod prescription_request_occupation_prominent;
mod refresh_who_pqs_catalogue;

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
            Box::new(prescription_request_occupation_prominent::Migrate),
            Box::new(refresh_who_pqs_catalogue::Migrate),
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
    /// service uses from then on: after-discount price × (adjusted-or-requested
    /// units over pack size), and 0 for a zero pack size.
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
        // An adjusted quantity takes precedence: 50 units = 5 packs at 6.00 → 30.00
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
                ("pol_adjusted".to_string(), 30.0),
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
    /// type, and WHO PQS cold rooms move to a 20-year lifespan.
    #[actix_rt::test]
    async fn migration_3_04_00_who_pqs_catalogue() {
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
    }
}
