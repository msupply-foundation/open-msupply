use chrono::NaiveDate;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use ts_rs::TS;

/// Storage tag for a line's chosen forecasting method. Persisted as text in
/// `requisition_line.forecast_method`.
///
/// `Plugin(code)` carries the `backend_plugin.code` of the supplying plugin so
/// multiple plugin-supplied methods can coexist on the same store.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ForecastMethod {
    AverageMonthlyConsumption,
    Population,
    AncillaryRatio,
    Plugin(String),
}

impl ForecastMethod {
    pub fn to_storage(&self) -> String {
        match self {
            ForecastMethod::AverageMonthlyConsumption => "amc".to_string(),
            ForecastMethod::Population => "population".to_string(),
            ForecastMethod::AncillaryRatio => "ancillary_ratio".to_string(),
            ForecastMethod::Plugin(code) => format!("plugin:{code}"),
        }
    }

    pub fn from_storage(value: &str) -> Option<Self> {
        match value {
            "amc" => Some(ForecastMethod::AverageMonthlyConsumption),
            "population" => Some(ForecastMethod::Population),
            "ancillary_ratio" => Some(ForecastMethod::AncillaryRatio),
            other => other
                .strip_prefix("plugin:")
                .map(|code| ForecastMethod::Plugin(code.to_string())),
        }
    }
}

/// Discriminated union snapshot stored as JSON in `requisition_line.forecast_data`.
///
/// Each method's variant wraps an `Outcome` with `Ok` / `Error` arms. The error
/// space for each method is closed and method-specific — `PluginError` cannot
/// appear under `method: "population"`, the type system enforces it. New error
/// kinds extend the per-method error union and force every render site to handle
/// them.
#[derive(TS, Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "method", rename_all = "snake_case")]
pub enum ForecastSnapshot {
    Amc(AmcOutcome),
    Population(PopulationOutcome),
    AncillaryRatio(AncillaryRatioOutcome),
    Plugin(PluginOutcome),
}

impl ForecastSnapshot {
    /// The `ForecastMethod` tag implied by this snapshot's variant. Used to
    /// keep `requisition_line.forecast_method` in lock-step with
    /// `forecast_data` — the row's denormalised method column is always
    /// derivable from the snapshot, never the other way around.
    pub fn method(&self) -> ForecastMethod {
        match self {
            ForecastSnapshot::Amc(_) => ForecastMethod::AverageMonthlyConsumption,
            ForecastSnapshot::Population(_) => ForecastMethod::Population,
            ForecastSnapshot::AncillaryRatio(_) => ForecastMethod::AncillaryRatio,
            ForecastSnapshot::Plugin(PluginOutcome::Ok(s)) => {
                ForecastMethod::Plugin(s.plugin_code.clone())
            }
            ForecastSnapshot::Plugin(PluginOutcome::Error(e)) => {
                let code = match e {
                    PluginError::NotFound { plugin_code }
                    | PluginError::InvocationFailed { plugin_code, .. } => plugin_code.clone(),
                };
                ForecastMethod::Plugin(code)
            }
        }
    }

    /// Headline rate. `0.0` for any `Error` outcome — stock-management code
    /// should not derive a suggested quantity from a failed forecast.
    pub fn forecast_monthly_usage(&self) -> f64 {
        match self {
            ForecastSnapshot::Amc(AmcOutcome::Ok(s)) => s.forecast_monthly_usage,
            ForecastSnapshot::Population(PopulationOutcome::Ok(s)) => s.forecast_monthly_usage,
            ForecastSnapshot::AncillaryRatio(AncillaryRatioOutcome::Ok(s)) => {
                s.forecast_monthly_usage
            }
            ForecastSnapshot::Plugin(PluginOutcome::Ok(s)) => s.forecast_monthly_usage,
            _ => 0.0,
        }
    }

    pub fn forecast_doses(&self) -> Option<f64> {
        match self {
            ForecastSnapshot::Population(PopulationOutcome::Ok(s)) => Some(s.forecast_total_doses),
            ForecastSnapshot::Plugin(PluginOutcome::Ok(s)) => s.forecast_doses,
            _ => None,
        }
    }

    /// `true` when the snapshot is an Error outcome of any method.
    pub fn is_error(&self) -> bool {
        matches!(
            self,
            ForecastSnapshot::Amc(AmcOutcome::Error(_))
                | ForecastSnapshot::Population(PopulationOutcome::Error(_))
                | ForecastSnapshot::AncillaryRatio(AncillaryRatioOutcome::Error(_))
                | ForecastSnapshot::Plugin(PluginOutcome::Error(_))
        )
    }
}

// ---- AMC --------------------------------------------------------------

#[derive(TS, Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "status", rename_all = "snake_case")]
pub enum AmcOutcome {
    Ok(AmcSnapshot),
    Error(AmcError),
}

#[derive(TS, Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum AmcError {
    /// No consumption recorded over the lookback window — AMC of `0` would be
    /// meaningless to render as a calculation.
    #[serde(rename_all = "camelCase")]
    NoConsumptionHistory { lookback_months: f64 },
}

#[derive(TS, Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AmcSnapshot {
    pub forecast_monthly_usage: f64,
    pub breakdown: AmcSnapshotBreakdown,
}

/// How the AMC value was produced. The default formula's inputs are surfaced
/// directly so the UI can render the calculation; if AMC came from a backend
/// `PluginType::AverageMonthlyConsumption` plugin, we just record the plugin
/// code so the UI can attribute it.
#[derive(TS, Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "source", rename_all = "snake_case")]
pub enum AmcSnapshotBreakdown {
    Default(DefaultAmcSnapshotBreakdown),
    Plugin { code: String },
}

#[derive(TS, Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DefaultAmcSnapshotBreakdown {
    pub lookback_months: f64,
    pub total_consumption: f64,
    pub number_of_days: f64,
    /// Total days out of stock over the lookback period. `None` when the
    /// `AdjustForNumberOfDaysOutOfStock` preference is off.
    pub days_out_of_stock: Option<f64>,
    /// `1.0` when DOS adjustment is off; otherwise `numberOfDays /
    /// (numberOfDays − daysOutOfStock)`.
    pub dos_adjustment_factor: f64,
    /// Per-month consumption that fed `total_consumption`. One entry per
    /// month in the lookback window — months with zero consumption are
    /// included with `consumption: 0` so the UI can show every month, not
    /// just the ones with activity.
    pub monthly_consumption: Vec<MonthlyConsumption>,
}

#[derive(TS, Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MonthlyConsumption {
    /// First day of the month (e.g. `2025-09-01`). UI formats as
    /// "September 2025" / "Sep 25" depending on space.
    pub month: NaiveDate,
    pub consumption: f64,
}

// ---- Population -------------------------------------------------------

#[derive(TS, Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "status", rename_all = "snake_case")]
pub enum PopulationOutcome {
    Ok(PopulationSnapshot),
    Error(PopulationError),
}

#[derive(TS, Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum PopulationError {
    /// Population forecast was selected but the store is missing one or more
    /// required properties (`population_served` / `supply_interval`).
    #[serde(rename_all = "camelCase")]
    MissingStoreConfig {
        store_id: String,
        missing_fields: Vec<MissingStoreField>,
    },
    /// Population forecast was selected but no vaccine course is mapped to
    /// this item.
    #[serde(rename_all = "camelCase")]
    NoVaccineCourseForItem { item_id: String },
}

#[derive(TS, Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum MissingStoreField {
    PopulationServed,
    SupplyInterval,
}

#[derive(TS, Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PopulationSnapshot {
    pub forecast_monthly_usage: f64,
    pub forecast_total_doses: f64,
    pub vaccine_courses: Vec<PopulationCourseData>,
}

/// Mirrors the `CourseData` shape produced by `generate_population_forecast` —
/// duplicated here so this crate doesn't depend on `service` for the snapshot
/// definition. `service::generate_population_forecast::CourseData` should
/// convert into this on its way to the snapshot.
///
/// Per-course `forecast_units` / `forecast_doses` retain their period-scaled
/// totals for the UI breakdown; `forecast_monthly_usage` is the same value
/// divided by the course's effective period (`supply_period_months +
/// buffer_stock_months`) so the headline rate sums consistently.
#[derive(TS, Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PopulationCourseData {
    pub course_title: String,
    pub number_of_doses: i32,
    pub coverage_rate: f64,
    pub target_population: f64,
    pub wastage_rate: f64,
    pub loss_factor: f64,
    pub annual_target_doses: f64,
    pub buffer_stock_months: f64,
    pub supply_period_months: f64,
    pub doses_per_unit: i32,
    pub forecast_doses: f64,
    pub forecast_units: f64,
    pub forecast_monthly_usage: f64,
}

// ---- AncillaryRatio ---------------------------------------------------

#[derive(TS, Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "status", rename_all = "snake_case")]
pub enum AncillaryRatioOutcome {
    Ok(AncillaryRatioSnapshot),
    Error(AncillaryRatioError),
}

#[derive(TS, Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum AncillaryRatioError {
    /// AncillaryRatio was selected but none of this item's parents are lines
    /// on this requisition. Without at least one parent on the requisition
    /// there's nothing to ratio against.
    #[serde(rename_all = "camelCase")]
    NoParentsInRequisition { item_id: String },
}

#[derive(TS, Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AncillaryRatioSnapshot {
    pub forecast_monthly_usage: f64,
    pub contributions: Vec<AncillaryContribution>,
}

#[derive(TS, Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AncillaryContribution {
    pub parent_line_id: String,
    pub parent_item_id: String,
    pub parent_item_name: String,
    pub parent_forecast_monthly_usage: f64,
    pub item_quantity: f64,
    pub ancillary_quantity: f64,
    pub monthly_usage: f64,
}

// ---- Plugin -----------------------------------------------------------

#[derive(TS, Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "status", rename_all = "snake_case")]
pub enum PluginOutcome {
    Ok(PluginSnapshot),
    Error(PluginError),
}

#[derive(TS, Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum PluginError {
    /// The line's `forecast_method` references a plugin code that isn't
    /// currently registered (uninstalled, version-incompatible, etc.).
    #[serde(rename_all = "camelCase")]
    NotFound { plugin_code: String },
    /// The plugin was invoked but returned an error.
    #[serde(rename_all = "camelCase")]
    InvocationFailed {
        plugin_code: String,
        plugin_version: String,
        message: String,
    },
}

#[derive(TS, Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PluginSnapshot {
    pub plugin_code: String,
    pub plugin_version: String,
    pub forecast_monthly_usage: f64,
    pub forecast_doses: Option<f64>,
    pub display: Vec<DisplayRow>,
}

/// Generic key/value row that plugin authors emit for the UI to render their
/// calculation breakdown. The built-in methods do not use this — they have
/// dedicated typed snapshots.
#[derive(TS, Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DisplayRow {
    pub label: String,
    pub formula: Option<String>,
    pub substitution: Option<String>,
    pub result: String,
}

// ---- Legacy population reshape ---------------------------------------
//
// Pre-v2.20 sites carried population forecasts as three flat columns —
// `vaccine_courses` (JSON array), `forecast_total_doses`, `forecast_total_units`
// — instead of a `ForecastSnapshot::Population` envelope. The v2.20 migration
// reshapes these in place, and the requisition_line sync translation does the
// same reshape on ingest when a record arrives from a site that still uses the
// flat fields. One helper, two callers, identical output.

/// Reshape the three legacy population fields into a `Population(Ok(...))`
/// snapshot. Returns `None` if `vaccine_courses_json` is empty/None or fails
/// to parse — callers should treat that as "no snapshot to synthesise" and
/// leave the row's `forecast_data` null.
///
/// Headline `forecast_monthly_usage` is the sum of per-course rates, where
/// each course's rate is `forecastUnits / (supplyPeriodMonths +
/// bufferStockMonths)`. A course with a zero or missing period contributes
/// `0.0` rather than producing a divide-by-zero.
pub fn reshape_legacy_population_fields(
    vaccine_courses_json: Option<&str>,
    forecast_total_doses: Option<f64>,
) -> Option<ForecastSnapshot> {
    let json = vaccine_courses_json?;
    let raw_courses: Vec<Value> = serde_json::from_str(json).ok()?;

    let mut headline_monthly_usage = 0.0_f64;
    let mut courses = Vec::with_capacity(raw_courses.len());
    for c in &raw_courses {
        let forecast_units = json_f64(c, "forecastUnits");
        let supply = json_f64(c, "supplyPeriodMonths");
        let buffer = json_f64(c, "bufferStockMonths");
        let period = supply + buffer;
        let monthly_usage = if period > 0.0 {
            forecast_units / period
        } else {
            0.0
        };
        headline_monthly_usage += monthly_usage;

        courses.push(PopulationCourseData {
            course_title: c
                .get("courseTitle")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string(),
            number_of_doses: json_i64(c, "numberOfDoses") as i32,
            coverage_rate: json_f64(c, "coverageRate"),
            target_population: json_f64(c, "targetPopulation"),
            wastage_rate: json_f64(c, "wastageRate"),
            loss_factor: json_f64(c, "lossFactor"),
            annual_target_doses: json_f64(c, "annualTargetDoses"),
            buffer_stock_months: buffer,
            supply_period_months: supply,
            doses_per_unit: json_i64(c, "dosesPerUnit") as i32,
            forecast_doses: json_f64(c, "forecastDoses"),
            forecast_units,
            forecast_monthly_usage: monthly_usage,
        });
    }

    Some(ForecastSnapshot::Population(PopulationOutcome::Ok(
        PopulationSnapshot {
            forecast_monthly_usage: headline_monthly_usage,
            forecast_total_doses: forecast_total_doses.unwrap_or(0.0),
            vaccine_courses: courses,
        },
    )))
}

/// Inverse of `reshape_legacy_population_fields` for the sync push path —
/// produce the three legacy fields (`forecast_total_units`,
/// `forecast_total_doses`, `vaccine_courses` JSON) from a `Population(Ok)`
/// snapshot. Returns `None` for any other variant or outcome — non-population
/// snapshots have no legacy representation.
///
/// `forecast_total_units` is the sum of per-course `forecast_units`
/// (period-scaled total), matching the legacy column's semantics — *not* the
/// new `forecast_monthly_usage` rate, which would be a different number.
pub fn to_legacy_population_fields(snapshot: &ForecastSnapshot) -> Option<LegacyPopulationFields> {
    let pop = match snapshot {
        ForecastSnapshot::Population(PopulationOutcome::Ok(p)) => p,
        _ => return None,
    };
    let total_units: f64 = pop.vaccine_courses.iter().map(|c| c.forecast_units).sum();
    let courses_json = to_legacy_vaccine_courses_json_inner(pop);
    Some(LegacyPopulationFields {
        forecast_total_units: total_units,
        forecast_total_doses: pop.forecast_total_doses,
        vaccine_courses: courses_json,
    })
}

pub struct LegacyPopulationFields {
    pub forecast_total_units: f64,
    pub forecast_total_doses: f64,
    pub vaccine_courses: String,
}

fn to_legacy_vaccine_courses_json_inner(pop: &PopulationSnapshot) -> String {
    let courses: Vec<Value> = pop
        .vaccine_courses
        .iter()
        .map(|c| {
            serde_json::json!({
                "courseTitle": c.course_title,
                "numberOfDoses": c.number_of_doses,
                "coverageRate": c.coverage_rate,
                "targetPopulation": c.target_population,
                "wastageRate": c.wastage_rate,
                "lossFactor": c.loss_factor,
                "annualTargetDoses": c.annual_target_doses,
                "bufferStockMonths": c.buffer_stock_months,
                "supplyPeriodMonths": c.supply_period_months,
                "dosesPerUnit": c.doses_per_unit,
                "forecastDoses": c.forecast_doses,
                "forecastUnits": c.forecast_units,
            })
        })
        .collect();
    // Vec<Value> → String never fails.
    serde_json::to_string(&courses).expect("serialising Vec<Value> never fails")
}

fn json_f64(v: &Value, key: &str) -> f64 {
    v.get(key).and_then(|x| x.as_f64()).unwrap_or(0.0)
}

fn json_i64(v: &Value, key: &str) -> i64 {
    v.get(key).and_then(|x| x.as_i64()).unwrap_or(0)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn forecast_method_round_trip() {
        for method in [
            ForecastMethod::AverageMonthlyConsumption,
            ForecastMethod::Population,
            ForecastMethod::AncillaryRatio,
            ForecastMethod::Plugin("foo_plugin".to_string()),
        ] {
            assert_eq!(
                ForecastMethod::from_storage(&method.to_storage()),
                Some(method)
            );
        }
        assert_eq!(ForecastMethod::from_storage("garbage"), None);
    }

    #[test]
    fn amc_ok_round_trip() {
        let default = ForecastSnapshot::Amc(AmcOutcome::Ok(AmcSnapshot {
            forecast_monthly_usage: 10.0,
            breakdown: AmcSnapshotBreakdown::Default(DefaultAmcSnapshotBreakdown {
                lookback_months: 3.0,
                total_consumption: 30.0,
                number_of_days: 91.0,
                days_out_of_stock: Some(5.0),
                dos_adjustment_factor: 91.0 / 86.0,
                monthly_consumption: vec![
                    MonthlyConsumption {
                        month: NaiveDate::from_ymd_opt(2025, 9, 1).unwrap(),
                        consumption: 10.0,
                    },
                    MonthlyConsumption {
                        month: NaiveDate::from_ymd_opt(2025, 10, 1).unwrap(),
                        consumption: 12.0,
                    },
                    MonthlyConsumption {
                        month: NaiveDate::from_ymd_opt(2025, 11, 1).unwrap(),
                        consumption: 8.0,
                    },
                ],
            }),
        }));
        let json = serde_json::to_string(&default).unwrap();
        let parsed: ForecastSnapshot = serde_json::from_str(&json).unwrap();
        assert_eq!(default, parsed);
        assert!(json.contains("\"method\":\"amc\""));
        assert!(json.contains("\"status\":\"ok\""));
        assert!(json.contains("\"source\":\"default\""));
    }

    #[test]
    fn amc_error_round_trip() {
        let snap = ForecastSnapshot::Amc(AmcOutcome::Error(AmcError::NoConsumptionHistory {
            lookback_months: 3.0,
        }));
        let json = serde_json::to_string(&snap).unwrap();
        let parsed: ForecastSnapshot = serde_json::from_str(&json).unwrap();
        assert_eq!(snap, parsed);
        assert!(json.contains("\"status\":\"error\""));
        assert!(json.contains("\"kind\":\"noConsumptionHistory\""));
        assert_eq!(parsed.forecast_monthly_usage(), 0.0);
        assert!(parsed.is_error());
    }

    #[test]
    fn population_error_round_trip() {
        let snap = ForecastSnapshot::Population(PopulationOutcome::Error(
            PopulationError::MissingStoreConfig {
                store_id: "store_a".into(),
                missing_fields: vec![
                    MissingStoreField::PopulationServed,
                    MissingStoreField::SupplyInterval,
                ],
            },
        ));
        let json = serde_json::to_string(&snap).unwrap();
        let parsed: ForecastSnapshot = serde_json::from_str(&json).unwrap();
        assert_eq!(snap, parsed);
        assert!(json.contains("\"method\":\"population\""));
        assert!(json.contains("\"kind\":\"missingStoreConfig\""));
        assert!(json.contains("\"missingFields\":[\"populationServed\",\"supplyInterval\"]"));
    }

    #[test]
    fn ancillary_ratio_ok_round_trip() {
        let snap = ForecastSnapshot::AncillaryRatio(AncillaryRatioOutcome::Ok(
            AncillaryRatioSnapshot {
                forecast_monthly_usage: 12.0,
                contributions: vec![AncillaryContribution {
                    parent_line_id: "p1".into(),
                    parent_item_id: "vaccine".into(),
                    parent_item_name: "Vaccine".into(),
                    parent_forecast_monthly_usage: 1200.0,
                    item_quantity: 100.0,
                    ancillary_quantity: 1.0,
                    monthly_usage: 12.0,
                }],
            },
        ));
        let json = serde_json::to_string(&snap).unwrap();
        let parsed: ForecastSnapshot = serde_json::from_str(&json).unwrap();
        assert_eq!(snap, parsed);
        assert!(json.contains("\"method\":\"ancillary_ratio\""));
    }

    #[test]
    fn ancillary_ratio_error_round_trip() {
        let snap = ForecastSnapshot::AncillaryRatio(AncillaryRatioOutcome::Error(
            AncillaryRatioError::NoParentsInRequisition {
                item_id: "safety_box".into(),
            },
        ));
        let json = serde_json::to_string(&snap).unwrap();
        let parsed: ForecastSnapshot = serde_json::from_str(&json).unwrap();
        assert_eq!(snap, parsed);
        assert!(json.contains("\"kind\":\"noParentsInRequisition\""));
    }

    #[test]
    fn plugin_error_round_trip() {
        let snap = ForecastSnapshot::Plugin(PluginOutcome::Error(PluginError::InvocationFailed {
            plugin_code: "my_plugin".into(),
            plugin_version: "1.2.3".into(),
            message: "boom".into(),
        }));
        let json = serde_json::to_string(&snap).unwrap();
        let parsed: ForecastSnapshot = serde_json::from_str(&json).unwrap();
        assert_eq!(snap, parsed);
        assert!(json.contains("\"kind\":\"invocationFailed\""));
        assert!(json.contains("\"pluginCode\":\"my_plugin\""));
    }

    #[test]
    fn reshape_legacy_population_none_inputs() {
        assert!(reshape_legacy_population_fields(None, None).is_none());
        assert!(reshape_legacy_population_fields(None, Some(123.0)).is_none());
        assert!(reshape_legacy_population_fields(Some("not json"), Some(0.0)).is_none());
    }

    #[test]
    fn reshape_legacy_population_single_course() {
        // 1875 / (3 + 2) = 375 per-course monthly
        let json = r#"[{"courseTitle":"X","numberOfDoses":3,"coverageRate":60,
            "targetPopulation":2500,"wastageRate":50,"lossFactor":2,
            "annualTargetDoses":9000,"bufferStockMonths":2,"supplyPeriodMonths":3,
            "dosesPerUnit":2,"forecastDoses":3750,"forecastUnits":1875}]"#;
        let snap = reshape_legacy_population_fields(Some(json), Some(3750.0)).unwrap();
        match snap {
            ForecastSnapshot::Population(PopulationOutcome::Ok(p)) => {
                assert_eq!(p.forecast_monthly_usage, 375.0);
                assert_eq!(p.forecast_total_doses, 3750.0);
                assert_eq!(p.vaccine_courses.len(), 1);
                let c = &p.vaccine_courses[0];
                assert_eq!(c.course_title, "X");
                assert_eq!(c.forecast_units, 1875.0);
                assert_eq!(c.forecast_monthly_usage, 375.0);
            }
            _ => panic!("expected Population Ok"),
        }
    }

    #[test]
    fn reshape_legacy_population_multi_course_sums() {
        // Per-course rates: 100 / (5+0) = 20 and 90 / (3+0) = 30 → 50.
        let json = r#"[
            {"courseTitle":"A","forecastUnits":100,"supplyPeriodMonths":5,"bufferStockMonths":0},
            {"courseTitle":"B","forecastUnits":90,"supplyPeriodMonths":3,"bufferStockMonths":0}
        ]"#;
        let snap = reshape_legacy_population_fields(Some(json), Some(500.0)).unwrap();
        match snap {
            ForecastSnapshot::Population(PopulationOutcome::Ok(p)) => {
                assert_eq!(p.forecast_monthly_usage, 50.0);
                assert_eq!(p.vaccine_courses.len(), 2);
            }
            _ => panic!("expected Population Ok"),
        }
    }

    #[test]
    fn reshape_legacy_population_zero_period_safe() {
        // Period of zero must not divide by zero; the course contributes 0.
        let json =
            r#"[{"courseTitle":"Z","forecastUnits":500,"supplyPeriodMonths":0,"bufferStockMonths":0}]"#;
        let snap = reshape_legacy_population_fields(Some(json), Some(0.0)).unwrap();
        match snap {
            ForecastSnapshot::Population(PopulationOutcome::Ok(p)) => {
                assert_eq!(p.forecast_monthly_usage, 0.0);
                assert_eq!(p.vaccine_courses[0].forecast_monthly_usage, 0.0);
            }
            _ => panic!("expected Population Ok"),
        }
    }

    #[test]
    fn reshape_legacy_population_round_trip_through_legacy_fields() {
        let json = r#"[{"courseTitle":"R","numberOfDoses":3,"coverageRate":60,
            "targetPopulation":2500,"wastageRate":50,"lossFactor":2,
            "annualTargetDoses":9000,"bufferStockMonths":2,"supplyPeriodMonths":3,
            "dosesPerUnit":2,"forecastDoses":3750,"forecastUnits":1875}]"#;
        let snap = reshape_legacy_population_fields(Some(json), Some(3750.0)).unwrap();
        let legacy = to_legacy_population_fields(&snap).unwrap();
        // Total units is the period-scaled sum, not the monthly rate.
        assert_eq!(legacy.forecast_total_units, 1875.0);
        assert_eq!(legacy.forecast_total_doses, 3750.0);
        let snap2 =
            reshape_legacy_population_fields(Some(&legacy.vaccine_courses), Some(3750.0)).unwrap();
        assert_eq!(snap, snap2);
    }

    #[test]
    fn to_legacy_population_fields_skips_non_population() {
        let amc = ForecastSnapshot::Amc(AmcOutcome::Error(AmcError::NoConsumptionHistory {
            lookback_months: 3.0,
        }));
        assert!(to_legacy_population_fields(&amc).is_none());
    }
}
