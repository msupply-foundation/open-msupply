use async_graphql::{dataloader::DataLoader, *};
use chrono::{DateTime, Utc};
use graphql_core::{
    loader::{DocumentLoader, DocumentLoaderInput},
    ContextExt,
};
use repository::ProgramRow;

use super::{document::DocumentNode, encounter::EncounterNode};

pub struct ProgramNode {
    pub store_id: String,
    pub program_row: ProgramRow,
}

#[Object]
impl ProgramNode {
    pub async fn r#type(&self) -> &str {
        &self.program_row.r#type
    }

    pub async fn name(&self) -> &str {
        &self.program_row.name
    }

    pub async fn patient_id(&self) -> &str {
        &self.program_row.patient_id
    }

    pub async fn enrolment_datetime(&self) -> DateTime<Utc> {
        DateTime::<Utc>::from_utc(self.program_row.enrolment_datetime, Utc)
    }

    pub async fn program_patient_id(&self) -> &Option<String> {
        &self.program_row.program_patient_id
    }

    /// The encounter document
    pub async fn document(&self, ctx: &Context<'_>) -> Result<DocumentNode> {
        let loader = ctx.get_loader::<DataLoader<DocumentLoader>>();

        let result = loader
            .load_one(DocumentLoaderInput {
                store_id: self.store_id.clone(),
                document_name: self.program_row.name.clone(),
            })
            .await?
            .map(|document| DocumentNode { document })
            .ok_or(Error::new("Program without document"))?;

        Ok(result)
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
                &self.program_row.patient_id,
                &self.program_row.r#type,
            )?;
        Ok(entries
            .into_iter()
            .map(|document| EncounterNode {
                patient_id: self.program_row.patient_id.clone(),
                program: self.program_row.r#type.clone(),
                document_node: DocumentNode { document },
            })
            .collect())
    }
}
