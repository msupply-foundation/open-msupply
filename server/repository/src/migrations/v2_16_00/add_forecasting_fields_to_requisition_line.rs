use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_forecasting_fields_to_requisition_line"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                ALTER TABLE requisition_line ADD COLUMN forecast_total_units {DOUBLE};
                ALTER TABLE requisition_line ADD COLUMN forecast_total_doses {DOUBLE};
                ALTER TABLE requisition_line ADD COLUMN vaccine_courses TEXT;
            "#
        )?;

        // Migrate existing forecasting plugin data to the new columns
        #[cfg(not(feature = "postgres"))]
        sql!(
            connection,
            r#"
                UPDATE requisition_line 
                SET 
                    forecast_total_units = CASE 
                        WHEN json_extract(latest_plugin_data.data, '$.forecastTotalUnits') IS NOT NULL 
                        THEN CAST(json_extract(latest_plugin_data.data, '$.forecastTotalUnits') AS REAL)
                        ELSE NULL 
                    END,
                    forecast_total_doses = CASE 
                        WHEN json_extract(latest_plugin_data.data, '$.forecastTotalDoses') IS NOT NULL 
                        THEN CAST(json_extract(latest_plugin_data.data, '$.forecastTotalDoses') AS REAL)
                        ELSE NULL 
                    END,
                    vaccine_courses = json_extract(latest_plugin_data.data, '$.vaccineCourses')
                FROM (
                    SELECT pd.related_record_id, pd.data,
                           ROW_NUMBER() OVER (PARTITION BY pd.related_record_id ORDER BY pd.id DESC) as latest
                    FROM plugin_data pd
                    WHERE pd.plugin_code IN ('forecasting_plugins')
                ) latest_plugin_data
                WHERE latest_plugin_data.related_record_id = requisition_line.id 
                    AND latest_plugin_data.latest = 1;
            "#
        )?;

        #[cfg(feature = "postgres")]
        sql!(
            connection,
            r#"
                UPDATE requisition_line 
                SET 
                    forecast_total_units = CASE 
                        WHEN (latest_plugin_data.data::json->>'forecastTotalUnits') IS NOT NULL 
                        THEN CAST((latest_plugin_data.data::json->>'forecastTotalUnits') AS DOUBLE PRECISION)
                        ELSE NULL 
                    END,
                    forecast_total_doses = CASE 
                        WHEN (latest_plugin_data.data::json->>'forecastTotalDoses') IS NOT NULL 
                        THEN CAST((latest_plugin_data.data::json->>'forecastTotalDoses') AS DOUBLE PRECISION)
                        ELSE NULL 
                    END,
                    vaccine_courses = (latest_plugin_data.data::json->>'vaccineCourses')
                FROM (
                    SELECT pd.related_record_id, pd.data,
                           ROW_NUMBER() OVER (PARTITION BY pd.related_record_id ORDER BY pd.id DESC) as latest
                    FROM plugin_data pd
                    WHERE pd.plugin_code IN ('forecasting_plugins')
                ) latest_plugin_data
                WHERE latest_plugin_data.related_record_id = requisition_line.id 
                    AND latest_plugin_data.latest = 1;
            "#
        )?;

        sql!(
            connection,
            r#"
                DELETE FROM plugin_data 
                WHERE plugin_code IN ('forecasting_plugins');
                DELETE FROM backend_plugin WHERE code IN ('forecasting_plugins');
            "#
        )?;

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db_diesel::backend_plugin_row::backend_plugin;
    use crate::db_diesel::plugin_data_row::plugin_data;
    use crate::db_diesel::requisition_line_row::requisition_line;
    use crate::{
        migrations::{v2_15_00::V2_15_00, v2_16_00::V2_16_00},
        test_db::*,
    };
    use diesel::{sql_query, ExpressionMethods, QueryDsl, RunQueryDsl};
    use util::uuid::uuid;

    fn setup_test_dependencies(connection: &StorageConnection) {
        let run = |sql: &str| {
            sql_query(sql)
                .execute(connection.lock().connection())
                .unwrap()
        };

        run("INSERT INTO name (id, type, is_customer, is_supplier, code, name) VALUES ('store_name_id', 'FACILITY', true, false, 'STORE1', 'Test Store');");
        run("INSERT INTO name_link (id, name_id) VALUES ('store_name_link_id', 'store_name_id');");
        run("INSERT INTO store (id, name_link_id, code, site_id) VALUES ('store_id', 'store_name_link_id', 'STORE1', 1);");

        run("INSERT INTO item (id, name, code, default_pack_size, type, legacy_record) VALUES ('item_id', 'Test Item', 'ITEM1', 1.0, 'STOCK', '');");
        run("INSERT INTO item_link (id, item_id) VALUES ('item_link_id', 'item_id');");

        run("INSERT INTO name (id, type, is_customer, is_supplier, code, name) VALUES ('requisition_name_id', 'FACILITY', true, false, 'REQ1', 'Test Requisition');");
        run("INSERT INTO name_link (id, name_id) VALUES ('requisition_name_link_id', 'requisition_name_id');");
        run("INSERT INTO requisition (id, requisition_number, name_link_id, store_id, type, status, created_datetime, sent_datetime, max_months_of_stock, min_months_of_stock, is_emergency) VALUES ('requisition_id', 1, 'requisition_name_link_id', 'store_id', 'REQUEST', 'NEW', '2023-01-01 00:00:00', NULL, 6.0, 1.0, false);");
    }

    fn create_requisition_line_without_forecasting(connection: &StorageConnection, id: &str) {
        sql_query(format!(
            r#"
                INSERT INTO requisition_line (
                    id, requisition_id, item_link_id, item_name, requested_quantity, 
                    suggested_quantity, supply_quantity, available_stock_on_hand, 
                    average_monthly_consumption, approved_quantity, initial_stock_on_hand_units, 
                    incoming_units, outgoing_units, loss_in_units, addition_in_units, 
                    expiring_units, days_out_of_stock
                )
                VALUES (
                    '{id}', 'requisition_id', 'item_link_id', 'Test Item', 10.0, 
                    8.0, 5.0, 20.0, 15.0, 7.0, 25.0, 3.0, 2.0, 1.0, 0.0, 5.0, 2.0
                );
            "#
        ))
        .execute(connection.lock().connection())
        .unwrap();
    }

    fn create_plugin_data(
        connection: &StorageConnection,
        plugin_data_id: String,
        related_record_id: &str,
        plugin_code: &str,
        data: &str,
    ) {
        sql_query(format!(
            r#"
                INSERT INTO plugin_data (
                    id, store_id, plugin_code, related_record_id, data_identifier, data
                )
                VALUES (
                    '{plugin_data_id}', 'store_id', '{plugin_code}', '{related_record_id}', 'forecasting_data', '{data}'
                );
            "#
        ))
        .execute(connection.lock().connection())
        .unwrap();
    }

    #[actix_rt::test]
    async fn test_add_forecasting_fields_migration() {
        let previous_version = V2_15_00.version();
        let version = V2_16_00.version();

        let SetupResult { connection, .. } = setup_test(SetupOption {
            db_name: &format!("migration_forecasting_{version}"),
            version: Some(previous_version.clone()),
            ..Default::default()
        })
        .await;

        setup_test_dependencies(&connection);

        create_requisition_line_without_forecasting(&connection, "req_line_1");
        create_requisition_line_without_forecasting(&connection, "req_line_2");
        create_requisition_line_without_forecasting(&connection, "req_line_3");
        create_requisition_line_without_forecasting(&connection, "req_line_4");

        sql_query(
            "INSERT INTO backend_plugin (id, code, bundle_base64, types, variant_type) VALUES ('forecasting_plugin_id', 'forecasting_plugins', '', '[]', 'BOA_JS')"
        )
        .execute(connection.lock().connection())
        .unwrap();

        create_plugin_data(
            &connection,
            uuid(),
            "req_line_1",
            "forecasting_plugins",
            r#"{"forecastTotalUnits": 999.0, "forecastTotalDoses": 888.0, "vaccineCourses": "old_course"}"#,
        );

        std::thread::sleep(std::time::Duration::from_millis(100));

        create_plugin_data(
            &connection,
            uuid(),
            "req_line_1",
            "forecasting_plugins",
            r#"{"forecastTotalUnits": 100.5, "forecastTotalDoses": 200.25, "vaccineCourses": "course1,course2"}"#,
        );

        create_plugin_data(
            &connection,
            uuid(),
            "req_line_2",
            "forecasting_plugins",
            r#"{"forecastTotalUnits": 50.0, "forecastTotalDoses": 75.5}"#,
        );

        create_plugin_data(
            &connection,
            uuid(),
            "req_line_3",
            "forecasting_plugins",
            r#"{}"#,
        );

        migrate(&connection, Some(version.clone())).unwrap();
        assert_eq!(get_database_version(&connection), version);

        let results = requisition_line::table
            .select((
                requisition_line::id,
                requisition_line::forecast_total_units,
                requisition_line::forecast_total_doses,
                requisition_line::vaccine_courses,
            ))
            .order(requisition_line::id.asc())
            .load::<(String, Option<f64>, Option<f64>, Option<String>)>(
                connection.lock().connection(),
            )
            .unwrap();

        let expected = vec![
            (
                "req_line_1".to_string(),
                Some(100.5),
                Some(200.25),
                Some("course1,course2".to_string()),
            ),
            ("req_line_2".to_string(), Some(50.0), Some(75.5), None),
            ("req_line_3".to_string(), None, None, None),
            ("req_line_4".to_string(), None, None, None),
        ];

        assert_eq!(results, expected);

        let remaining_plugin_data_count: i64 = plugin_data::table
            .filter(plugin_data::plugin_code.eq("forecasting_plugins"))
            .count()
            .get_result(connection.lock().connection())
            .unwrap();

        assert_eq!(remaining_plugin_data_count, 0);

        let remaining_backend_plugin_count: i64 = backend_plugin::table
            .filter(backend_plugin::code.eq("forecasting_plugins"))
            .count()
            .get_result(connection.lock().connection())
            .unwrap();

        assert_eq!(remaining_backend_plugin_count, 0);
    }
}
