use repository::{
    EqualFilter, NameFilter, NameRepository, RepositoryError, StorageConnection, StoreFilter,
    VaccinationCourseRepository, VaccinationCourseRow,
};
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};
use std::collections::{HashMap, HashSet};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ForecastQuantityData {
    pub total_forecast_units: f64,
    pub total_forecast_doses: f64,
    pub course_data: Vec<CourseData>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct CourseData {
    pub course_title: String,
    pub number_of_doses: i32,
    pub coverage_rate: f64,
    pub target_population: f64,
    pub loss_factor: f64,
    pub annual_target_doses: f64,
    pub buffer_stock_months: f64,
    pub supply_period_months: f64,
    pub doses_per_unit: i32,
    pub forecast_doses: f64,
    pub forecast_units: f64,
}

struct StoreProperties {
    buffer_stock_months: f64,
    supply_period_months: f64,
    population_served: f64,
}

fn get_store_properties_and_validate(
    connection: &StorageConnection,
    store_id: &str,
) -> Result<Option<StoreProperties>, RepositoryError> {
    let store_properties: Map<String, Value> = NameRepository::new(connection)
        .query_by_filter(
            store_id,
            NameFilter::new()
                .store(StoreFilter::new().id(EqualFilter::equal_to(store_id.to_string()))),
        )?
        .pop()
        .and_then(|n| n.properties)
        .and_then(|json_str| serde_json::from_str(&json_str).ok())
        .unwrap_or_default();

    let buffer_stock_months = store_properties
        .get("buffer_stock")
        .and_then(|v| v.as_f64())
        .unwrap_or(0.0);

    let supply_period_months = store_properties
        .get("supply_interval")
        .and_then(|v| v.as_f64());

    let population_served = store_properties
        .get("population_served")
        .and_then(|v| v.as_f64());

    match (supply_period_months, population_served) {
        (Some(supply), Some(population)) => Ok(Some(StoreProperties {
            buffer_stock_months,
            supply_period_months: supply,
            population_served: population,
        })),
        _ => {
            log::debug!(
                "Forecasting: Missing Store Properties for store_id {store_id}. Values:\n - Supply interval: {supply_period_months:?}\n - Population served: {population_served:?}"
            );
            Ok(None)
        }
    }
}

struct CourseGroup {
    course_name: String,
    demographic_name: Option<String>,
    coverage_rate: f64,
    wastage_rate: f64,
    population_percentage: f64,
    vaccine_doses: i32,
    dose_labels: HashSet<String>,
}

fn calculate_forecast_quantities(
    connection: &StorageConnection,
    StoreProperties {
        buffer_stock_months,
        supply_period_months,
        population_served,
    }: &StoreProperties,
    item_ids: Vec<String>,
) -> Result<HashMap<String, Option<ForecastQuantityData>>, RepositoryError> {
    let vaccination_courses =
        VaccinationCourseRepository::new(connection).query_by_item_ids(item_ids.clone())?;

    let mut results = HashMap::new();

    for item_id in item_ids {
        let item_vaccination_courses: Vec<&VaccinationCourseRow> = vaccination_courses
            .iter()
            .filter(|course| course.item_id == item_id)
            .collect();

        if item_vaccination_courses.is_empty() {
            log::debug!("Forecasting: No vaccine courses for item {item_id}");
            results.insert(item_id, None);
            continue;
        }

        let mut course_groups: HashMap<
            String, // course key (vaccine_course_name + demographic_name)
            CourseGroup,
        > = HashMap::new();

        for course in item_vaccination_courses {
            let course_key = format!(
                "{}-{}",
                course.vaccine_course_name,
                course.demographic_name.as_deref().unwrap_or("")
            );

            let group = course_groups
                .entry(course_key)
                .or_insert_with(|| CourseGroup {
                    course_name: course.vaccine_course_name.clone(),
                    demographic_name: course.demographic_name.clone(),
                    coverage_rate: course.coverage_rate,
                    wastage_rate: course.wastage_rate,
                    population_percentage: course.population_percentage.unwrap_or(100.0),
                    vaccine_doses: course.vaccine_doses,
                    dose_labels: HashSet::new(),
                });

            group.dose_labels.insert(course.dose_label.clone());
        }

        let mut forecast_values = Vec::new();
        let mut total_forecast_doses = 0.0;
        let mut total_forecast_units = 0.0;

        for (_, group) in course_groups {
            let coverage_rate = group.coverage_rate;
            let wastage_rate = group.wastage_rate;
            let population_percentage = group.population_percentage;

            let target_population = population_served * (population_percentage / 100.0);
            let loss_factor = 1.0 / (1.0 - wastage_rate / 100.0);

            let doses_per_unit = if group.vaccine_doses == 0 {
                1
            } else {
                group.vaccine_doses
            };

            let number_of_doses = group.dose_labels.len() as f64;
            let annual_target_doses =
                target_population * number_of_doses * (coverage_rate / 100.0) * loss_factor;
            let forecast_doses =
                (annual_target_doses / 12.0) * (supply_period_months + buffer_stock_months);
            let forecast_units = forecast_doses / doses_per_unit as f64;

            let course_title = format!(
                "{} ({})",
                group.course_name,
                group.demographic_name.as_deref().unwrap_or_default()
            );

            forecast_values.push(CourseData {
                course_title,
                number_of_doses: number_of_doses as i32,
                coverage_rate,
                target_population,
                loss_factor,
                annual_target_doses,
                buffer_stock_months: *buffer_stock_months,
                supply_period_months: *supply_period_months,
                doses_per_unit,
                forecast_doses,
                forecast_units,
            });

            total_forecast_doses += forecast_doses;
            total_forecast_units += forecast_units;
        }

        let forecast_data = if forecast_values.is_empty() {
            None
        } else {
            Some(ForecastQuantityData {
                total_forecast_units,
                total_forecast_doses,
                course_data: forecast_values,
            })
        };

        results.insert(item_id, forecast_data);
    }

    Ok(results)
}
