use crate::DemographicRow;

pub fn mock_demographic_a() -> DemographicRow {
    DemographicRow {
        id: "demographic_1".to_owned(),
        name: "demographic_1".to_owned(),
    }
}

pub fn mock_demographics() -> Vec<DemographicRow> {
    vec![mock_demographic_a()]
}
