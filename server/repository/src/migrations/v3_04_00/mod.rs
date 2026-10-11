use super::{version::Version, Migration, MigrationFragment};
use crate::StorageConnection;

mod add_barcode_auto_confirm_processor_cursor_pg_enum;
mod add_code_to_location_type;
mod add_is_auto_created_to_item_variant;
mod add_line_total_to_purchase_order_line;
mod barcode_proposals;
mod barcodes_on_packaging_variants;
mod seed_barcode_auto_confirm_processor_cursor;

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
            Box::new(barcode_proposals::Migrate),
            Box::new(add_barcode_auto_confirm_processor_cursor_pg_enum::Migrate),
            Box::new(seed_barcode_auto_confirm_processor_cursor::Migrate),
            Box::new(add_is_auto_created_to_item_variant::Migrate),
            Box::new(barcodes_on_packaging_variants::Migrate),
        ]
    }
}

#[cfg(test)]
mod test {
    use crate::{
        migrations::{v3_02_00::V3_02_00, v3_04_00::V3_04_00, *},
        test_db::*,
    };
    use diesel::{prelude::*, sql_query, RunQueryDsl};

    table! {
        purchase_order_line (id) {
            id -> Text,
            line_total -> Double,
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

        run(&connection, "INSERT INTO name (id, type, is_customer, is_supplier, code, name) VALUES ('supplier_name', 'FACILITY', false, true, 'SUP1', 'Supplier');");
        run(
            &connection,
            "INSERT INTO name_link (id, name_id) VALUES ('supplier_name_link', 'supplier_name');",
        );
        run(&connection, "INSERT INTO name (id, type, is_customer, is_supplier, code, name) VALUES ('store_name', 'FACILITY', true, false, 'STORE', 'Store');");
        run(
            &connection,
            "INSERT INTO name_link (id, name_id) VALUES ('store_name_link', 'store_name');",
        );
        run(&connection, "INSERT INTO store (id, name_link_id, code, site_id) VALUES ('store_id', 'store_name_link', 'STORE1', 1);");
        run(&connection, "INSERT INTO item (id, name, code, default_pack_size, type, legacy_record) VALUES ('item_id', 'Item', 'ITEM1', 1.0, 'STOCK', '');");
        run(
            &connection,
            "INSERT INTO item_link (id, item_id) VALUES ('item_link', 'item_id');",
        );
        run(&connection, "INSERT INTO purchase_order (id, store_id, supplier_name_link_id, purchase_order_number, status, created_datetime, foreign_exchange_rate) VALUES ('po', 'store_id', 'supplier_name_link', 1, 'NEW', '2026-01-01 00:00:00', 1.0);");

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

    table! {
        barcode_proposal (id) {
            id -> Text,
            value -> Text,
            item_link_id -> Text,
            pack_size -> Nullable<Double>,
            store_id -> Text,
            user_id -> Text,
        }
    }

    table! {
        stock_line (id) {
            id -> Text,
            barcode -> Nullable<Text>,
        }
    }

    table! {
        changelog (cursor) {
            cursor -> BigInt,
            table_name -> Text,
            record_id -> Text,
            store_id -> Nullable<Text>,
            source_site_id -> Nullable<Integer>,
        }
    }

    /// Existing barcodes become proposals from a store on this site, in standard
    /// form, so they sync up to central. Ones that are the same barcode for the
    /// same item once in standard form become one proposal. The barcode table and
    /// its changelog entries go. Stock lines get the barcode's value in place of
    /// its id.
    #[actix_rt::test]
    async fn migration_3_04_00_barcodes() {
        let previous_version = V3_02_00.version();
        let version = V3_04_00.version();

        let SetupResult { connection, .. } = setup_test(SetupOption {
            db_name: &format!("migration_{version}_barcodes"),
            version: Some(previous_version.clone()),
            ..Default::default()
        })
        .await;

        run(
            &connection,
            "INSERT INTO key_value_store (id, value_int) VALUES ('SETTINGS_SYNC_SITE_ID', 1);",
        );
        run(&connection, "INSERT INTO name (id, type, is_customer, is_supplier, code, name) VALUES ('store_name', 'FACILITY', true, false, 'STORE', 'Store');");
        run(
            &connection,
            "INSERT INTO name_link (id, name_id) VALUES ('store_name_link', 'store_name');",
        );
        // The proposals go to the first store on this site
        for (store, site) in [("a_other_site", 2), ("b_store", 1), ("c_store", 1)] {
            run(&connection, &format!("INSERT INTO store (id, name_link_id, code, site_id) VALUES ('{store}', 'store_name_link', '{store}', {site});"));
        }
        for item in ["item_a", "item_b"] {
            run(&connection, &format!("INSERT INTO item (id, name, code, default_pack_size, type, legacy_record) VALUES ('{item}', '{item}', '{item}', 1.0, 'STOCK', '');"));
            run(
                &connection,
                &format!("INSERT INTO item_link (id, item_id) VALUES ('{item}', '{item}');"),
            );
        }

        // EAN-13 and its GTIN-14 form, for the same item: one proposal
        run(&connection, "INSERT INTO barcode (id, gtin, item_id, pack_size) VALUES ('b1', '9506682101352', 'item_a', 10);");
        run(
            &connection,
            "INSERT INTO barcode (id, gtin, item_id) VALUES ('b2', '09506682101352', 'item_a');",
        );
        // The same barcode for another item: its own proposal
        run(
            &connection,
            "INSERT INTO barcode (id, gtin, item_id) VALUES ('b3', ' 09506682101352', 'item_b');",
        );
        // Not a GTIN: plain
        run(
            &connection,
            "INSERT INTO barcode (id, gtin, item_id) VALUES ('b4', 'ABC-1', 'item_b');",
        );
        // Blank: dropped
        run(
            &connection,
            "INSERT INTO barcode (id, gtin, item_id) VALUES ('b5', '  ', 'item_b');",
        );
        for id in ["b1", "b2", "b3", "b4", "b5"] {
            run(&connection, &format!("INSERT INTO changelog (table_name, record_id, row_action) VALUES ('barcode', '{id}', 'UPSERT');"));
        }
        for (stock_line, barcode) in [("s1", "b2"), ("s2", "b4")] {
            run(&connection, &format!("INSERT INTO stock_line (id, item_link_id, store_id, pack_size, cost_price_per_pack, sell_price_per_pack, available_number_of_packs, total_number_of_packs, on_hold, barcode_id) VALUES ('{stock_line}', 'item_a', 'b_store', 1, 0, 0, 1, 1, false, '{barcode}');"));
        }
        run(&connection, "INSERT INTO stock_line (id, item_link_id, store_id, pack_size, cost_price_per_pack, sell_price_per_pack, available_number_of_packs, total_number_of_packs, on_hold) VALUES ('s3', 'item_a', 'b_store', 1, 0, 0, 1, 1, false);");

        migrate(
            &connection,
            Some(version.clone()),
            MigrationConfig::default(),
        )
        .unwrap();

        let proposals: Vec<(String, String, Option<f64>, String, String)> = barcode_proposal::table
            .select((
                barcode_proposal::value,
                barcode_proposal::item_link_id,
                barcode_proposal::pack_size,
                barcode_proposal::store_id,
                barcode_proposal::user_id,
            ))
            .order((
                barcode_proposal::value.asc(),
                barcode_proposal::item_link_id.asc(),
            ))
            .load(connection.lock().connection())
            .unwrap();
        let proposal = |value: &str, item: &str, pack_size: Option<f64>| {
            (
                value.to_string(),
                item.to_string(),
                pack_size,
                "b_store".to_string(),
                "omsupply_system".to_string(),
            )
        };
        assert_eq!(
            proposals,
            vec![
                proposal("gtin:09506682101352", "item_a", Some(10.0)),
                proposal("gtin:09506682101352", "item_b", None),
                proposal("plain:ABC-1", "item_b", None),
            ]
        );

        // Each proposal is in the changelog for its store, to sync up
        let proposal_changelogs: Vec<(Option<String>, Option<i32>)> = changelog::table
            .filter(changelog::table_name.eq("barcode_proposal"))
            .select((changelog::store_id, changelog::source_site_id))
            .load(connection.lock().connection())
            .unwrap();
        assert_eq!(
            proposal_changelogs,
            vec![(Some("b_store".to_string()), Some(1)); 3]
        );
        assert_eq!(
            changelog::table
                .filter(changelog::table_name.eq("barcode"))
                .count()
                .get_result::<i64>(connection.lock().connection())
                .unwrap(),
            0
        );

        let stock_lines: Vec<(String, Option<String>)> = stock_line::table
            .select((stock_line::id, stock_line::barcode))
            .order(stock_line::id.asc())
            .load(connection.lock().connection())
            .unwrap();
        assert_eq!(
            stock_lines,
            vec![
                ("s1".to_string(), Some("gtin:09506682101352".to_string())),
                ("s2".to_string(), Some("plain:ABC-1".to_string())),
                ("s3".to_string(), None),
            ]
        );
    }
}
