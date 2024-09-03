use async_graphql::*;

use dataloader::DataLoader;
use graphql_core::{
    loader::{
        DemographicIndicatorLoader, VaccineCourseDoseByVaccineCourseIdLoader,
        VaccineCourseItemByVaccineCourseIdLoader,
    },
    ContextExt,
};

use repository::vaccine_course::vaccine_course_row::VaccineCourseRow;

use super::{DemographicIndicatorNode, VaccineCourseDoseNode, VaccineCourseItemNode};

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

    pub async fn demographic_indicator_id(&self) -> Option<String> {
        self.row().demographic_indicator_id.clone()
    }

    pub async fn coverage_rate(&self) -> f64 {
        self.row().coverage_rate
    }

    pub async fn is_active(&self) -> bool {
        self.row().is_active
    }

    pub async fn wastage_rate(&self) -> f64 {
        self.row().wastage_rate
    }

    pub async fn demographic_indicator(
        &self,
        ctx: &Context<'_>,
    ) -> Result<Option<DemographicIndicatorNode>> {
        let demographic_indicator_id = match &self.row().demographic_indicator_id {
            Some(id) => id,
            None => return Ok(None),
        };
        let loader = ctx.get_loader::<DataLoader<DemographicIndicatorLoader>>();
        Ok(loader
            .load_one(demographic_indicator_id.to_string())
            .await?
            .map(DemographicIndicatorNode::from_domain))
    }

    pub async fn vaccine_course_items(
        &self,
        ctx: &Context<'_>,
    ) -> Result<Option<Vec<VaccineCourseItemNode>>> {
        let loader = ctx.get_loader::<DataLoader<VaccineCourseItemByVaccineCourseIdLoader>>();
        let result = loader.load_one(self.row().id.clone()).await?;

        Ok(result.map(|items| {
            items
                .into_iter()
                .map(VaccineCourseItemNode::from_domain)
                .collect()
        }))
    }

    pub async fn vaccine_course_doses(
        &self,
        ctx: &Context<'_>,
    ) -> Result<Option<Vec<VaccineCourseDoseNode>>> {
        let loader = ctx.get_loader::<DataLoader<VaccineCourseDoseByVaccineCourseIdLoader>>();
        let result = loader.load_one(self.row().id.clone()).await?;

        Ok(result.map(|doses| {
            doses
                .into_iter()
                .map(VaccineCourseDoseNode::from_domain)
                .collect()
        }))
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
