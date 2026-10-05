use crate::migrations::*;
use crate::{forecast_from_legacy, LegacyForecast};

use diesel::prelude::*;

table! {
    requisition_line (id) {
        id -> Text,
        average_monthly_consumption -> Double,
        forecast_total_units -> Nullable<Double>,
        forecast_total_doses -> Nullable<Double>,
        vaccine_courses -> Nullable<Text>,
        forecast_method -> Text,
        forecast_monthly_consumption -> Double,
        forecast_data -> Nullable<Text>,
    }
}

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_forecast_method_to_requisition_line"
    }

    // Replaces the population forecast's supply-period totals with a method and the
    // monthly demand it yields. Every line converts, sent and finalised ones included:
    // a line with vaccine courses becomes `population`, its courses spread over the
    // supply period they were forecast for; every other line becomes `amc`.
    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                ALTER TABLE requisition_line ADD COLUMN forecast_method TEXT NOT NULL DEFAULT 'amc';
                ALTER TABLE requisition_line ADD COLUMN forecast_monthly_consumption {DOUBLE} NOT NULL DEFAULT 0;
                ALTER TABLE requisition_line ADD COLUMN forecast_data TEXT;

                UPDATE requisition_line SET forecast_monthly_consumption = average_monthly_consumption;
            "#
        )?;

        let population_lines = requisition_line::table
            .select((
                requisition_line::id,
                requisition_line::average_monthly_consumption,
                requisition_line::forecast_total_units,
                requisition_line::forecast_total_doses,
                requisition_line::vaccine_courses,
            ))
            .filter(requisition_line::vaccine_courses.is_not_null())
            .load::<(String, f64, Option<f64>, Option<f64>, Option<String>)>(
                connection.lock().connection(),
            )?;

        for (
            id,
            average_monthly_consumption,
            forecast_total_units,
            forecast_total_doses,
            vaccine_courses,
        ) in population_lines
        {
            let forecast = forecast_from_legacy(
                &LegacyForecast {
                    forecast_total_units,
                    forecast_total_doses,
                    vaccine_courses,
                },
                average_monthly_consumption,
            );

            diesel::update(requisition_line::table.filter(requisition_line::id.eq(&id)))
                .set((
                    requisition_line::forecast_method.eq(forecast.method.as_ref()),
                    requisition_line::forecast_monthly_consumption.eq(forecast.monthly_consumption),
                    requisition_line::forecast_data.eq(forecast.data_json()),
                ))
                .execute(connection.lock().connection())?;
        }

        sql!(
            connection,
            r#"
                ALTER TABLE requisition_line DROP COLUMN forecast_total_units;
                ALTER TABLE requisition_line DROP COLUMN forecast_total_doses;
                ALTER TABLE requisition_line DROP COLUMN vaccine_courses;
            "#
        )?;

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{
        migrations::{v3_02_00::V3_02_00, v3_04_00::V3_04_00},
        test_db::*,
        LegacyCourse,
    };
    use diesel::sql_query;

    table! {
        #[sql_name = "requisition_line"]
        migrated_requisition_line (id) {
            id -> Text,
            forecast_method -> Text,
            forecast_monthly_consumption -> Double,
            forecast_data -> Nullable<Text>,
        }
    }

    fn run(connection: &StorageConnection, sql: &str) {
        sql_query(sql)
            .execute(connection.lock().connection())
            .unwrap();
    }

    fn insert_line(connection: &StorageConnection, id: &str, amc: f64, legacy: &LegacyForecast) {
        let num = |v: Option<f64>| v.map(|v| v.to_string()).unwrap_or("NULL".to_string());
        let courses = legacy
            .vaccine_courses
            .as_ref()
            .map(|c| format!("'{c}'"))
            .unwrap_or("NULL".to_string());
        run(
            connection,
            &format!(
                "INSERT INTO requisition_line (id, requisition_id, item_link_id, item_name, requested_quantity, suggested_quantity, supply_quantity, available_stock_on_hand, average_monthly_consumption, approved_quantity, initial_stock_on_hand_units, incoming_units, outgoing_units, loss_in_units, addition_in_units, expiring_units, days_out_of_stock, forecast_total_units, forecast_total_doses, vaccine_courses) VALUES ('{id}', 'requisition_id', 'item_link_id', 'Item', 0, 0, 0, 0, {amc}, 0, 0, 0, 0, 0, 0, 0, 0, {}, {}, {courses});",
                num(legacy.forecast_total_units),
                num(legacy.forecast_total_doses),
            ),
        );
    }

    fn course(title: &str, supply: f64, buffer: f64, units: f64) -> LegacyCourse {
        LegacyCourse {
            course_title: title.to_string(),
            number_of_doses: 2,
            coverage_rate: 90.0,
            target_population: 1000.0,
            wastage_rate: 10.0,
            loss_factor: 1.0 / 0.9,
            annual_target_doses: 2000.0,
            buffer_stock_months: buffer,
            supply_period_months: supply,
            doses_per_unit: 1,
            forecast_doses: units,
            forecast_units: units,
        }
    }

    #[actix_rt::test]
    async fn migration_forecast_method() {
        let previous_version = V3_02_00.version();
        let version = V3_04_00.version();

        let SetupResult { connection, .. } = setup_test(SetupOption {
            db_name: &format!("migration_forecast_method_{version}"),
            version: Some(previous_version.clone()),
            ..Default::default()
        })
        .await;

        run(&connection, "INSERT INTO name (id, type, is_customer, is_supplier, code, name) VALUES ('store_name', 'FACILITY', true, false, 'STORE', 'Store');");
        run(
            &connection,
            "INSERT INTO name_link (id, name_id) VALUES ('store_name_link', 'store_name');",
        );
        run(&connection, "INSERT INTO store (id, name_link_id, code, site_id) VALUES ('store_id', 'store_name_link', 'STORE1', 1);");
        run(&connection, "INSERT INTO item (id, name, code, default_pack_size, type, legacy_record) VALUES ('item_id', 'Item', 'ITEM1', 1.0, 'STOCK', '');");
        run(
            &connection,
            "INSERT INTO item_link (id, item_id) VALUES ('item_link_id', 'item_id');",
        );
        run(&connection, "INSERT INTO requisition (id, requisition_number, name_link_id, store_id, type, status, created_datetime, max_months_of_stock, min_months_of_stock, is_emergency) VALUES ('requisition_id', 1, 'store_name_link', 'store_id', 'REQUEST', 'SENT', '2026-01-01 00:00:00', 6.0, 1.0, false);");

        let courses = vec![
            course("Course A (Children)", 3.0, 2.0, 1000.0),
            course("Course B ()", 3.0, 2.0, 250.0),
        ];
        let population = LegacyForecast {
            forecast_total_units: Some(1250.0),
            forecast_total_doses: Some(1250.0),
            vaccine_courses: Some(serde_json::to_string(&courses).unwrap()),
        };
        insert_line(&connection, "line_population", 30.0, &population);
        insert_line(&connection, "line_amc", 30.0, &LegacyForecast::default());

        migrate(
            &connection,
            Some(version.clone()),
            MigrationConfig::default(),
        )
        .unwrap();

        let mut rows: Vec<(String, String, f64, Option<String>)> = migrated_requisition_line::table
            .select((
                migrated_requisition_line::id,
                migrated_requisition_line::forecast_method,
                migrated_requisition_line::forecast_monthly_consumption,
                migrated_requisition_line::forecast_data,
            ))
            .load(connection.lock().connection())
            .unwrap();
        rows.sort_by(|a, b| a.0.cmp(&b.0));

        let (_, method, monthly, data) = &rows[1];
        assert_eq!(rows[1].0, "line_population");
        assert_eq!(method, "population");
        // Monthly demand × the old horizon (supply interval + buffer) reproduces the old total
        assert_eq!(monthly * 5.0, population.forecast_total_units.unwrap());
        assert!(data
            .as_deref()
            .unwrap()
            .contains("\"course_name\":\"Course A\""));

        assert_eq!(
            rows[0],
            ("line_amc".to_string(), "amc".to_string(), 30.0, None)
        );
    }
}
