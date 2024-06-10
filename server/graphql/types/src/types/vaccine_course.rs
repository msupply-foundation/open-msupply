use async_graphql::*;

use dataloader::DataLoader;
use graphql_core::{loader::DemographicIndicatorLoader, ContextExt};

use repository::vaccine_course::vaccine_course_row::VaccineCourseRow;

use super::DemographicIndicatorNode;

#[derive(PartialEq, Debug)]
pub struct VaccineCourseNode {
    pub vaccine_course: VaccineCourseRow,
}

#[Object]
impl VaccineCourseNode {
    pub async fn id(&self) -> &str {
        &self.row().id
    }

    pub async fn name(&self) -> &str {
        &self.row().name
    }

    pub async fn program_id(&self) -> &str {
        &self.row().program_id
    }

    pub async fn demographic_indicator_id(&self) -> &str {
        &self.row().demographic_indicator_id
    }

    pub async fn demographic_indicator(
        &self,
        ctx: &Context<'_>,
    ) -> Result<Option<DemographicIndicatorNode>> {
        let demographic_indicator_id = &self.row().demographic_indicator_id;
        let loader = ctx.get_loader::<DataLoader<DemographicIndicatorLoader>>();
        Ok(loader
            .load_one(demographic_indicator_id.clone())
            .await?
            .map(DemographicIndicatorNode::from_domain))
    }
}

impl VaccineCourseNode {
    pub fn from_domain(vaccine_course: VaccineCourseRow) -> VaccineCourseNode {
        VaccineCourseNode { vaccine_course }
    }

    pub fn row(&self) -> &VaccineCourseRow {
        &self.vaccine_course
    }
}
