use crate::DemographicRow;

pub fn mock_demographic_a() -> DemographicRow {
    DemographicRow {
        id: "demographic_1".to_owned(),
        name: "demographic_1".to_owned(),
        population_percentage: 25.0,
    }
}

pub fn mock_demographics() -> Vec<DemographicRow> {
    vec![mock_demographic_a()]
}
