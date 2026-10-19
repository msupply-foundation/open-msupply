use repository::{
    EqualFilter, PopulationForecast, PopulationForecastCourse, RepositoryError, StorageConnection,
    VaccinationCourseRepository, VaccinationCourseRow,
    vaccine_course::vaccine_course_store_config::{
        VaccineCourseStoreConfigFilter, VaccineCourseStoreConfigRepository,
    },
};
use std::collections::{BTreeMap, HashMap, HashSet};

struct CourseGroup {
    course_name: String,
    demographic_name: Option<String>,
    coverage_rate: f64,
    wastage_rate: f64,
    population_percentage: f64,
    vaccine_doses: i32,
    dose_labels: HashSet<String>,
}

/// The vaccine courses covering each of `item_ids`, as course-and-demographic groups.
/// Items no course covers are absent.
pub(super) struct CoveringCourses(HashMap<String, Vec<CourseGroup>>);

impl CoveringCourses {
    pub(super) fn load(
        connection: &StorageConnection,
        store_id: &str,
        item_ids: &[String],
    ) -> Result<Self, RepositoryError> {
        let vaccination_courses =
            VaccinationCourseRepository::new(connection).query_by_item_ids(item_ids.to_vec())?;

        // Per-store overrides of a course's wastage and coverage rates
        let store_config_map: HashMap<String, (Option<f64>, Option<f64>)> =
            VaccineCourseStoreConfigRepository::new(connection)
                .query_by_filter(
                    VaccineCourseStoreConfigFilter::new()
                        .store_id(EqualFilter::equal_to(store_id.to_string())),
                )?
                .into_iter()
                .map(|row| (row.vaccine_course_id, (row.wastage_rate, row.coverage_rate)))
                .collect();

        // item → (course name, demographic) → group; ordered so the breakdown is stable
        let mut by_item: HashMap<String, BTreeMap<(String, String), CourseGroup>> = HashMap::new();

        for course in vaccination_courses {
            let VaccinationCourseRow {
                id,
                vaccine_course_name,
                coverage_rate,
                wastage_rate,
                dose_label,
                item_id,
                vaccine_doses,
                demographic_name,
                population_percentage,
                ..
            } = course;

            let key = (
                vaccine_course_name.clone(),
                demographic_name.clone().unwrap_or_default(),
            );
            let group = by_item
                .entry(item_id)
                .or_default()
                .entry(key)
                .or_insert_with(|| {
                    let store_config = store_config_map.get(&id);
                    CourseGroup {
                        course_name: vaccine_course_name,
                        demographic_name,
                        coverage_rate: store_config.and_then(|(_, c)| *c).unwrap_or(coverage_rate),
                        wastage_rate: store_config.and_then(|(w, _)| *w).unwrap_or(wastage_rate),
                        population_percentage: population_percentage.unwrap_or(100.0),
                        vaccine_doses,
                        dose_labels: HashSet::new(),
                    }
                });
            group.dose_labels.insert(dose_label);
        }

        Ok(CoveringCourses(
            by_item
                .into_iter()
                .map(|(item_id, groups)| (item_id, groups.into_values().collect()))
                .collect(),
        ))
    }

    pub(super) fn covers(&self, item_id: &str) -> bool {
        self.0.get(item_id).is_some_and(|groups| !groups.is_empty())
    }

    /// The share of `item_id`'s demand its covering courses expect to be wasted, as a
    /// percentage: each course's rate, weighted by its monthly units as the item's
    /// Population forecast weights them (the population served cancels out). A rate the
    /// forecast ignores counts as none, and an item no course covers has none.
    pub(super) fn wastage_rate(&self, item_id: &str) -> f64 {
        let courses = self.forecast(item_id, 1.0).courses;
        let total: f64 = courses.iter().map(|course| course.monthly_units).sum();
        if total <= 0.0 {
            return 0.0;
        }
        courses
            .iter()
            .map(|course| {
                course.monthly_units * honoured_wastage_rate(course.wastage_rate).unwrap_or(0.0)
            })
            .sum::<f64>()
            / total
    }

    /// The item's Population forecast for a store serving `population_served`. One
    /// contribution per covering course-and-demographic; the line's monthly demand is the
    /// sum of their monthly units.
    pub(super) fn forecast(&self, item_id: &str, population_served: f64) -> PopulationForecast {
        let courses = self
            .0
            .get(item_id)
            .map(|groups| {
                groups
                    .iter()
                    .map(|group| course_forecast(group, population_served))
                    .collect()
            })
            .unwrap_or_default();

        PopulationForecast {
            population_served: Some(population_served),
            courses,
        }
    }
}

/// Nothing validates a configured wastage rate; outside [0, 100) it has no meaningful
/// loss factor (100% divides by zero, above it turns demand negative), so it's ignored
fn honoured_wastage_rate(wastage_rate: f64) -> Option<f64> {
    (0.0..100.0).contains(&wastage_rate).then_some(wastage_rate)
}

fn course_forecast(group: &CourseGroup, population_served: f64) -> PopulationForecastCourse {
    let target_population = population_served * (group.population_percentage / 100.0);
    let loss_factor = match honoured_wastage_rate(group.wastage_rate) {
        Some(wastage_rate) => 1.0 / (1.0 - wastage_rate / 100.0),
        None => {
            log::warn!(
                "Ignoring wastage rate {}% on course {}",
                group.wastage_rate,
                group.course_name
            );
            1.0
        }
    };
    let number_of_doses = group.dose_labels.len() as i32;
    let annual_target_doses =
        target_population * number_of_doses as f64 * (group.coverage_rate / 100.0) * loss_factor;
    let monthly_doses = annual_target_doses / 12.0;
    // An item with no doses per unit forecasts a unit per dose
    let doses_per_unit = if group.vaccine_doses == 0 {
        1.0
    } else {
        group.vaccine_doses as f64
    };

    PopulationForecastCourse {
        course_name: group.course_name.clone(),
        demographic_name: group.demographic_name.clone(),
        number_of_doses,
        coverage_rate: group.coverage_rate,
        wastage_rate: group.wastage_rate,
        target_population,
        loss_factor,
        annual_target_doses,
        doses_per_unit,
        monthly_doses,
        monthly_units: monthly_doses / doses_per_unit,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{
        mock::{
            MockData, MockDataInserts, mock_demographic_a, mock_vaccine_course_a,
            mock_vaccine_item_a,
        },
        test_db::setup_all_with_data,
        vaccine_course::vaccine_course_row::VaccineCourseRow,
    };

    fn mock_vaccine_course() -> VaccineCourseRow {
        VaccineCourseRow {
            demographic_id: Some(mock_demographic_a().id.clone()),
            coverage_rate: 80.0,
            wastage_rate: 10.0,
            ..mock_vaccine_course_a()
        }
    }

    #[actix_rt::test]
    async fn population_forecast_is_monthly() {
        let (_, connection, _, _) = setup_all_with_data(
            "population_forecast_is_monthly",
            MockDataInserts::all(),
            MockData {
                vaccine_courses: vec![mock_vaccine_course()],
                ..Default::default()
            },
        )
        .await;
        let item_id = mock_vaccine_item_a().id;

        // store_a overrides wastage (50%) and coverage (60%)
        // Target population: 10000 × 25% = 2500; loss factor: 1 / (1 − 0.5) = 2
        // Annual target doses: 2500 × 3 × 60% × 2 = 9000; monthly doses 750; 2 doses per unit
        let courses = CoveringCourses::load(&connection, "store_a", &[item_id.clone()]).unwrap();
        assert!(courses.covers(&item_id));
        let forecast = courses.forecast(&item_id, 10000.0);
        assert_eq!(forecast.population_served, Some(10000.0));
        assert_eq!(
            forecast.courses,
            vec![PopulationForecastCourse {
                course_name: "Vaccine Course A".to_string(),
                demographic_name: Some("demographic_1".to_string()),
                number_of_doses: 3,
                coverage_rate: 60.0,
                wastage_rate: 50.0,
                target_population: 2500.0,
                loss_factor: 2.0,
                annual_target_doses: 9000.0,
                doses_per_unit: 2.0,
                monthly_doses: 750.0,
                monthly_units: 375.0,
            }]
        );

        // store_b has no override: the course's own rates apply
        let courses = CoveringCourses::load(&connection, "store_b", &[item_id.clone()]).unwrap();
        let course = &courses.forecast(&item_id, 10000.0).courses[0];
        assert_eq!(course.coverage_rate, 80.0);
        assert_eq!(course.wastage_rate, 10.0);

        // An item no course covers
        let courses =
            CoveringCourses::load(&connection, "store_a", &["item_a".to_string()]).unwrap();
        assert!(!courses.covers("item_a"));
        assert_eq!(courses.wastage_rate("item_a"), 0.0);
    }

    #[actix_rt::test]
    async fn wastage_rate_is_the_store_effective_rate() {
        let (_, connection, _, _) = setup_all_with_data(
            "wastage_rate_is_the_store_effective_rate",
            MockDataInserts::all(),
            MockData {
                vaccine_courses: vec![mock_vaccine_course()],
                ..Default::default()
            },
        )
        .await;
        let item_id = mock_vaccine_item_a().id;

        // store_a overrides the course's 10% with 50%; store_b takes the course's own
        let item_ids = std::slice::from_ref(&item_id);
        let courses = CoveringCourses::load(&connection, "store_a", item_ids).unwrap();
        assert_eq!(courses.wastage_rate(&item_id), 50.0);
        let courses = CoveringCourses::load(&connection, "store_b", item_ids).unwrap();
        assert_eq!(courses.wastage_rate(&item_id), 10.0);
    }

    #[test]
    fn wastage_rate_weighs_courses_by_their_units() {
        let group = |wastage_rate: f64, coverage_rate: f64| CourseGroup {
            course_name: format!("Course {wastage_rate}"),
            demographic_name: None,
            coverage_rate,
            wastage_rate,
            population_percentage: 100.0,
            vaccine_doses: 1,
            dose_labels: HashSet::from(["Dose 1".to_string()]),
        };
        // Weighted by the units each course orders, wastage included: 25% coverage at a
        // loss factor of 2 orders as much as 40% coverage at 1.25, so (50 + 20) / 2
        let courses = CoveringCourses(HashMap::from([(
            "item".to_string(),
            vec![group(50.0, 25.0), group(20.0, 40.0)],
        )]));
        assert!((courses.wastage_rate("item") - 35.0).abs() < 1e-9);

        // An ignored (out of range) rate counts as none
        let courses = CoveringCourses(HashMap::from([(
            "item".to_string(),
            vec![group(150.0, 100.0)],
        )]));
        assert_eq!(courses.wastage_rate("item"), 0.0);
    }

    #[test]
    fn wastage_outside_0_to_100_is_ignored() {
        let group = |wastage_rate: f64| CourseGroup {
            course_name: "Course".to_string(),
            demographic_name: None,
            coverage_rate: 100.0,
            wastage_rate,
            population_percentage: 100.0,
            vaccine_doses: 1,
            dose_labels: HashSet::from(["Dose 1".to_string()]),
        };

        assert_eq!(course_forecast(&group(50.0), 1200.0).loss_factor, 2.0);
        for wastage_rate in [100.0, 150.0, -10.0] {
            let course = course_forecast(&group(wastage_rate), 1200.0);
            assert_eq!(course.loss_factor, 1.0);
            assert_eq!(course.monthly_units, 100.0);
        }
    }
}
