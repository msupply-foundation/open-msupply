use async_graphql::*;
use dataloader::DataLoader;
use graphql_core::{loader::VaccineCourseByProgramIdLoader, ContextExt};
use repository::ProgramRow;

use crate::types::VaccineCourseNode;

pub struct ProgramNode {
    pub program_row: ProgramRow,
}

#[Object]
impl ProgramNode {
    pub async fn id(&self) -> &str {
        &self.program_row.id
    }

    pub async fn name(&self) -> &str {
        &self.program_row.name
    }

    pub async fn is_immunisation(&self) -> bool {
        self.program_row.is_immunisation
    }

    pub async fn vaccine_courses(
        &self,
        ctx: &Context<'_>,
    ) -> Result<Option<Vec<VaccineCourseNode>>> {
        if !self.program_row.is_immunisation {
            return Ok(None);
        }
        let program_id = &self.program_row.id;
        let loader = ctx.get_loader::<DataLoader<VaccineCourseByProgramIdLoader>>();
        let result = loader.load_one(program_id.clone()).await?;

        Ok(result.map(|vaccine_courses| {
            vaccine_courses
                .into_iter()
                .map(VaccineCourseNode::from_domain)
                .collect()
        }))
    }
}
