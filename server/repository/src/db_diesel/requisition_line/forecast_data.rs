//! The breakdown stored in `requisition_line.forecast_data`, and the conversion to and
//! from the legacy forecast fields (`forecast_total_units`, `forecast_total_doses`,
//! `vaccine_courses`) that sites older than 3.04 read and write.
//!
//! The database holds only the current shape. The legacy shape exists at the sync
//! boundary (the V5 translator, V7 outgoing and incoming translation) and in the 3.04
//! migration, all of which convert through the two functions here.

use serde::{Deserialize, Serialize};

use super::ForecastMethod;

/// A line's forecast breakdown, keyed by method. An `amc` line stores none.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ForecastData {
    Population(PopulationForecast),
    AncillaryRatio(AncillaryRatioForecast),
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PopulationForecast {
    /// None on a forecast converted from the legacy shape, which doesn't carry it
    pub population_served: Option<f64>,
    pub courses: Vec<PopulationForecastCourse>,
}

/// One contribution per covering course-and-demographic.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PopulationForecastCourse {
    pub course_name: String,
    pub demographic_name: Option<String>,
    pub number_of_doses: i32,
    pub coverage_rate: f64,
    pub wastage_rate: f64,
    pub target_population: f64,
    pub loss_factor: f64,
    pub annual_target_doses: f64,
    pub doses_per_unit: f64,
    pub monthly_doses: f64,
    pub monthly_units: f64,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct AncillaryRatioForecast {
    pub principals: Vec<AncillaryRatioPrincipal>,
}

/// One per principal line on the order.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct AncillaryRatioPrincipal {
    pub item_id: String,
    pub principal_monthly_consumption: f64,
    /// The configured ratio pair: `item_quantity` principal units to `ancillary_quantity`
    /// ancillary units
    pub item_quantity: f64,
    pub ancillary_quantity: f64,
}

impl AncillaryRatioPrincipal {
    pub fn monthly_consumption(&self) -> f64 {
        if self.item_quantity == 0.0 {
            return 0.0;
        }
        self.principal_monthly_consumption * self.ancillary_quantity / self.item_quantity
    }
}

impl ForecastData {
    pub fn to_json(&self) -> String {
        // Serialising plain structs of strings and numbers can't fail
        serde_json::to_string(self).unwrap_or_default()
    }

    pub fn from_json(json: &str) -> Option<Self> {
        serde_json::from_str(json).ok()
    }
}

/// The legacy forecast fields, as sites older than 3.04 store and sync them.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub struct LegacyForecast {
    pub forecast_total_units: Option<f64>,
    pub forecast_total_doses: Option<f64>,
    /// JSON array of [`LegacyCourse`]
    pub vaccine_courses: Option<String>,
}

/// One course in the legacy `vaccine_courses` JSON. Its figures cover a supply period:
/// `supply_period_months + buffer_stock_months`.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LegacyCourse {
    /// "Course name (demographic)", the parentheses empty without a demographic
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
}

/// A line's forecast in the current shape.
#[derive(Debug, Clone, PartialEq)]
pub struct LineForecast {
    pub method: ForecastMethod,
    pub monthly_consumption: f64,
    pub data: Option<ForecastData>,
}

impl LineForecast {
    pub fn amc(average_monthly_consumption: f64) -> Self {
        LineForecast {
            method: ForecastMethod::Amc,
            monthly_consumption: average_monthly_consumption,
            data: None,
        }
    }

    pub fn data_json(&self) -> Option<String> {
        self.data.as_ref().map(ForecastData::to_json)
    }
}

/// Legacy → current. A line with readable `vaccine_courses` is a Population line whose
/// monthly demand is each course's units spread over its supply period; anything else is
/// an AMC line.
pub fn forecast_from_legacy(
    legacy: &LegacyForecast,
    average_monthly_consumption: f64,
) -> LineForecast {
    let courses: Vec<LegacyCourse> = legacy
        .vaccine_courses
        .as_deref()
        .and_then(|json| serde_json::from_str(json).ok())
        .unwrap_or_default();

    if courses.is_empty() {
        return LineForecast::amc(average_monthly_consumption);
    }

    let courses: Vec<PopulationForecastCourse> = courses
        .into_iter()
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

    LineForecast {
        method: ForecastMethod::Population,
        monthly_consumption: courses.iter().map(|c| c.monthly_units).sum(),
        data: Some(ForecastData::Population(PopulationForecast {
            population_served: None,
            courses,
        })),
    }
}

/// Current → legacy. Only a Population line has a legacy form; its supply period is the
/// requisition's target months, with no buffer.
pub fn forecast_to_legacy(
    method: &ForecastMethod,
    forecast_data: Option<&str>,
    target_months: f64,
) -> LegacyForecast {
    let Some(ForecastData::Population(population)) = (match method {
        ForecastMethod::Population => forecast_data.and_then(ForecastData::from_json),
        _ => None,
    }) else {
        return LegacyForecast::default();
    };

    let courses: Vec<LegacyCourse> = population
        .courses
        .into_iter()
        .map(|course| LegacyCourse {
            course_title: format!(
                "{} ({})",
                course.course_name,
                course.demographic_name.as_deref().unwrap_or_default()
            ),
            number_of_doses: course.number_of_doses,
            coverage_rate: course.coverage_rate,
            target_population: course.target_population,
            wastage_rate: course.wastage_rate,
            loss_factor: course.loss_factor,
            annual_target_doses: course.annual_target_doses,
            buffer_stock_months: 0.0,
            supply_period_months: target_months,
            doses_per_unit: course.doses_per_unit.round() as i32,
            forecast_doses: course.monthly_doses * target_months,
            forecast_units: course.monthly_units * target_months,
        })
        .collect();

    LegacyForecast {
        forecast_total_units: Some(courses.iter().map(|c| c.forecast_units).sum()),
        forecast_total_doses: Some(courses.iter().map(|c| c.forecast_doses).sum()),
        vaccine_courses: serde_json::to_string(&courses).ok(),
    }
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

    fn legacy_course(title: &str, horizon: (f64, f64), units: f64, doses: f64) -> LegacyCourse {
        LegacyCourse {
            course_title: title.to_string(),
            number_of_doses: 3,
            coverage_rate: 80.0,
            target_population: 2500.0,
            wastage_rate: 10.0,
            loss_factor: 1.0 / 0.9,
            annual_target_doses: 6666.666666666667,
            supply_period_months: horizon.0,
            buffer_stock_months: horizon.1,
            doses_per_unit: 2,
            forecast_doses: doses,
            forecast_units: units,
        }
    }

    #[test]
    fn legacy_population_spreads_each_course_over_its_supply_period() {
        let legacy = LegacyForecast {
            forecast_total_units: Some(1500.0),
            forecast_total_doses: Some(3000.0),
            vaccine_courses: Some(
                serde_json::to_string(&vec![
                    legacy_course("Course A (Children)", (3.0, 2.0), 1000.0, 2000.0),
                    legacy_course("Course B ()", (3.0, 2.0), 500.0, 1000.0),
                ])
                .unwrap(),
            ),
        };

        let forecast = forecast_from_legacy(&legacy, 7.0);
        assert_eq!(forecast.method, ForecastMethod::Population);
        assert_eq!(forecast.monthly_consumption, 300.0);
        // Monthly demand × the old horizon reproduces the old total
        assert_eq!(
            forecast.monthly_consumption * 5.0,
            legacy.forecast_total_units.unwrap()
        );

        let Some(ForecastData::Population(population)) = forecast.data else {
            panic!("expected a population breakdown");
        };
        assert_eq!(population.courses[0].course_name, "Course A");
        assert_eq!(
            population.courses[0].demographic_name.as_deref(),
            Some("Children")
        );
        assert_eq!(population.courses[0].monthly_doses, 400.0);
        assert_eq!(population.courses[1].course_name, "Course B");
        assert_eq!(population.courses[1].demographic_name, None);
    }

    #[test]
    fn legacy_without_courses_is_amc() {
        let amc = |vaccine_courses: Option<&str>| {
            forecast_from_legacy(
                &LegacyForecast {
                    forecast_total_units: Some(10.0),
                    forecast_total_doses: None,
                    vaccine_courses: vaccine_courses.map(str::to_string),
                },
                12.0,
            )
        };
        assert_eq!(amc(None), LineForecast::amc(12.0));
        assert_eq!(amc(Some("[]")), LineForecast::amc(12.0));
        assert_eq!(amc(Some("course1,course2")), LineForecast::amc(12.0));
    }

    #[test]
    fn population_round_trips_through_legacy_at_the_target_months() {
        let legacy = LegacyForecast {
            forecast_total_units: Some(1000.0),
            forecast_total_doses: Some(2000.0),
            vaccine_courses: Some(
                serde_json::to_string(&vec![legacy_course(
                    "Course A (Children)",
                    (3.0, 2.0),
                    1000.0,
                    2000.0,
                )])
                .unwrap(),
            ),
        };
        let forecast = forecast_from_legacy(&legacy, 0.0);

        let back = forecast_to_legacy(&forecast.method, forecast.data_json().as_deref(), 4.0);
        assert_eq!(back.forecast_total_units, Some(800.0));
        assert_eq!(back.forecast_total_doses, Some(1600.0));
        let courses: Vec<LegacyCourse> =
            serde_json::from_str(back.vaccine_courses.as_deref().unwrap()).unwrap();
        assert_eq!(courses[0].course_title, "Course A (Children)");
        assert_eq!(courses[0].supply_period_months, 4.0);
        assert_eq!(courses[0].buffer_stock_months, 0.0);

        // And reads back as the same monthly demand
        assert_eq!(
            forecast_from_legacy(&back, 0.0).monthly_consumption,
            forecast.monthly_consumption
        );
    }

    #[test]
    fn other_methods_have_no_legacy_form() {
        assert_eq!(
            forecast_to_legacy(&ForecastMethod::Amc, None, 3.0),
            LegacyForecast::default()
        );
        let ancillary = ForecastData::AncillaryRatio(AncillaryRatioForecast { principals: vec![] });
        assert_eq!(
            forecast_to_legacy(
                &ForecastMethod::AncillaryRatio,
                Some(&ancillary.to_json()),
                3.0
            ),
            LegacyForecast::default()
        );
    }
}
