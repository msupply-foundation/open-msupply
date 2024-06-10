use async_graphql::*;

use graphql_core::simple_generic_errors::NodeError;
use graphql_types::types::VaccineCourseNode;
use repository::vaccine_course::vaccine_course_row::VaccineCourseRow;
use service::ListResult;

#[derive(SimpleObject)]
pub struct VaccineCourseConnector {
    total_count: u32,
    nodes: Vec<VaccineCourseNode>,
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
