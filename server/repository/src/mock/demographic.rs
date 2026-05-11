use crate::DemographicRow;

pub fn mock_demographic_a() -> DemographicRow {
    DemographicRow {
        id: "demographic_1".to_string(),
        name: "demographic_1".to_string(),
        population_percentage: 25.0,
    }
}

pub fn mock_demographics() -> Vec<DemographicRow> {
    vec![mock_demographic_a()]
}
