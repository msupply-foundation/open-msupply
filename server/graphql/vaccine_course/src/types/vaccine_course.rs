use async_graphql::*;

use dataloader::DataLoader;
use graphql_core::{
    loader::DemographicIndicatorLoader, simple_generic_errors::NodeError, ContextExt,
};
use graphql_demographic::types::DemographicIndicatorNode;
use repository::vaccine_course::vaccine_course_row::VaccineCourseRow;
use service::ListResult;

#[derive(PartialEq, Debug)]
pub struct VaccineCourseNode {
    pub vaccine_course: VaccineCourseRow,
}

#[derive(SimpleObject)]
pub struct VaccineCourseConnector {
    total_count: u32,
    nodes: Vec<VaccineCourseNode>,
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

#[derive(Union)]
pub enum VaccineCoursesResponse {
    Response(VaccineCourseConnector),
}

#[derive(Union)]
pub enum VaccineCourseResponse {
    Error(NodeError),
    Response(VaccineCourseNode),
}

impl VaccineCourseNode {
    pub fn from_domain(vaccine_course: VaccineCourseRow) -> VaccineCourseNode {
        VaccineCourseNode { vaccine_course }
    }

    pub fn row(&self) -> &VaccineCourseRow {
        &self.vaccine_course
    }
}

impl VaccineCourseConnector {
    pub fn from_domain(vaccine_courses: ListResult<VaccineCourseRow>) -> VaccineCourseConnector {
        VaccineCourseConnector {
            total_count: vaccine_courses.count,
            nodes: vaccine_courses
                .rows
                .into_iter()
                .map(VaccineCourseNode::from_domain)
                .collect(),
        }
    }
}
