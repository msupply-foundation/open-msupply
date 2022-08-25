use async_graphql::{dataloader::DataLoader, *};
use chrono::{DateTime, Utc};
use graphql_core::{
    loader::{DocumentLoader, DocumentLoaderInput, NameByIdLoader, NameByIdLoaderInput},
    standard_graphql_error::StandardGraphqlError,
    ContextExt,
};
use graphql_types::types::NameNode;
use repository::{
    EncounterRow, EncounterStatus, EqualFilter, ProgramEventFilter, ProgramEventSortField, Sort,
};
use serde::Serialize;

use super::{
    document::DocumentNode, program::ProgramEventFilterInput, program_event::ProgramEventNode,
};

pub struct EncounterNode {
    pub store_id: String,
    pub encounter_row: EncounterRow,
}

#[derive(Enum, Copy, Clone, PartialEq, Eq, Debug, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")] // only needed to be comparable in tests
pub enum EncounterNodeStatus {
    Scheduled,
    Done,
    Cancelled,
}

impl EncounterNodeStatus {
    pub fn to_domain(self) -> EncounterStatus {
        match self {
            EncounterNodeStatus::Scheduled => EncounterStatus::Scheduled,
            EncounterNodeStatus::Done => EncounterStatus::Done,
            EncounterNodeStatus::Cancelled => EncounterStatus::Cancelled,
        }
    }

    pub fn from_domain(status: &EncounterStatus) -> EncounterNodeStatus {
        match status {
            EncounterStatus::Scheduled => EncounterNodeStatus::Scheduled,
            EncounterStatus::Done => EncounterNodeStatus::Done,
            EncounterStatus::Cancelled => EncounterNodeStatus::Cancelled,
        }
    }
}

#[Object]
impl EncounterNode {
    pub async fn id(&self) -> &str {
        &self.encounter_row.id
    }

    pub async fn patient_id(&self) -> &str {
        &self.encounter_row.patient_id
    }

    pub async fn patient(&self, ctx: &Context<'_>) -> Result<NameNode> {
        let loader = ctx.get_loader::<DataLoader<NameByIdLoader>>();

        let result = loader
            .load_one(NameByIdLoaderInput::new(
                &self.store_id,
                &self.encounter_row.patient_id,
            ))
            .await?
            .map(NameNode::from_domain)
            .ok_or(Error::new("Encounter without patient"))?;

        Ok(result)
    }

    pub async fn program(&self) -> &str {
        &self.encounter_row.program
    }

    pub async fn r#type(&self) -> &str {
        &self.encounter_row.r#type
    }

    pub async fn name(&self) -> &str {
        &self.encounter_row.name
    }

    pub async fn status(&self) -> Option<EncounterNodeStatus> {
        self.encounter_row
            .status
            .as_ref()
            .map(|status| EncounterNodeStatus::from_domain(status))
    }

    pub async fn start_datetime(&self) -> DateTime<Utc> {
        DateTime::<Utc>::from_utc(self.encounter_row.start_datetime, Utc)
    }

    pub async fn end_datetime(&self) -> Option<DateTime<Utc>> {
        self.encounter_row
            .end_datetime
            .map(|t| DateTime::<Utc>::from_utc(t, Utc))
    }

    /// The encounter document
    pub async fn document(&self, ctx: &Context<'_>) -> Result<DocumentNode> {
        let loader = ctx.get_loader::<DataLoader<DocumentLoader>>();

        let result = loader
            .load_one(DocumentLoaderInput {
                store_id: self.store_id.clone(),
                document_name: self.encounter_row.name.clone(),
            })
            .await?
            .map(|document| DocumentNode { document })
            .ok_or(Error::new("Program without document"))?;

        Ok(result)
    }

    pub async fn events(
        &self,
        ctx: &Context<'_>,
        filter: Option<ProgramEventFilterInput>,
    ) -> Result<Vec<ProgramEventNode>> {
        // TODO use loader?
        let context = ctx.service_provider().basic_context()?;
        let filter = filter
            .map(|f| f.to_domain())
            .unwrap_or(ProgramEventFilter::new())
            .name_id(EqualFilter::equal_to(&self.encounter_row.patient_id))
            .context(EqualFilter::equal_to(&self.encounter_row.r#type));
        let entries = ctx
            .service_provider()
            .program_event_service
            .events(
                &context,
                None,
                Some(filter),
                Some(Sort {
                    key: ProgramEventSortField::Datetime,
                    desc: Some(true),
                }),
            )
            .map_err(StandardGraphqlError::from_list_error)?;
        Ok(entries
            .rows
            .into_iter()
            .map(|row| ProgramEventNode { row })
            .collect())
    }
}
