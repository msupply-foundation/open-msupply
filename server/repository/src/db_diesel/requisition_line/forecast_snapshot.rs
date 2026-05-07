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
/// Forecasting methods produce a *rate* — `forecast_monthly_usage` — not a
/// total quantity. Stock-management code converts that rate into a suggested
/// quantity using horizon information (e.g. `max_months_of_stock` or per-course
/// `supply_period_months`) sourced live, so the snapshot stays decoupled from
/// stock-management settings that may change after the snapshot is taken.
#[derive(TS, Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "method", rename_all = "snake_case")]
pub enum ForecastSnapshot {
    Amc(AmcSnapshot),
    Population(PopulationSnapshot),
    AncillaryRatio(AncillaryRatioSnapshot),
    Plugin(PluginSnapshot),
}

impl ForecastSnapshot {
    pub fn forecast_monthly_usage(&self) -> f64 {
        match self {
            ForecastSnapshot::Amc(s) => s.forecast_monthly_usage,
            ForecastSnapshot::Population(s) => s.forecast_monthly_usage,
            ForecastSnapshot::AncillaryRatio(s) => s.forecast_monthly_usage,
            ForecastSnapshot::Plugin(s) => s.forecast_monthly_usage,
        }
    }

    pub fn forecast_doses(&self) -> Option<f64> {
        match self {
            ForecastSnapshot::Population(s) => Some(s.forecast_total_doses),
            ForecastSnapshot::Plugin(s) => s.forecast_doses,
            _ => None,
        }
    }
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

#[derive(TS, Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AncillaryRatioSnapshot {
    pub forecast_monthly_usage: f64,
    pub contributions: Vec<AncillaryContribution>,
    /// Set when the chosen method couldn't fully resolve (e.g. parent absent
    /// from the requisition). Carries an opaque tag the UI maps to a message.
    pub fallback: Option<String>,
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
    fn amc_breakdown_round_trip() {
        let default = ForecastSnapshot::Amc(AmcSnapshot {
            forecast_monthly_usage: 10.0,
            breakdown: AmcSnapshotBreakdown::Default(DefaultAmcSnapshotBreakdown {
                lookback_months: 3.0,
                total_consumption: 30.0,
                number_of_days: 91.0,
                days_out_of_stock: Some(5.0),
                dos_adjustment_factor: 91.0 / 86.0,
            }),
        });
        let json = serde_json::to_string(&default).unwrap();
        let parsed: ForecastSnapshot = serde_json::from_str(&json).unwrap();
        assert_eq!(default, parsed);
        assert!(json.contains("\"source\":\"default\""));

        let plugin = ForecastSnapshot::Amc(AmcSnapshot {
            forecast_monthly_usage: 5.5,
            breakdown: AmcSnapshotBreakdown::Plugin {
                code: "weighted_amc".into(),
            },
        });
        let json = serde_json::to_string(&plugin).unwrap();
        let parsed: ForecastSnapshot = serde_json::from_str(&json).unwrap();
        assert_eq!(plugin, parsed);
        assert!(json.contains("\"source\":\"plugin\""));
    }

    #[test]
    fn snapshot_round_trip_via_json() {
        let snap = ForecastSnapshot::AncillaryRatio(AncillaryRatioSnapshot {
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
            fallback: None,
        });
        let json = serde_json::to_string(&snap).unwrap();
        let parsed: ForecastSnapshot = serde_json::from_str(&json).unwrap();
        assert_eq!(snap, parsed);
        assert!(json.contains("\"method\":\"ancillary_ratio\""));
    }
}
