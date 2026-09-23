use super::{version::Version, Migration, MigrationFragment};
use crate::StorageConnection;

mod add_line_total_to_purchase_order_line;

pub(crate) struct V3_04_00;

impl Migration for V3_04_00 {
    fn version(&self) -> Version {
        Version::from_str("3.04.0")
    }

    fn migrate(&self, _connection: &StorageConnection) -> anyhow::Result<()> {
        Ok(())
    }

    fn migrate_fragments(&self) -> Vec<Box<dyn MigrationFragment>> {
        vec![Box::new(add_line_total_to_purchase_order_line::Migrate)]
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
}
