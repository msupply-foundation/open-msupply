use async_graphql::*;

use repository::DemographicIndicatorRow;

#[derive(PartialEq, Debug)]
pub struct DemographicIndicatorNode {
    pub demographic_indicator: DemographicIndicatorRow,
}

#[Object]
impl DemographicIndicatorNode {
    pub async fn id(&self) -> &str {
        &self.row().id
    }
    pub async fn name(&self) -> &str {
        &self.row().name
    }
    pub async fn base_year(&self) -> &i32 {
        &self.row().base_year
    }
    pub async fn base_population(&self) -> &i32 {
        &self.row().base_population
    }
    pub async fn population_percentage(&self) -> &f64 {
        &self.row().population_percentage
    }
    pub async fn year_1_projection(&self) -> &i32 {
        &self.row().year_1_projection
    }
    pub async fn year_2_projection(&self) -> &i32 {
        &self.row().year_2_projection
    }
    pub async fn year_3_projection(&self) -> &i32 {
        &self.row().year_3_projection
    }
    pub async fn year_4_projection(&self) -> &i32 {
        &self.row().year_4_projection
    }
    pub async fn year_5_projection(&self) -> &i32 {
        &self.row().year_5_projection
    }
}

impl DemographicIndicatorNode {
    pub fn from_domain(demographic_indicator: DemographicIndicatorRow) -> DemographicIndicatorNode {
        DemographicIndicatorNode {
            demographic_indicator,
        }
    }

    pub fn row(&self) -> &DemographicIndicatorRow {
        &self.demographic_indicator
    }
}
