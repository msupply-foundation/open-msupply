use crate::migrations::*;

/// Generalises the v2.17.00 population-only forecasting fields on
/// `requisition_line` into a method-tag + JSON snapshot pair.
///
/// Rename/replace:
/// - `vaccine_courses TEXT NULL`        → folded into `forecast_data` JSON
/// - `forecast_total_doses DOUBLE NULL` → folded into `forecast_data` JSON
/// - new `forecast_method TEXT NULL` (`null` ≡ AMC implicit/legacy)
/// - new `forecast_data TEXT NULL`     (discriminated-union JSON; see
///   `repository::db_diesel::requisition_line::forecast_snapshot`)
///
/// Pre-existing rows that already had a population snapshot are migrated to
/// `forecast_method = 'population'` and a `Population` shaped `forecast_data`.
pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "refactor_requisition_line_forecasting"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                ALTER TABLE requisition_line ADD COLUMN forecast_method TEXT;
                ALTER TABLE requisition_line ADD COLUMN forecast_data TEXT;
            "#
        )?;

        // Backfill: any line with a populated `vaccine_courses` came from the
        // population path. Tag and reshape into the new JSON envelope.
        #[cfg(not(feature = "postgres"))]
        sql!(
            connection,
            r#"
                UPDATE requisition_line
                SET forecast_method = 'population',
                    forecast_data = json_object(
                        'method', 'population',
                        'forecastTotalUnits', forecast_total_units,
                        'forecastTotalDoses', forecast_total_doses,
                        'vaccineCourses', json(vaccine_courses)
                    )
                WHERE vaccine_courses IS NOT NULL;
            "#
        )?;

        #[cfg(feature = "postgres")]
        sql!(
            connection,
            r#"
                UPDATE requisition_line
                SET forecast_method = 'population',
                    forecast_data = jsonb_build_object(
                        'method', 'population',
                        'forecastTotalUnits', forecast_total_units,
                        'forecastTotalDoses', forecast_total_doses,
                        'vaccineCourses', vaccine_courses::jsonb
                    )::text
                WHERE vaccine_courses IS NOT NULL;
            "#
        )?;

        sql!(
            connection,
            r#"
                ALTER TABLE requisition_line DROP COLUMN vaccine_courses;
                ALTER TABLE requisition_line DROP COLUMN forecast_total_doses;
            "#
        )?;

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use crate::migrations::*;
    use crate::test_db::*;
    use crate::ForecastSnapshot;
    use diesel::{sql_query, RunQueryDsl};

    #[derive(diesel::QueryableByName, Debug)]
    struct ReqLine {
        #[diesel(sql_type = diesel::sql_types::Text)]
        id: String,
        #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Double>)]
        forecast_total_units: Option<f64>,
        #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
        forecast_method: Option<String>,
        #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
        forecast_data: Option<String>,
    }

    /// Insert a v2.17.00-shaped row with `vaccine_courses` populated, run the
    /// v2.18.00 migration, and assert the row is reshaped into the new
    /// `ForecastSnapshot::Population` envelope while `forecast_total_units`
    /// and the legacy/null cases pass through untouched.
    #[actix_rt::test]
    async fn test_refactor_requisition_line_forecasting_migration() {
        use crate::migrations::v2_17_00::V2_17_00;
        use crate::migrations::v2_18_00::V2_18_00;

        let previous_version = V2_17_00.version();
        let version = V2_18_00.version();

        let SetupResult { connection, .. } = setup_test(SetupOption {
            db_name: "migration_refactor_forecasting",
            version: Some(previous_version.clone()),
            ..Default::default()
        })
        .await;

        let run = |sql: &str| {
            sql_query(sql)
                .execute(connection.lock().connection())
                .unwrap()
        };

        // Minimal dependency setup so we can insert requisition_line rows.
        run("INSERT INTO name (id, type, is_customer, is_supplier, code, name) VALUES ('n1', 'FACILITY', true, false, 'N1', 'N1');");
        run("INSERT INTO name_link (id, name_id) VALUES ('nl1', 'n1');");
        run("INSERT INTO store (id, name_link_id, code, site_id) VALUES ('s1', 'nl1', 'S1', 1);");
        run("INSERT INTO item (id, name, code, default_pack_size, type, legacy_record) VALUES ('i1', 'I1', 'I1', 1.0, 'STOCK', '');");
        run("INSERT INTO item_link (id, item_id) VALUES ('il1', 'i1');");
        run("INSERT INTO requisition (id, requisition_number, name_link_id, store_id, type, status, created_datetime, max_months_of_stock, min_months_of_stock, is_emergency) VALUES ('r1', 1, 'nl1', 's1', 'REQUEST', 'NEW', '2023-01-01 00:00:00', 6.0, 1.0, false);");

        // Row 1: had a population snapshot — expected to migrate to forecast_method='population'.
        run(r#"INSERT INTO requisition_line (
                    id, requisition_id, item_link_id, item_name, requested_quantity,
                    suggested_quantity, supply_quantity, available_stock_on_hand,
                    average_monthly_consumption, approved_quantity, initial_stock_on_hand_units,
                    incoming_units, outgoing_units, loss_in_units, addition_in_units,
                    expiring_units, days_out_of_stock,
                    forecast_total_units, forecast_total_doses, vaccine_courses
                ) VALUES (
                    'rl_pop', 'r1', 'il1', 'I1', 0.0,
                    0.0, 0.0, 0.0,
                    0.0, 0.0, 0.0,
                    0.0, 0.0, 0.0, 0.0,
                    0.0, 0.0,
                    1875.0, 3750.0, '[{"courseTitle":"X","numberOfDoses":3,"coverageRate":60,"targetPopulation":2500,"wastageRate":50,"lossFactor":2,"annualTargetDoses":9000,"bufferStockMonths":2,"supplyPeriodMonths":3,"dosesPerUnit":2,"forecastDoses":3750,"forecastUnits":1875}]'
                );"#);

        // Row 2: no population snapshot — expected to remain forecast_method=NULL.
        run(r#"INSERT INTO requisition_line (
                    id, requisition_id, item_link_id, item_name, requested_quantity,
                    suggested_quantity, supply_quantity, available_stock_on_hand,
                    average_monthly_consumption, approved_quantity, initial_stock_on_hand_units,
                    incoming_units, outgoing_units, loss_in_units, addition_in_units,
                    expiring_units, days_out_of_stock,
                    forecast_total_units, forecast_total_doses, vaccine_courses
                ) VALUES (
                    'rl_amc', 'r1', 'il1', 'I1', 0.0,
                    0.0, 0.0, 0.0,
                    0.0, 0.0, 0.0,
                    0.0, 0.0, 0.0, 0.0,
                    0.0, 0.0,
                    NULL, NULL, NULL
                );"#);

        migrate(&connection, Some(version.clone())).unwrap();

        let rows: Vec<ReqLine> = sql_query(
            "SELECT id, forecast_total_units, forecast_method, forecast_data \
             FROM requisition_line ORDER BY id",
        )
        .load(connection.lock().connection())
        .unwrap();

        let pop = rows.iter().find(|r| r.id == "rl_pop").expect("rl_pop");
        assert_eq!(pop.forecast_method.as_deref(), Some("population"));
        assert_eq!(pop.forecast_total_units, Some(1875.0));
        let snap: ForecastSnapshot = serde_json::from_str(
            pop.forecast_data
                .as_deref()
                .expect("forecast_data populated"),
        )
        .expect("snapshot parses");
        match snap {
            ForecastSnapshot::Population(p) => {
                assert_eq!(p.forecast_total_units, 1875.0);
                assert_eq!(p.forecast_total_doses, 3750.0);
                assert_eq!(p.vaccine_courses.len(), 1);
                assert_eq!(p.vaccine_courses[0].course_title, "X");
            }
            _ => panic!("expected Population"),
        }

        let amc = rows.iter().find(|r| r.id == "rl_amc").expect("rl_amc");
        assert!(amc.forecast_method.is_none());
        assert!(amc.forecast_data.is_none());
        assert!(amc.forecast_total_units.is_none());
    }
}
