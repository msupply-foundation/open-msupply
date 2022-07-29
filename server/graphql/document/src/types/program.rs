use async_graphql::{dataloader::DataLoader, *};
use chrono::{DateTime, Utc};
use graphql_core::{
    loader::{DocumentLoader, DocumentLoaderInput},
    ContextExt,
};
use repository::{EncounterFilter, EqualFilter, ProgramRow};

use super::{document::DocumentNode, encounter::EncounterNode};

pub struct ProgramNode {
    pub store_id: String,
    pub program_row: ProgramRow,
}

#[Object]
impl ProgramNode {
    /// The program type
    pub async fn r#type(&self) -> &str {
        &self.program_row.r#type
    }

    /// The program document name
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
            .encounter_service
            .get_patient_program_encounters(
                &context,
                Some(
                    EncounterFilter::new()
                        .patient_id(EqualFilter::equal_to(&self.program_row.patient_id))
                        .program(EqualFilter::equal_to(&self.program_row.r#type)),
                ),
            )?;
        Ok(entries
            .into_iter()
            .map(|row| EncounterNode {
                patient_id: self.program_row.patient_id.clone(),
                program: self.program_row.r#type.clone(),
                store_id: self.store_id.clone(),
                name: row.name,
                status: row.status,
            })
            .collect())
    }
}
