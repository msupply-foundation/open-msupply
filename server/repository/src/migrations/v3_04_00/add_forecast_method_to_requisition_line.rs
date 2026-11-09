use crate::migrations::*;

use diesel::prelude::*;
use serde::{Deserialize, Serialize};

table! {
    requisition_line (id) {
        id -> Text,
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

        // A line's legacy totals are its courses' sums, so the courses alone are read
        let population_lines = requisition_line::table
            .select((requisition_line::id, requisition_line::vaccine_courses))
            .filter(requisition_line::vaccine_courses.is_not_null())
            .load::<(String, Option<String>)>(connection.lock().connection())?;

        for (id, vaccine_courses) in population_lines {
            // Left as AMC, as the column defaults set it, when no course is readable
            let Some((monthly_consumption, forecast_data)) =
                population_forecast(vaccine_courses.as_deref())
            else {
                continue;
            };

            diesel::update(requisition_line::table.filter(requisition_line::id.eq(&id)))
                .set((
                    requisition_line::forecast_method.eq("population"),
                    requisition_line::forecast_monthly_consumption.eq(monthly_consumption),
                    requisition_line::forecast_data.eq(forecast_data),
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

// The legacy → current conversion as 3.04 does it. A copy of `forecast_from_legacy`
// (db_diesel/requisition_line/forecast_data.rs), which sync keeps using and may change:
// this one must not, so that every site migrating to 3.04 converts its lines alike.

/// One course in the legacy `vaccine_courses` JSON, covering a supply period of
/// `supply_period_months + buffer_stock_months`. The descriptive fields default when
/// missing or null (rows copied from the forecasting plugin's data, a 100% wastage
/// rate's infinite figures serialised as null).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LegacyCourse {
    #[serde(default, deserialize_with = "null_as_default")]
    course_title: String,
    #[serde(default, deserialize_with = "null_as_default")]
    number_of_doses: i32,
    #[serde(default, deserialize_with = "null_as_default")]
    coverage_rate: f64,
    #[serde(default, deserialize_with = "null_as_default")]
    target_population: f64,
    #[serde(default, deserialize_with = "null_as_default")]
    wastage_rate: f64,
    #[serde(default, deserialize_with = "null_as_default")]
    loss_factor: f64,
    #[serde(default, deserialize_with = "null_as_default")]
    annual_target_doses: f64,
    #[serde(default, deserialize_with = "null_as_default")]
    buffer_stock_months: f64,
    supply_period_months: f64,
    #[serde(default, deserialize_with = "null_as_default")]
    doses_per_unit: i32,
    forecast_doses: f64,
    forecast_units: f64,
}

fn null_as_default<'de, D, T>(deserializer: D) -> Result<T, D::Error>
where
    D: serde::Deserializer<'de>,
    T: Default + Deserialize<'de>,
{
    Ok(Option::<T>::deserialize(deserializer)?.unwrap_or_default())
}

/// The 3.04 `forecast_data` shape of a Population line
#[derive(Serialize)]
#[serde(rename_all = "snake_case")]
enum ForecastData {
    Population(PopulationForecast),
}

#[derive(Serialize)]
struct PopulationForecast {
    population_served: Option<f64>,
    courses: Vec<PopulationForecastCourse>,
}

#[derive(Serialize)]
struct PopulationForecastCourse {
    course_name: String,
    demographic_name: Option<String>,
    number_of_doses: i32,
    coverage_rate: f64,
    wastage_rate: f64,
    target_population: f64,
    loss_factor: f64,
    annual_target_doses: f64,
    doses_per_unit: f64,
    monthly_doses: f64,
    monthly_units: f64,
}

/// A line's monthly demand and `forecast_data` from its legacy `vaccine_courses`: each
/// readable course's totals spread over its supply period. None when no course is readable.
fn population_forecast(vaccine_courses: Option<&str>) -> Option<(f64, String)> {
    let json = vaccine_courses.filter(|json| !json.is_empty())?;
    let courses: Vec<serde_json::Value> = serde_json::from_str(json)
        .inspect_err(|e| log::warn!("Unreadable vaccine_courses ({e}), migrated as AMC: {json}"))
        .ok()?;
    let courses: Vec<PopulationForecastCourse> = courses
        .into_iter()
        .filter_map(|course| {
            serde_json::from_value::<LegacyCourse>(course.clone())
                .inspect_err(|e| log::warn!("Unreadable vaccine course ({e}), skipped: {course}"))
                .ok()
        })
        .map(|course| {
            let supply_period = course.supply_period_months + course.buffer_stock_months;
            let per_month = |total: f64| {
                if supply_period > 0.0 {
                    total / supply_period
                } else {
                    0.0
                }
            };
            let (course_name, demographic_name) = split_course_title(&course.course_title);
            PopulationForecastCourse {
                course_name,
                demographic_name,
                number_of_doses: course.number_of_doses,
                coverage_rate: course.coverage_rate,
                wastage_rate: course.wastage_rate,
                target_population: course.target_population,
                loss_factor: course.loss_factor,
                annual_target_doses: course.annual_target_doses,
                doses_per_unit: course.doses_per_unit as f64,
                monthly_doses: per_month(course.forecast_doses),
                monthly_units: per_month(course.forecast_units),
            }
        })
        .collect();
    if courses.is_empty() {
        return None;
    }

    let monthly_consumption = courses.iter().map(|c| c.monthly_units).sum();
    let data = ForecastData::Population(PopulationForecast {
        population_served: None,
        courses,
    });
    Some((monthly_consumption, serde_json::to_string(&data).ok()?))
}

/// "Name (demographic)" → ("Name", Some("demographic")); "Name ()" → ("Name", None).
fn split_course_title(title: &str) -> (String, Option<String>) {
    match title.strip_suffix(')').and_then(|t| t.rsplit_once(" (")) {
        Some((name, demographic)) => (
            name.to_string(),
            (!demographic.is_empty()).then(|| demographic.to_string()),
        ),
        None => (title.to_string(), None),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{
        migrations::{v3_02_00::V3_02_00, v3_04_00::V3_04_00},
        test_db::*,
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

    fn insert_line(connection: &StorageConnection, id: &str, amc: f64, courses: Option<&str>) {
        let courses = courses
            .map(|c| format!("'{c}'"))
            .unwrap_or("NULL".to_string());
        run(
            connection,
            &format!(
                "INSERT INTO requisition_line (id, requisition_id, item_link_id, item_name, requested_quantity, suggested_quantity, supply_quantity, available_stock_on_hand, average_monthly_consumption, approved_quantity, initial_stock_on_hand_units, incoming_units, outgoing_units, loss_in_units, addition_in_units, expiring_units, days_out_of_stock, vaccine_courses) VALUES ('{id}', 'requisition_id', 'item_link_id', 'Item', 0, 0, 0, 0, {amc}, 0, 0, 0, 0, 0, 0, 0, 0, {courses});",
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
            "INSERT INTO item_link (id, item_id) VALUES ('item_link_id', 'item_id');",
        );
        run(
            &connection,
            "INSERT INTO requisition (id, requisition_number, name_link_id, store_id, type, status, created_datetime, max_months_of_stock, min_months_of_stock, is_emergency) VALUES ('requisition_id', 1, 'store_name_link', 'store_id', 'REQUEST', 'SENT', '2026-01-01 00:00:00', 6.0, 1.0, false);",
        );

        let courses = vec![
            course("Course A (Children)", 3.0, 2.0, 1000.0),
            course("Course B ()", 3.0, 2.0, 250.0),
        ];
        // The old line total: the courses' units over a 5-month supply period
        let forecast_total_units = 1250.0;
        let courses_json = serde_json::to_string(&courses).unwrap();
        insert_line(&connection, "line_population", 30.0, Some(&courses_json));
        insert_line(&connection, "line_amc", 30.0, None);
        // A course missing descriptive fields (as the forecasting plugin's data may) or
        // carrying null ones (a 100% wastage rate's infinite figures) still converts; one
        // missing its totals is skipped
        insert_line(
            &connection,
            "line_lenient",
            30.0,
            Some(
                r#"[{"supplyPeriodMonths": 2, "lossFactor": null, "forecastDoses": 60, "forecastUnits": 30}, {"courseTitle": "Broken ()", "supplyPeriodMonths": 2, "forecastDoses": null, "forecastUnits": null}]"#,
            ),
        );
        insert_line(
            &connection,
            "line_unreadable",
            30.0,
            Some("course1,course2"),
        );

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

        let row = |id: &str| rows.iter().find(|row| row.0 == id).unwrap().clone();

        let (_, method, monthly, data) = row("line_population");
        assert_eq!(method, "population");
        // Monthly demand × the old supply interval + buffer reproduces the old total
        assert_eq!(monthly * 5.0, forecast_total_units);
        // The app reads what the migration wrote
        let data = data.unwrap();
        assert!(matches!(
            crate::ForecastData::from_json(&data),
            Some(crate::ForecastData::Population(_))
        ));
        // The 3.04 forecast_data shape, pinned: this migration must keep producing it
        assert_eq!(
            data,
            r#"{"population":{"population_served":null,"courses":[{"course_name":"Course A","demographic_name":"Children","number_of_doses":2,"coverage_rate":90.0,"wastage_rate":10.0,"target_population":1000.0,"loss_factor":1.1111111111111112,"annual_target_doses":2000.0,"doses_per_unit":1.0,"monthly_doses":200.0,"monthly_units":200.0},{"course_name":"Course B","demographic_name":null,"number_of_doses":2,"coverage_rate":90.0,"wastage_rate":10.0,"target_population":1000.0,"loss_factor":1.1111111111111112,"annual_target_doses":2000.0,"doses_per_unit":1.0,"monthly_doses":50.0,"monthly_units":50.0}]}}"#
        );

        let (_, method, monthly, _) = row("line_lenient");
        assert_eq!((method.as_str(), monthly), ("population", 15.0));

        assert_eq!(
            row("line_amc"),
            ("line_amc".to_string(), "amc".to_string(), 30.0, None)
        );
        assert_eq!(
            row("line_unreadable"),
            ("line_unreadable".to_string(), "amc".to_string(), 30.0, None)
        );
    }
}
