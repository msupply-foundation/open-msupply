use crate::DemographicIndicatorRow;

pub fn mock_demographic_indicator_a() -> DemographicIndicatorRow {
    DemographicIndicatorRow {
        id: "demographic_1".to_owned(),
        name: "demographic_1".to_owned(),
        base_year: 2024,
        base_population: 100,
        population_percentage: 100.0,
        year_1_projection: 101,
        year_2_projection: 102,
        year_3_projection: 103,
        year_4_projection: 104,
        year_5_projection: 105,
    }
}

pub fn mock_demographic_indicators() -> Vec<DemographicIndicatorRow> {
    vec![mock_demographic_indicator_a()]
}
