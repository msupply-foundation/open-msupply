use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "fix_po_linked_inbound_line_prices"
    }

    // Backfills cost / sell / totals on legacy PO-linked external inbound shipment
    // lines whose stored cost was the foreign-currency value (price_per_pack_after_discount)
    // rather than the local-currency value (price_per_pack_after_discount * foreign_exchange_rate).
    // See issue #11186.
    //
    // Predicate is intentionally narrow: only fix lines whose stored cost still equals
    // the PO line's foreign-currency price. Lines that have drifted for any other
    // reason (later PO rate change, manual stock-line edit, etc.) are left alone.
    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                UPDATE invoice_line
                SET
                    sell_price_per_pack = CASE
                        WHEN ABS(invoice_line.sell_price_per_pack - invoice_line.cost_price_per_pack) < 0.000001
                        THEN (
                            SELECT pol.price_per_pack_after_discount * po.foreign_exchange_rate
                            FROM purchase_order_line pol
                            JOIN purchase_order po ON pol.purchase_order_id = po.id
                            WHERE pol.id = invoice_line.purchase_order_line_id
                        )
                        ELSE invoice_line.sell_price_per_pack
                    END,
                    cost_price_per_pack = (
                        SELECT pol.price_per_pack_after_discount * po.foreign_exchange_rate
                        FROM purchase_order_line pol
                        JOIN purchase_order po ON pol.purchase_order_id = po.id
                        WHERE pol.id = invoice_line.purchase_order_line_id
                    ),
                    total_before_tax = (
                        SELECT pol.price_per_pack_after_discount * po.foreign_exchange_rate * invoice_line.number_of_packs
                        FROM purchase_order_line pol
                        JOIN purchase_order po ON pol.purchase_order_id = po.id
                        WHERE pol.id = invoice_line.purchase_order_line_id
                    ),
                    total_after_tax = (
                        SELECT pol.price_per_pack_after_discount * po.foreign_exchange_rate * invoice_line.number_of_packs
                            * (1 + COALESCE(invoice_line.tax_percentage, 0) / 100.0)
                        FROM purchase_order_line pol
                        JOIN purchase_order po ON pol.purchase_order_id = po.id
                        WHERE pol.id = invoice_line.purchase_order_line_id
                    ),
                    foreign_currency_price_before_tax = (
                        SELECT pol.price_per_pack_after_discount * invoice_line.number_of_packs
                        FROM purchase_order_line pol
                        WHERE pol.id = invoice_line.purchase_order_line_id
                    )
                WHERE invoice_line.id IN (
                    SELECT il.id
                    FROM invoice_line il
                    JOIN purchase_order_line pol ON il.purchase_order_line_id = pol.id
                    JOIN purchase_order po ON pol.purchase_order_id = po.id
                    JOIN invoice i ON il.invoice_id = i.id
                    WHERE i.type = 'INBOUND_SHIPMENT'
                      AND i.purchase_order_id IS NOT NULL
                      AND il.type = 'STOCK_IN'
                      AND il.purchase_order_line_id IS NOT NULL
                      AND po.foreign_exchange_rate <> 1.0
                      AND po.foreign_exchange_rate <> 0
                      AND ABS(il.cost_price_per_pack - pol.price_per_pack_after_discount) < 0.000001
                );
            "#
        )?;

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use crate::{
        migrations::{v2_18_00::V2_18_00, v2_19_00::V2_19_00, *},
        test_db::*,
    };
    use diesel::{prelude::*, sql_query, RunQueryDsl};

    table! {
        invoice_line (id) {
            id -> Text,
            cost_price_per_pack -> Double,
            sell_price_per_pack -> Double,
            total_before_tax -> Double,
            total_after_tax -> Double,
            foreign_currency_price_before_tax -> Nullable<Double>,
        }
    }

    fn run(connection: &StorageConnection, sql: &str) {
        sql_query(sql)
            .execute(connection.lock().connection())
            .unwrap();
    }

    fn setup_test_dependencies(connection: &StorageConnection) {
        // Supplier name + store
        run(connection, "INSERT INTO name (id, type, is_customer, is_supplier, code, name) VALUES ('supplier_name', 'FACILITY', false, true, 'SUP1', 'Supplier');");
        run(connection, "INSERT INTO name_link (id, name_id) VALUES ('supplier_name_link', 'supplier_name');");

        run(connection, "INSERT INTO name (id, type, is_customer, is_supplier, code, name) VALUES ('store_name', 'FACILITY', true, false, 'STORE', 'Store');");
        run(connection, "INSERT INTO name_link (id, name_id) VALUES ('store_name_link', 'store_name');");
        run(connection, "INSERT INTO store (id, name_link_id, code, site_id) VALUES ('store_id', 'store_name_link', 'STORE1', 1);");

        // Item
        run(connection, "INSERT INTO item (id, name, code, default_pack_size, type, legacy_record) VALUES ('item_id', 'Item', 'ITEM1', 1.0, 'STOCK', '');");
        run(connection, "INSERT INTO item_link (id, item_id) VALUES ('item_link', 'item_id');");

        // Purchase orders: rate 2.516 (foreign), rate 1.0 (same currency)
        run(connection, "INSERT INTO purchase_order (id, store_id, supplier_name_link_id, purchase_order_number, status, created_datetime, foreign_exchange_rate) VALUES ('po_foreign', 'store_id', 'supplier_name_link', 1, 'NEW', '2026-01-01 00:00:00', 2.516);");
        run(connection, "INSERT INTO purchase_order (id, store_id, supplier_name_link_id, purchase_order_number, status, created_datetime, foreign_exchange_rate) VALUES ('po_same_currency', 'store_id', 'supplier_name_link', 2, 'NEW', '2026-01-01 00:00:00', 1.0);");

        // PO lines: price 84.6 (foreign currency)
        run(connection, "INSERT INTO purchase_order_line (id, purchase_order_id, store_id, line_number, item_link_id, item_name, requested_pack_size, requested_number_of_units, price_per_pack_before_discount, price_per_pack_after_discount, status) VALUES ('pol_foreign', 'po_foreign', 'store_id', 1, 'item_link', 'Item', 1.0, 12.0, 84.6, 84.6, 'NEW');");
        run(connection, "INSERT INTO purchase_order_line (id, purchase_order_id, store_id, line_number, item_link_id, item_name, requested_pack_size, requested_number_of_units, price_per_pack_before_discount, price_per_pack_after_discount, status) VALUES ('pol_same_currency', 'po_same_currency', 'store_id', 1, 'item_link', 'Item', 1.0, 12.0, 84.6, 84.6, 'NEW');");

        // Invoices:
        //   inv_po_linked     - inbound shipment linked to po_foreign
        //   inv_po_same       - inbound shipment linked to po_same_currency
        //   inv_no_po         - inbound shipment with no PO link
        //   inv_outbound      - outbound shipment (irrelevant type)
        run(connection, "INSERT INTO invoice (id, name_link_id, store_id, invoice_number, on_hold, created_datetime, type, status, currency_rate, is_cancellation, purchase_order_id) VALUES ('inv_po_linked', 'supplier_name_link', 'store_id', 1, false, '2026-01-01 00:00:00', 'INBOUND_SHIPMENT', 'NEW', 1.0, false, 'po_foreign');");
        run(connection, "INSERT INTO invoice (id, name_link_id, store_id, invoice_number, on_hold, created_datetime, type, status, currency_rate, is_cancellation, purchase_order_id) VALUES ('inv_po_same', 'supplier_name_link', 'store_id', 2, false, '2026-01-01 00:00:00', 'INBOUND_SHIPMENT', 'NEW', 1.0, false, 'po_same_currency');");
        run(connection, "INSERT INTO invoice (id, name_link_id, store_id, invoice_number, on_hold, created_datetime, type, status, currency_rate, is_cancellation) VALUES ('inv_no_po', 'supplier_name_link', 'store_id', 3, false, '2026-01-01 00:00:00', 'INBOUND_SHIPMENT', 'NEW', 1.0, false);");
        run(connection, "INSERT INTO invoice (id, name_link_id, store_id, invoice_number, on_hold, created_datetime, type, status, currency_rate, is_cancellation, purchase_order_id) VALUES ('inv_outbound', 'supplier_name_link', 'store_id', 4, false, '2026-01-01 00:00:00', 'OUTBOUND_SHIPMENT', 'NEW', 1.0, false, 'po_foreign');");
    }

    #[allow(clippy::too_many_arguments)]
    fn create_invoice_line(
        connection: &StorageConnection,
        id: &str,
        invoice_id: &str,
        purchase_order_line_id: Option<&str>,
        line_type: &str,
        cost: f64,
        sell: f64,
        number_of_packs: f64,
    ) {
        let pol = match purchase_order_line_id {
            Some(v) => format!("'{v}'"),
            None => "NULL".to_string(),
        };
        let total = cost * number_of_packs;
        run(
            connection,
            &format!(
                "INSERT INTO invoice_line (id, invoice_id, item_link_id, item_name, item_code, type, \
                 cost_price_per_pack, sell_price_per_pack, total_before_tax, total_after_tax, \
                 number_of_packs, pack_size, foreign_currency_price_before_tax, purchase_order_line_id) \
                 VALUES ('{id}', '{invoice_id}', 'item_link', 'Item', 'ITEM1', '{line_type}', \
                 {cost}, {sell}, {total}, {total}, {number_of_packs}, 1.0, {cost}, {pol});"
            ),
        );
    }

    fn approx(a: f64, b: f64) -> bool {
        (a - b).abs() < 1e-6
    }

    #[actix_rt::test]
    async fn test_fix_po_linked_inbound_line_prices() {
        let previous_version = V2_18_00.version();
        let version = V2_19_00.version();

        let SetupResult { connection, .. } = setup_test(SetupOption {
            db_name: &format!("migration_fix_po_linked_inbound_line_prices_{version}"),
            version: Some(previous_version.clone()),
            ..Default::default()
        })
        .await;

        setup_test_dependencies(&connection);

        // (1) Broken legacy row: stored as foreign value; should be corrected.
        create_invoice_line(&connection, "il_broken", "inv_po_linked", Some("pol_foreign"), "STOCK_IN", 84.6, 84.6, 12.0);
        // (2) Already-correct row: stored as local value; should be untouched.
        create_invoice_line(&connection, "il_correct", "inv_po_linked", Some("pol_foreign"), "STOCK_IN", 212.85, 212.85, 12.0);
        // (3) Customised sell price; cost broken; cost fixed but sell preserved.
        create_invoice_line(&connection, "il_custom_sell", "inv_po_linked", Some("pol_foreign"), "STOCK_IN", 84.6, 99.0, 12.0);
        // (4) Same-currency PO (rate 1.0); even though cost == foreign price, predicate excludes it.
        create_invoice_line(&connection, "il_same_currency", "inv_po_same", Some("pol_same_currency"), "STOCK_IN", 84.6, 84.6, 12.0);
        // (5) Inbound shipment line with no PO link; untouched.
        create_invoice_line(&connection, "il_no_po", "inv_no_po", None, "STOCK_IN", 84.6, 84.6, 12.0);
        // (6) Outbound shipment line linked to PO somehow (unusual); type mismatch excludes it.
        create_invoice_line(&connection, "il_outbound", "inv_outbound", Some("pol_foreign"), "STOCK_OUT", 84.6, 84.6, 12.0);

        migrate(&connection, Some(version.clone())).unwrap();
        assert_eq!(get_database_version(&connection), version);

        let rows = invoice_line::table
            .select((
                invoice_line::id,
                invoice_line::cost_price_per_pack,
                invoice_line::sell_price_per_pack,
                invoice_line::total_before_tax,
                invoice_line::total_after_tax,
                invoice_line::foreign_currency_price_before_tax,
            ))
            .order_by(invoice_line::id.asc())
            .load::<(String, f64, f64, f64, f64, Option<f64>)>(connection.lock().connection())
            .unwrap();

        let by_id = |id: &str| rows.iter().find(|r| r.0 == id).expect("row missing");

        // (1) Broken row corrected. cost = 84.6 * 2.516 = 212.8536; sell tracks cost.
        let r = by_id("il_broken");
        let expected_cost = 84.6 * 2.516;
        assert!(approx(r.1, expected_cost), "il_broken cost = {}", r.1);
        assert!(approx(r.2, expected_cost), "il_broken sell = {}", r.2);
        assert!(approx(r.3, expected_cost * 12.0), "il_broken total_before_tax = {}", r.3);
        assert!(approx(r.4, expected_cost * 12.0), "il_broken total_after_tax = {}", r.4);
        assert!(approx(r.5.unwrap(), 84.6 * 12.0), "il_broken foreign = {:?}", r.5);

        // (2) Already-correct row untouched.
        let r = by_id("il_correct");
        assert!(approx(r.1, 212.85), "il_correct cost = {}", r.1);
        assert!(approx(r.2, 212.85), "il_correct sell = {}", r.2);
        assert!(approx(r.3, 212.85 * 12.0), "il_correct total = {}", r.3);

        // (3) Cost fixed, sell preserved.
        let r = by_id("il_custom_sell");
        assert!(approx(r.1, expected_cost), "il_custom_sell cost = {}", r.1);
        assert!(approx(r.2, 99.0), "il_custom_sell sell = {}", r.2);

        // (4) Same-currency PO untouched.
        let r = by_id("il_same_currency");
        assert!(approx(r.1, 84.6), "il_same_currency cost = {}", r.1);
        assert!(approx(r.2, 84.6), "il_same_currency sell = {}", r.2);

        // (5) Non-PO inbound line untouched.
        let r = by_id("il_no_po");
        assert!(approx(r.1, 84.6), "il_no_po cost = {}", r.1);

        // (6) Outbound line untouched.
        let r = by_id("il_outbound");
        assert!(approx(r.1, 84.6), "il_outbound cost = {}", r.1);
    }
}
