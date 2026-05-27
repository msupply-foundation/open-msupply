use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_legacy_goods_received_link_fields"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        // Internal-only columns (never synced). Used by the goods_received translator
        // to find the invoice / invoice_line a finalised GR spawned via legacy fields
        // `transact.goods_received_ID` and `trans_line.goods_received_lines_ID`. See
        // https://github.com/msupply-foundation/open-msupply/issues/11829
        sql!(
            connection,
            r#"
            ALTER TABLE invoice ADD COLUMN legacy_goods_received_id TEXT;
            ALTER TABLE invoice_line ADD COLUMN legacy_goods_received_line_id TEXT;

            CREATE INDEX index_invoice_legacy_goods_received_id
                ON invoice (legacy_goods_received_id)
                WHERE legacy_goods_received_id IS NOT NULL;
            CREATE INDEX index_invoice_line_legacy_goods_received_line_id
                ON invoice_line (legacy_goods_received_line_id)
                WHERE legacy_goods_received_line_id IS NOT NULL;
            "#
        )?;

        // Backfill from existing sync_buffer rows. sync_buffer has no
        // record_id/table_name index after `rebuild_sync_buffer`, so create a
        // temporary one to keep the join fast on large buffers.
        //
        // JSON extraction syntax differs between backends, so the UPDATE is
        // written out twice rather than templated — two readable SQL blocks
        // beat a hand-rolled abstraction.
        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                CREATE INDEX tmp_sync_buffer_record_id_table_name
                    ON sync_buffer (record_id, table_name);

                UPDATE invoice
                SET legacy_goods_received_id = NULLIF(sb.data::jsonb ->> 'goods_received_ID', '')
                FROM sync_buffer sb
                WHERE sb.record_id = invoice.id
                  AND sb.table_name = 'transact'
                  AND invoice.legacy_goods_received_id IS NULL
                  AND NULLIF(sb.data::jsonb ->> 'goods_received_ID', '') IS NOT NULL;

                UPDATE invoice_line
                SET legacy_goods_received_line_id = NULLIF(sb.data::jsonb ->> 'goods_received_lines_ID', '')
                FROM sync_buffer sb
                WHERE sb.record_id = invoice_line.id
                  AND sb.table_name = 'trans_line'
                  AND invoice_line.legacy_goods_received_line_id IS NULL
                  AND NULLIF(sb.data::jsonb ->> 'goods_received_lines_ID', '') IS NOT NULL;

                DROP INDEX tmp_sync_buffer_record_id_table_name;
                "#
            )?;
        } else {
            sql!(
                connection,
                r#"
                CREATE INDEX tmp_sync_buffer_record_id_table_name
                    ON sync_buffer (record_id, table_name);

                UPDATE invoice
                SET legacy_goods_received_id = NULLIF(json_extract(sb.data, '$.goods_received_ID'), '')
                FROM sync_buffer sb
                WHERE sb.record_id = invoice.id
                  AND sb.table_name = 'transact'
                  AND invoice.legacy_goods_received_id IS NULL
                  AND NULLIF(json_extract(sb.data, '$.goods_received_ID'), '') IS NOT NULL;

                UPDATE invoice_line
                SET legacy_goods_received_line_id = NULLIF(json_extract(sb.data, '$.goods_received_lines_ID'), '')
                FROM sync_buffer sb
                WHERE sb.record_id = invoice_line.id
                  AND sb.table_name = 'trans_line'
                  AND invoice_line.legacy_goods_received_line_id IS NULL
                  AND NULLIF(json_extract(sb.data, '$.goods_received_lines_ID'), '') IS NOT NULL;

                DROP INDEX tmp_sync_buffer_record_id_table_name;
                "#
            )?;
        }

        Ok(())
    }
}

#[cfg(test)]
mod test {
    use crate::migrations::*;
    use crate::test_db::*;
    use diesel::{prelude::*, sql_query, sql_types::Text};

    /// Insert a minimal sync_buffer row using `diesel::sql_query` so the test
    /// works against either backend regardless of which optional columns the
    /// table has at the time the rows are inserted (the schema before
    /// `rebuild_sync_buffer` is intentionally narrow).
    fn insert_sync_buffer_row(
        connection: &StorageConnection,
        record_id: &str,
        table_name: &str,
        data: &str,
    ) {
        sql_query(
            "INSERT INTO sync_buffer (record_id, received_datetime, integration_datetime, \
             table_name, action, data) \
             VALUES ($1, '2024-01-01 00:00:00', '2024-01-01 00:00:00', $2, 'UPSERT', $3)",
        )
        .bind::<Text, _>(record_id)
        .bind::<Text, _>(table_name)
        .bind::<Text, _>(data)
        .execute(connection.lock().connection())
        .unwrap();
    }

    table! {
        invoice (id) {
            id -> Text,
            legacy_goods_received_id -> Nullable<Text>,
        }
    }

    table! {
        invoice_line (id) {
            id -> Text,
            legacy_goods_received_line_id -> Nullable<Text>,
        }
    }

    #[actix_rt::test]
    async fn migration_add_legacy_goods_received_link_fields() {
        // Start at the version before our migration runs and seed enough rows
        // for the FK targets to exist, then migrate forward through v3_00_00
        // (which includes our fragment) and assert the backfill outcomes.
        let previous_version = v2_18_00::V2_18_00.version();
        let version = v3_00_00::V3_00_00.version();

        let SetupResult { connection, .. } = setup_test(SetupOption {
            db_name: &format!("migration_{version}_legacy_goods_received_link_fields"),
            version: Some(previous_version),
            ..Default::default()
        })
        .await;

        // Minimal fixtures: name/store/item link chains, two invoices, two
        // invoice_lines. Two of the four target rows are intentional negative
        // cases (no matching sync_buffer row → must stay NULL).
        sql!(
            &connection,
            r#"
            INSERT INTO name (id, type, is_customer, is_supplier, code, name)
                VALUES ('name_id', 'STORE', false, false, '', '');
            INSERT INTO name_link (id, name_id) VALUES ('name_link_id', 'name_id');
            INSERT INTO store (id, name_link_id, site_id, code)
                VALUES ('store_id', 'name_link_id', 1, '');
            INSERT INTO unit (id, name, "index", is_active)
                VALUES ('unit_id', 'Unit', 1, true);
            INSERT INTO item (id, name, code, default_pack_size, type, is_active, legacy_record)
                VALUES ('item_id', 'Item', 'ITEM', 1, 'STOCK', true, '');
            INSERT INTO item_link (id, item_id) VALUES ('item_link_id', 'item_id');

            INSERT INTO invoice (id, name_link_id, store_id, invoice_number, type, status, on_hold, created_datetime)
                VALUES ('invoice_positive', 'name_link_id', 'store_id', 1, 'INBOUND_SHIPMENT', 'NEW', false, '2024-01-01 00:00:00');
            INSERT INTO invoice (id, name_link_id, store_id, invoice_number, type, status, on_hold, created_datetime)
                VALUES ('invoice_empty', 'name_link_id', 'store_id', 2, 'INBOUND_SHIPMENT', 'NEW', false, '2024-01-01 00:00:00');

            INSERT INTO invoice_line (id, invoice_id, item_link_id, pack_size, number_of_packs, item_name, item_code, sell_price_per_pack, total_before_tax, total_after_tax, cost_price_per_pack, type)
                VALUES ('invoice_line_positive', 'invoice_positive', 'item_link_id', 1, 1.0, 'Item', 'ITEM', 0.0, 0.0, 0.0, 0.0, 'STOCK_IN');
            INSERT INTO invoice_line (id, invoice_id, item_link_id, pack_size, number_of_packs, item_name, item_code, sell_price_per_pack, total_before_tax, total_after_tax, cost_price_per_pack, type)
                VALUES ('invoice_line_empty', 'invoice_positive', 'item_link_id', 1, 1.0, 'Item', 'ITEM', 0.0, 0.0, 0.0, 0.0, 'STOCK_IN');
            "#
        )
        .unwrap();

        // sync_buffer fixtures:
        //   - positive  : real GR ID, must populate the new column.
        //   - empty     : empty-string GR ID, NULLIF guard must keep target NULL.
        //   - dangling  : no matching invoice/invoice_line, must be a no-op.
        insert_sync_buffer_row(
            &connection,
            "invoice_positive",
            "transact",
            r#"{"ID":"invoice_positive","goods_received_ID":"gr_id_positive"}"#,
        );
        insert_sync_buffer_row(
            &connection,
            "invoice_empty",
            "transact",
            r#"{"ID":"invoice_empty","goods_received_ID":""}"#,
        );
        insert_sync_buffer_row(
            &connection,
            "invoice_dangling",
            "transact",
            r#"{"ID":"invoice_dangling","goods_received_ID":"gr_id_dangling"}"#,
        );
        insert_sync_buffer_row(
            &connection,
            "invoice_line_positive",
            "trans_line",
            r#"{"ID":"invoice_line_positive","goods_received_lines_ID":"gr_line_id_positive"}"#,
        );
        insert_sync_buffer_row(
            &connection,
            "invoice_line_empty",
            "trans_line",
            r#"{"ID":"invoice_line_empty","goods_received_lines_ID":""}"#,
        );

        migrate(&connection, Some(version), MigrationConfig::default()).unwrap();

        // Invoices: positive populated, empty stayed NULL, dangling was a no-op.
        let mut invoices = invoice::table
            .select((invoice::id, invoice::legacy_goods_received_id))
            .load::<(String, Option<String>)>(connection.lock().connection())
            .unwrap();
        invoices.sort();
        assert_eq!(
            invoices,
            vec![
                ("invoice_empty".to_string(), None),
                (
                    "invoice_positive".to_string(),
                    Some("gr_id_positive".to_string()),
                ),
            ],
        );

        // Invoice lines: same matrix on the line side.
        let mut lines = invoice_line::table
            .select((invoice_line::id, invoice_line::legacy_goods_received_line_id))
            .load::<(String, Option<String>)>(connection.lock().connection())
            .unwrap();
        lines.sort();
        assert_eq!(
            lines,
            vec![
                ("invoice_line_empty".to_string(), None),
                (
                    "invoice_line_positive".to_string(),
                    Some("gr_line_id_positive".to_string()),
                ),
            ],
        );

        // Temp index must be dropped, partial indexes must be present.
        #[derive(QueryableByName)]
        struct NameRow {
            #[diesel(sql_type = Text)]
            name: String,
        }
        let index_lookup = if cfg!(feature = "postgres") {
            "SELECT indexname AS name FROM pg_indexes WHERE indexname = $1"
        } else {
            "SELECT name FROM sqlite_master WHERE type = 'index' AND name = $1"
        };
        let lookup = |name: &str| -> Option<String> {
            sql_query(index_lookup)
                .bind::<Text, _>(name)
                .get_result::<NameRow>(connection.lock().connection())
                .optional()
                .unwrap()
                .map(|r| r.name)
        };
        assert!(
            lookup("tmp_sync_buffer_record_id_table_name").is_none(),
            "temporary sync_buffer index should have been dropped"
        );
        assert!(lookup("index_invoice_legacy_goods_received_id").is_some());
        assert!(lookup("index_invoice_line_legacy_goods_received_line_id").is_some());
    }
}
