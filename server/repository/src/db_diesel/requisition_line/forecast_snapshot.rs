use chrono::NaiveDate;
use serde::{Deserialize, Serialize};
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
}
