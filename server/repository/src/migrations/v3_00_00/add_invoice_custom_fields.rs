use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_invoice_custom_fields"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
            ALTER TABLE invoice ADD COLUMN custom_fields {JSONB};
            "#
        )?;

        // Backfill from legacy `transact.category_ID` (and, for prescriptions,
        // `category2_ID` — OG's "pi2" Patient Type dimension) already sitting in
        // sync_buffer: invoices were integrated before the invoice translator
        // mapped the categories, and (unlike central data) transact records
        // don't re-flow from OG, so without this the historical values would
        // stay empty. The JSONB key is per invoice type, matching the per-type
        // category mapping custom_fields (keyed `<type>_category`) seeded by
        // `central_mapping_custom_fields` and written by the invoice translator.
        //
        // Same approach as `add_legacy_goods_received_link_fields`: temporary
        // sync_buffer index for the join, and the UPDATE written out per backend
        // (JSON construction/extraction syntax differs).
        //
        // The type→key CASE below mirrors the service's
        // `category_key_for_invoice_type` (whose copies are kept in lock-step by
        // the `transaction_category_mappings_stay_in_lock_step` test). It can't
        // be derived here (repository crate, frozen SQL) — if a future invoice
        // type gains a category, it needs its own backfill migration; this one
        // must not be edited once shipped.
        //
        // NOTE: a migration UPDATE emits no changelog, so on COMS the backfilled
        // value reaches an already-initialised v7 remote only when the invoice
        // next changes. Remotes that hold their own transact sync_buffer rows
        // (OG-initialised) backfill themselves when they run this migration.
        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                CREATE INDEX tmp_sync_buffer_transact_category
                    ON sync_buffer (record_id, table_name);

                UPDATE invoice
                SET custom_fields = jsonb_build_object(
                    CASE invoice.type::text
                        WHEN 'INBOUND_SHIPMENT' THEN 'inbound_shipment_category'
                        WHEN 'OUTBOUND_SHIPMENT' THEN 'outbound_shipment_category'
                        WHEN 'PRESCRIPTION' THEN 'prescription_category'
                        WHEN 'SUPPLIER_RETURN' THEN 'supplier_return_category'
                        WHEN 'CUSTOMER_RETURN' THEN 'customer_return_category'
                    END,
                    NULLIF(sb.data::jsonb ->> 'category_ID', '')
                )
                FROM sync_buffer sb
                WHERE sb.record_id = invoice.id
                  AND sb.table_name = 'transact'
                  AND invoice.custom_fields IS NULL
                  AND invoice.type::text IN (
                      'INBOUND_SHIPMENT', 'OUTBOUND_SHIPMENT', 'PRESCRIPTION',
                      'SUPPLIER_RETURN', 'CUSTOMER_RETURN'
                  )
                  AND NULLIF(sb.data::jsonb ->> 'category_ID', '') IS NOT NULL;

                -- Second prescription dimension: merge into the blob the first
                -- UPDATE may have created (json merge, not overwrite).
                UPDATE invoice
                SET custom_fields = COALESCE(invoice.custom_fields, '{{}}'::jsonb)
                    || jsonb_build_object(
                        'prescription_category_2',
                        NULLIF(sb.data::jsonb ->> 'category2_ID', '')
                    )
                FROM sync_buffer sb
                WHERE sb.record_id = invoice.id
                  AND sb.table_name = 'transact'
                  AND invoice.type::text = 'PRESCRIPTION'
                  AND NULLIF(sb.data::jsonb ->> 'category2_ID', '') IS NOT NULL;

                DROP INDEX tmp_sync_buffer_transact_category;
                "#
            )?;
        } else {
            sql!(
                connection,
                r#"
                CREATE INDEX tmp_sync_buffer_transact_category
                    ON sync_buffer (record_id, table_name);

                UPDATE invoice
                SET custom_fields = json_object(
                    CASE invoice.type
                        WHEN 'INBOUND_SHIPMENT' THEN 'inbound_shipment_category'
                        WHEN 'OUTBOUND_SHIPMENT' THEN 'outbound_shipment_category'
                        WHEN 'PRESCRIPTION' THEN 'prescription_category'
                        WHEN 'SUPPLIER_RETURN' THEN 'supplier_return_category'
                        WHEN 'CUSTOMER_RETURN' THEN 'customer_return_category'
                    END,
                    NULLIF(json_extract(sb.data, '$.category_ID'), '')
                )
                FROM sync_buffer sb
                WHERE sb.record_id = invoice.id
                  AND sb.table_name = 'transact'
                  AND invoice.custom_fields IS NULL
                  AND invoice.type IN (
                      'INBOUND_SHIPMENT', 'OUTBOUND_SHIPMENT', 'PRESCRIPTION',
                      'SUPPLIER_RETURN', 'CUSTOMER_RETURN'
                  )
                  AND NULLIF(json_extract(sb.data, '$.category_ID'), '') IS NOT NULL;

                -- Second prescription dimension: merge into the blob the first
                -- UPDATE may have created (json merge, not overwrite).
                UPDATE invoice
                SET custom_fields = json_set(
                    COALESCE(invoice.custom_fields, '{{}}'),
                    '$.prescription_category_2',
                    NULLIF(json_extract(sb.data, '$.category2_ID'), '')
                )
                FROM sync_buffer sb
                WHERE sb.record_id = invoice.id
                  AND sb.table_name = 'transact'
                  AND invoice.type = 'PRESCRIPTION'
                  AND NULLIF(json_extract(sb.data, '$.category2_ID'), '') IS NOT NULL;

                DROP INDEX tmp_sync_buffer_transact_category;
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

    /// Minimal raw insert so the test is independent of which optional columns
    /// sync_buffer has before `rebuild_sync_buffer` (same helper as the
    /// goods_received backfill test).
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

    /// Read back via CAST so the same query works on both backends (the column
    /// is `jsonb` on Postgres, TEXT JSON on SQLite).
    #[derive(QueryableByName)]
    struct CustomFieldsRow {
        #[diesel(sql_type = diesel::sql_types::Nullable<Text>)]
        custom_fields: Option<String>,
    }

    #[actix_rt::test]
    async fn migration_add_invoice_custom_fields() {
        let previous_version = v2_18_00::V2_18_00.version();
        let version = v3_00_00::V3_00_00.version();

        let SetupResult { connection, .. } = setup_test(SetupOption {
            db_name: &format!("migration_{version}_add_invoice_custom_fields"),
            version: Some(previous_version),
            ..Default::default()
        })
        .await;

        sql!(
            &connection,
            r#"
            INSERT INTO name (id, type, is_customer, is_supplier, code, name)
                VALUES ('name_id', 'STORE', false, false, '', '');
            INSERT INTO name_link (id, name_id) VALUES ('name_link_id', 'name_id');
            INSERT INTO store (id, name_link_id, site_id, code)
                VALUES ('store_id', 'name_link_id', 1, '');

            INSERT INTO invoice (id, name_link_id, store_id, invoice_number, type, status, on_hold, created_datetime)
                VALUES ('invoice_si', 'name_link_id', 'store_id', 1, 'INBOUND_SHIPMENT', 'NEW', false, '2024-01-01 00:00:00');
            INSERT INTO invoice (id, name_link_id, store_id, invoice_number, type, status, on_hold, created_datetime)
                VALUES ('invoice_ci', 'name_link_id', 'store_id', 2, 'OUTBOUND_SHIPMENT', 'NEW', false, '2024-01-01 00:00:00');
            INSERT INTO invoice (id, name_link_id, store_id, invoice_number, type, status, on_hold, created_datetime)
                VALUES ('invoice_empty', 'name_link_id', 'store_id', 3, 'INBOUND_SHIPMENT', 'NEW', false, '2024-01-01 00:00:00');
            INSERT INTO invoice (id, name_link_id, store_id, invoice_number, type, status, on_hold, created_datetime)
                VALUES ('invoice_repack', 'name_link_id', 'store_id', 4, 'REPACK', 'NEW', false, '2024-01-01 00:00:00');
            INSERT INTO invoice (id, name_link_id, store_id, invoice_number, type, status, on_hold, created_datetime)
                VALUES ('invoice_rx', 'name_link_id', 'store_id', 5, 'PRESCRIPTION', 'NEW', false, '2024-01-01 00:00:00');
            "#
        )
        .unwrap();

        // positive (si + ci), empty category (must stay NULL), unsupported type
        // (REPACK, must stay NULL even with a category in the buffer), and a
        // prescription with both dimensions (category2 must MERGE into the blob
        // the category_ID backfill creates, not overwrite it). category2_ID on
        // a non-prescription (si) must be ignored.
        insert_sync_buffer_row(
            &connection,
            "invoice_si",
            "transact",
            r#"{"ID":"invoice_si","category_ID":"cat_si","category2_ID":"cat_pi2"}"#,
        );
        insert_sync_buffer_row(
            &connection,
            "invoice_ci",
            "transact",
            r#"{"ID":"invoice_ci","category_ID":"cat_ci"}"#,
        );
        insert_sync_buffer_row(
            &connection,
            "invoice_empty",
            "transact",
            r#"{"ID":"invoice_empty","category_ID":""}"#,
        );
        insert_sync_buffer_row(
            &connection,
            "invoice_repack",
            "transact",
            r#"{"ID":"invoice_repack","category_ID":"cat_sr"}"#,
        );
        insert_sync_buffer_row(
            &connection,
            "invoice_rx",
            "transact",
            r#"{"ID":"invoice_rx","category_ID":"cat_pi","category2_ID":"cat_pi2"}"#,
        );

        migrate(&connection, Some(version), MigrationConfig::default()).unwrap();

        let value = |id: &str| {
            sql_query("SELECT CAST(custom_fields AS TEXT) AS custom_fields FROM invoice WHERE id = $1")
                .bind::<Text, _>(id)
                .get_result::<CustomFieldsRow>(connection.lock().connection())
                .unwrap()
                .custom_fields
                .map(|raw| serde_json::from_str::<serde_json::Value>(&raw).unwrap())
        };
        assert_eq!(
            value("invoice_si"),
            Some(serde_json::json!({ "inbound_shipment_category": "cat_si" })),
            "category2_ID on a non-prescription must be ignored"
        );
        assert_eq!(
            value("invoice_ci"),
            Some(serde_json::json!({ "outbound_shipment_category": "cat_ci" }))
        );
        assert_eq!(value("invoice_empty"), None);
        assert_eq!(value("invoice_repack"), None);
        assert_eq!(
            value("invoice_rx"),
            Some(serde_json::json!({
                "prescription_category": "cat_pi",
                "prescription_category_2": "cat_pi2",
            }))
        );
    }
}
