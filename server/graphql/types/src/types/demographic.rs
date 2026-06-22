use async_graphql::*;

use repository::DemographicRow;

#[derive(PartialEq, Debug)]
pub struct DemographicNode {
    pub demographic: DemographicRow,
}

#[Object]
impl DemographicNode {
    pub async fn id(&self) -> &str {
        &self.row().id
    }
    pub async fn name(&self) -> &str {
        &self.row().name
    }
    /// Percentage of the store's served population this demographic represents
    /// (e.g. 3.5 for under-1s). Used by population-based vaccine forecasting.
    pub async fn population_percentage(&self) -> f64 {
        self.row().population_percentage
    }
}

impl DemographicNode {
    pub fn from_domain(demographic: DemographicRow) -> DemographicNode {
        DemographicNode { demographic }
    }

    pub fn row(&self) -> &DemographicRow {
        &self.demographic
    }
}
