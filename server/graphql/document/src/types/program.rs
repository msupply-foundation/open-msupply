use async_graphql::*;
use graphql_core::ContextExt;

use super::{document::DocumentNode, encounter::EncounterNode};

pub struct ProgramNode {
    pub store_id: String,
    pub patient_id: String,
    pub program: String,
    pub document_node: DocumentNode,
}

#[Object]
impl ProgramNode {
    /// The encounter document
    pub async fn document(&self) -> &DocumentNode {
        &self.document_node
    }

    /// The program document
    pub async fn encounters(&self, ctx: &Context<'_>) -> Result<Vec<EncounterNode>> {
        // TODO use loader
        let context = ctx.service_provider().context()?;
        let entries = ctx
            .service_provider()
            .patient_service
            .get_patient_program_encounters(
                &context,
                &self.store_id,
                &self.patient_id,
                &self.program,
            )?;
        Ok(entries
            .into_iter()
            .map(|document| EncounterNode {
                patient_id: self.patient_id.clone(),
                program: self.program.clone(),
                document_node: DocumentNode { document },
            })
            .collect())
    }
}
