use async_graphql::*;

use dataloader::DataLoader;
use graphql_core::{
    loader::VaccineCourseLoader, simple_generic_errors::NodeError,
    standard_graphql_error::StandardGraphqlError, ContextExt,
};
use repository::vaccine_course::vaccine_course_dose_row::VaccineCourseDoseRow;

use crate::types::VaccineCourseNode;

#[derive(Union)]
pub enum VaccineCourseDoseResponse {
    Error(NodeError),
    Response(VaccineCourseDoseNode),
}

#[derive(PartialEq, Debug)]
pub struct VaccineCourseDoseNode {
    pub vaccine_course_dose: VaccineCourseDoseRow,
}

#[Object]
impl VaccineCourseDoseNode {
    pub async fn id(&self) -> &str {
        &self.row().id
    }

    pub async fn label(&self) -> &str {
        &self.row().label
    }

    pub async fn min_age_months(&self) -> &f64 {
        &self.row().min_age
    }

    pub async fn max_age_months(&self) -> &f64 {
        &self.row().max_age
    }

    pub async fn min_interval_days(&self) -> &i32 {
        &self.row().min_interval_days
    }

    pub async fn vaccine_course(&self, ctx: &Context<'_>) -> Result<VaccineCourseNode> {
        let loader = ctx.get_loader::<DataLoader<VaccineCourseLoader>>();
        let course_option = loader
            .load_one(self.row().vaccine_course_id.clone())
            .await?;

        course_option.map(VaccineCourseNode::from_domain).ok_or(
            StandardGraphqlError::InternalError(format!(
                "Cannot find vaccine course ({}) linked to vaccine course dose ({})",
                &self.row().vaccine_course_id,
                &self.row().id
            ))
            .extend(),
        )
    }
}

impl VaccineCourseDoseNode {
    pub fn from_domain(vaccine_course_dose: VaccineCourseDoseRow) -> VaccineCourseDoseNode {
        VaccineCourseDoseNode {
            vaccine_course_dose,
        }
    }

    pub fn row(&self) -> &VaccineCourseDoseRow {
        &self.vaccine_course_dose
    }
}
