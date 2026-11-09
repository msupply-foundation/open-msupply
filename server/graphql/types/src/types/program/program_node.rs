use async_graphql::*;
use dataloader::DataLoader;
use graphql_core::{ContextExt, loader::VaccineCourseByProgramIdLoader};
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

    /// The context the program's documents (its enrolments and encounters)
    /// belong to: what a document registry entry's `contextId` names. Often,
    /// but not always, the program's own id.
    pub async fn context_id(&self) -> &str {
        &self.program_row.context_id
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

    pub async fn elmis_code(&self) -> Option<String> {
        self.program_row.elmis_code.clone()
    }
}
