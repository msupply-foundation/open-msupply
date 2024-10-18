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
}

impl DemographicNode {
    pub fn from_domain(demographic: DemographicRow) -> DemographicNode {
        DemographicNode { demographic }
    }

    pub fn row(&self) -> &DemographicRow {
        &self.demographic
    }
}
