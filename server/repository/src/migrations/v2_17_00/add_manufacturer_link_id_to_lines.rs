use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_manufacturer_link_id_to_lines"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                ALTER TABLE invoice_line
                    ADD COLUMN manufacturer_link_id TEXT REFERENCES name_link(id);
                CREATE INDEX "index_invoice_line_manufacturer_link_id_fkey"
                    ON "invoice_line" ("manufacturer_link_id");

                ALTER TABLE stock_line
                    ADD COLUMN manufacturer_link_id TEXT REFERENCES name_link(id);
                CREATE INDEX "index_stock_line_manufacturer_link_id_fkey"
                    ON "stock_line" ("manufacturer_link_id");

                ALTER TABLE stocktake_line
                    ADD COLUMN manufacturer_link_id TEXT REFERENCES name_link(id);
                CREATE INDEX "index_stocktake_line_manufacturer_link_id_fkey"
                    ON "stocktake_line" ("manufacturer_link_id");
            "#
        )?;

        sql!(
            connection,
            r#"
                UPDATE stock_line
                SET manufacturer_link_id = (
                    SELECT iv.manufacturer_link_id
                    FROM item_variant iv
                    WHERE iv.id = stock_line.item_variant_id
                )
                WHERE stock_line.item_variant_id IS NOT NULL
                AND stock_line.manufacturer_link_id IS NULL;
            "#
        )?;

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use crate::{
        migrations::{v2_16_00::V2_16_00, v2_17_00::V2_17_00, *},
        test_db::*,
    };
    use diesel::{prelude::*, sql_query, RunQueryDsl};

    table! {
        stock_line (id) {
            id -> Text,
            item_variant_id -> Nullable<Text>,
            manufacturer_link_id -> Nullable<Text>,
        }
    }

    fn setup_test_dependencies(connection: &StorageConnection) {
        let run = |sql: &str| {
            sql_query(sql)
                .execute(connection.lock().connection())
                .unwrap()
        };

        run("INSERT INTO name (id, type, is_customer, is_supplier, code, name) VALUES ('manufacturer_a', 'FACILITY', false, false, 'manufacturer_A', 'Manufacturer A');");
        run("INSERT INTO name_link (id, name_id) VALUES ('manufacturer_a', 'manufacturer_a');");

        run("INSERT INTO name (id, type, is_customer, is_supplier, code, name) VALUES ('store_name', 'FACILITY', true, false, 'STORE', 'Store');");
        run("INSERT INTO name_link (id, name_id) VALUES ('store_name', 'store_name');");

        run("INSERT INTO store (id, name_link_id, code, site_id) VALUES ('store_id', 'store_name', 'STORE1', 1);");

        run("INSERT INTO item (id, name, code, default_pack_size, type, legacy_record) VALUES ('item_id', 'Test Item', 'ITEM1', 1.0, 'STOCK', '');");
        run("INSERT INTO item_link (id, item_id) VALUES ('item_id', 'item_id');");

        run("INSERT INTO item_variant (id, name, item_link_id, manufacturer_link_id) VALUES ('variant_with_manufacturer', 'Variant with manufacturer', 'item_id', 'manufacturer_a');");
        run("INSERT INTO item_variant (id, name, item_link_id, manufacturer_link_id) VALUES ('variant_no_manufacturer', 'Variant no manufacturer', 'item_id', NULL);");
    }

    fn create_stock_line(connection: &StorageConnection, id: &str, item_variant_id: Option<&str>) {
        let item_variant = match item_variant_id {
            Some(v) => format!("'{v}'"),
            None => "NULL".to_string(),
        };
        execute_sql_with_error(
            connection,
            sql_query(format!(
                r#"
                    INSERT INTO stock_line (id, item_link_id, store_id, pack_size, cost_price_per_pack, sell_price_per_pack, available_number_of_packs, total_number_of_packs, on_hold, item_variant_id)
                    VALUES ('{id}', 'item_id', 'store_id', 1.0, 10.0, 15.0, 100.0, 100.0, false, {item_variant});
                "#
            )),
        )
        .unwrap();
    }

    #[actix_rt::test]
    async fn test_backfill_manufacturer_from_item_variant() {
        let previous_version = V2_16_00.version();
        let version = V2_17_00.version();

        let SetupResult { connection, .. } = setup_test(SetupOption {
            db_name: &format!("migration_manufacturer_{version}"),
            version: Some(previous_version.clone()),
            ..Default::default()
        })
        .await;

        setup_test_dependencies(&connection);

        create_stock_line(
            &connection,
            "sl_with_manufacturer_variant",
            Some("variant_with_manufacturer"),
        );
        create_stock_line(
            &connection,
            "sl_with_no_manufacturer_variant",
            Some("variant_no_manufacturer"),
        );
        create_stock_line(&connection, "sl_no_variant", None);

        migrate(&connection, Some(version.clone())).unwrap();
        assert_eq!(get_database_version(&connection), version);

        let stock_lines = stock_line::table
            .select((
                stock_line::id,
                stock_line::item_variant_id,
                stock_line::manufacturer_link_id,
            ))
            .order_by(stock_line::id.asc())
            .load::<(String, Option<String>, Option<String>)>(connection.lock().connection())
            .unwrap();

        #[rustfmt::skip]
        let expected = vec![
            ("sl_no_variant".to_string(), None, None), 
            ("sl_with_manufacturer_variant".to_string(), Some("variant_with_manufacturer".to_string()), Some("manufacturer_a".to_string())),
            ("sl_with_no_manufacturer_variant".to_string(), Some("variant_no_manufacturer".to_string()), None),
        ];
        assert_eq!(stock_lines, expected);
    }
}
