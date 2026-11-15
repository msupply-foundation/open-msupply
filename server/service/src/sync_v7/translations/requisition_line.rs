// V7 requisition_line translations, for sites older than 3.04 that store the population
// forecast's supply-period totals (`forecast_total_units`, `forecast_total_doses`,
// `vaccine_courses`) rather than a forecast method and its monthly demand. The
// conversions are the same pair the V5 translator uses.

use repository::{
    ChangeLogInsertRow, ChangelogRow, ChangelogTableName, LegacyForecast, RequisitionLineRow,
    RequisitionRowRepository, StorageConnection, Upsert, forecast_from_legacy, forecast_to_legacy,
    migrations::Version, syncv7::SyncError, syncv7::SyncRecordSerializeError,
};
use serde_json::Value;

use crate::sync_v7::{serde::DeserializeResult, sync::SyncRecordV7};

/// The first version whose requisition lines carry a forecast method.
fn forecast_method_version() -> Version {
    Version::from_str("3.04.0")
}

/// The keys only the current shape has, which an older site doesn't know.
const CURRENT_KEYS: [&str; 3] = [
    "forecast_method",
    "forecast_monthly_consumption",
    "forecast_data",
];

/// Whether `receiver_version` (None when a remote pushes to central) predates forecast
/// methods.
pub(crate) fn receiver_needs_legacy_forecast(receiver_version: Option<&Version>) -> bool {
    receiver_version.is_some_and(|version| *version < forecast_method_version())
}

/// The line as a site older than 3.04 stores it: a Population line's forecast spread over
/// the requisition's target months, with no buffer; no forecast on other lines.
pub(crate) fn translate_outgoing_requisition_line(
    connection: &StorageConnection,
    changelog: ChangelogRow,
    line: RequisitionLineRow,
) -> Result<Vec<SyncRecordV7>, SyncError> {
    let target_months = RequisitionRowRepository::new(connection)
        .find_one_by_id(&line.requisition_id)?
        .ok_or_else(|| SyncError::RecordNotFound {
            id: line.requisition_id.clone(),
            table: ChangelogTableName::Requisition,
        })?
        .max_months_of_stock;
    let legacy = forecast_to_legacy(
        &line.forecast_method,
        line.forecast_data.as_deref(),
        target_months,
    );

    let mut data = serde_json::to_value(&line)
        .map_err(|e| SyncRecordSerializeError::SerdeError(e.to_string()))?;
    if let Value::Object(fields) = &mut data {
        for key in CURRENT_KEYS {
            fields.remove(key);
        }
        if let Value::Object(legacy) = serde_json::to_value(legacy)
            .map_err(|e| SyncRecordSerializeError::SerdeError(e.to_string()))?
        {
            fields.extend(legacy);
        }
    }

    Ok(vec![SyncRecordV7::upsert(changelog, data)])
}

/// Deserialise an incoming requisition_line. A line from a site older than 3.04 carries
/// no forecast method; it converts from the legacy forecast fields, as on V5 pull.
pub(crate) fn translate_requisition_line(
    changelog_insert: ChangeLogInsertRow,
    data: &Value,
) -> DeserializeResult {
    let row = requisition_line_from_json(data)?;
    Ok(vec![(Box::new(row) as Box<dyn Upsert>, changelog_insert)])
}

fn requisition_line_from_json(
    data: &Value,
) -> Result<RequisitionLineRow, SyncRecordSerializeError> {
    let to_error = |e: serde_json::Error| SyncRecordSerializeError::SerdeError(e.to_string());

    Ok(match data {
        Value::Object(fields) if !fields.contains_key("forecast_method") => {
            let legacy: LegacyForecast = serde_json::from_value(data.clone()).map_err(to_error)?;
            let average_monthly_consumption = fields
                .get("average_monthly_consumption")
                .and_then(Value::as_f64)
                .unwrap_or_default();
            let forecast = forecast_from_legacy(&legacy, average_monthly_consumption);

            let mut fields = fields.clone();
            for key in [
                "forecast_total_units",
                "forecast_total_doses",
                "vaccine_courses",
            ] {
                fields.remove(key);
            }
            fields.insert(
                "forecast_method".to_string(),
                serde_json::to_value(&forecast.method).map_err(to_error)?,
            );
            fields.insert(
                "forecast_monthly_consumption".to_string(),
                forecast.monthly_consumption.into(),
            );
            fields.insert("forecast_data".to_string(), forecast.data_json().into());
            serde_json::from_value(Value::Object(fields)).map_err(to_error)?
        }
        _ => serde_json::from_value(data.clone()).map_err(to_error)?,
    })
}

#[cfg(test)]
mod test {
    use super::*;
    use repository::{
        ChangelogTableName, ForecastData, ForecastMethod, LegacyCourse, PopulationForecast,
        PopulationForecastCourse, RowActionType,
        mock::{MockDataInserts, mock_request_draft_requisition},
        test_db::setup_all,
    };

    fn population_line(requisition_id: &str) -> RequisitionLineRow {
        RequisitionLineRow {
            id: "population_line".to_string(),
            requisition_id: requisition_id.to_string(),
            average_monthly_consumption: 7.0,
            forecast_method: ForecastMethod::Population,
            forecast_monthly_consumption: 100.0,
            forecast_data: Some(
                ForecastData::Population(PopulationForecast {
                    population_served: Some(1000.0),
                    courses: vec![PopulationForecastCourse {
                        course_name: "Course".to_string(),
                        demographic_name: None,
                        number_of_doses: 2,
                        coverage_rate: 90.0,
                        wastage_rate: 10.0,
                        target_population: 1000.0,
                        annual_doses_per_person: None,
                        loss_factor: 1.0 / 0.9,
                        annual_target_doses: 2000.0,
                        doses_per_unit: 2.0,
                        monthly_doses: 200.0,
                        monthly_units: 100.0,
                    }],
                })
                .to_json(),
            ),
            ..Default::default()
        }
    }

    fn changelog_for(line: &RequisitionLineRow) -> ChangelogRow {
        ChangelogRow {
            record_id: line.id.clone(),
            table_name: ChangelogTableName::RequisitionLine,
            row_action: RowActionType::Upsert,
            ..Default::default()
        }
    }

    #[test]
    fn only_older_receivers_need_the_legacy_shape() {
        assert!(receiver_needs_legacy_forecast(Some(&Version::from_str(
            "3.02.0"
        ))));
        assert!(!receiver_needs_legacy_forecast(Some(&Version::from_str(
            "3.04.0"
        ))));
        assert!(!receiver_needs_legacy_forecast(Some(&Version::from_str(
            "3.04.0-RC1"
        ))));
        assert!(!receiver_needs_legacy_forecast(Some(&Version::from_str(
            "3.05.0"
        ))));
        assert!(!receiver_needs_legacy_forecast(None));
    }

    #[actix_rt::test]
    async fn outgoing_population_line_spreads_over_target_months() {
        let (_, connection, _, _) =
            setup_all("v7_outgoing_legacy_forecast", MockDataInserts::all()).await;
        let requisition = mock_request_draft_requisition();
        let line = population_line(&requisition.id);

        let record = translate_outgoing_requisition_line(&connection, changelog_for(&line), line)
            .unwrap()
            .pop()
            .unwrap();

        for key in CURRENT_KEYS {
            assert!(
                record.data.get(key).is_none(),
                "{key} sent to an older site"
            );
        }
        let target_months = requisition.max_months_of_stock;
        assert_eq!(
            record.data["forecast_total_units"].as_f64(),
            Some(100.0 * target_months)
        );
        let courses: Vec<LegacyCourse> =
            serde_json::from_str(record.data["vaccine_courses"].as_str().unwrap()).unwrap();
        assert_eq!(courses[0].supply_period_months, target_months);
        assert_eq!(courses[0].buffer_stock_months, 0.0);
    }

    #[actix_rt::test]
    async fn outgoing_amc_line_sends_no_forecast() {
        let (_, connection, _, _) =
            setup_all("v7_outgoing_legacy_amc", MockDataInserts::all()).await;
        let line = RequisitionLineRow {
            id: "amc_line".to_string(),
            requisition_id: mock_request_draft_requisition().id,
            ..Default::default()
        };

        let record = translate_outgoing_requisition_line(&connection, changelog_for(&line), line)
            .unwrap()
            .pop()
            .unwrap();
        assert!(record.data["forecast_total_units"].is_null());
        assert!(record.data["vaccine_courses"].is_null());
        assert!(record.data.get("forecast_method").is_none());
    }

    fn deserialised(data: Value) -> RequisitionLineRow {
        requisition_line_from_json(&data).unwrap()
    }

    #[test]
    fn incoming_current_shape_is_unchanged() {
        let line = population_line("requisition");
        assert_eq!(deserialised(serde_json::to_value(&line).unwrap()), line);
    }

    #[test]
    fn incoming_legacy_shape_converts() {
        // An older site's line: the legacy keys, no forecast method
        let mut data = serde_json::to_value(population_line("requisition")).unwrap();
        let fields = data.as_object_mut().unwrap();
        for key in CURRENT_KEYS {
            fields.remove(key);
        }
        let legacy_course = LegacyCourse {
            course_title: "Course (Children)".to_string(),
            number_of_doses: 2,
            coverage_rate: 90.0,
            target_population: 1000.0,
            wastage_rate: 10.0,
            loss_factor: 1.0 / 0.9,
            annual_target_doses: 2000.0,
            buffer_stock_months: 1.0,
            supply_period_months: 3.0,
            doses_per_unit: 2,
            forecast_doses: 800.0,
            forecast_units: 400.0,
        };
        fields.insert("forecast_total_units".to_string(), 400.0.into());
        fields.insert("forecast_total_doses".to_string(), 800.0.into());
        fields.insert(
            "vaccine_courses".to_string(),
            serde_json::to_string(&vec![legacy_course]).unwrap().into(),
        );

        let line = deserialised(data.clone());
        assert_eq!(line.forecast_method, ForecastMethod::Population);
        assert_eq!(line.forecast_monthly_consumption, 100.0);

        // Without courses, an AMC line from its AMC
        let fields = data.as_object_mut().unwrap();
        fields.insert("vaccine_courses".to_string(), Value::Null);
        let line = deserialised(data);
        assert_eq!(line.forecast_method, ForecastMethod::Amc);
        assert_eq!(line.forecast_monthly_consumption, 7.0);
        assert_eq!(line.forecast_data, None);
    }
}
