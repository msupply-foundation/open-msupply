use async_graphql::{dataloader::DataLoader, *};
use chrono::{DateTime, Utc};
use graphql_core::{
    loader::{
        ClinicianLoader, ClinicianLoaderInput, DocumentLoader, DocumentLoaderInput, NameByIdLoader,
        NameByIdLoaderInput, ProgramEnrolmentLoader, ProgramEnrolmentLoaderInput,
    },
    standard_graphql_error::StandardGraphqlError,
    ContextExt,
};
use graphql_types::types::{ClinicianNode, NameNode};
use repository::{
    EncounterRow, EncounterStatus, EqualFilter, ProgramEventFilter, ProgramEventSortField, Sort,
};
use serde::Serialize;

use super::{
    document::DocumentNode,
    program_enrolment::{ProgramEnrolmentNode, ProgramEventFilterInput},
    program_event::ProgramEventNode,
};

pub struct EncounterNode {
    pub store_id: String,
    pub encounter_row: EncounterRow,
    pub allowed_docs: Vec<String>,
}

#[derive(Enum, Copy, Clone, PartialEq, Eq, Debug, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")] // only needed to be comparable in tests
pub enum EncounterNodeStatus {
    Scheduled,
    Completed,
    Cancelled,
}

impl EncounterNodeStatus {
    pub fn to_domain(self) -> EncounterStatus {
        match self {
            EncounterNodeStatus::Scheduled => EncounterStatus::Scheduled,
            EncounterNodeStatus::Completed => EncounterStatus::Completed,
            EncounterNodeStatus::Cancelled => EncounterStatus::Cancelled,
        }
    }

    pub fn from_domain(status: &EncounterStatus) -> EncounterNodeStatus {
        match status {
            EncounterStatus::Scheduled => EncounterNodeStatus::Scheduled,
            EncounterStatus::Completed => EncounterNodeStatus::Completed,
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

    pub async fn clinician(&self, ctx: &Context<'_>) -> Result<Option<ClinicianNode>> {
        let Some(clinician_id) = self.encounter_row.clinician_id.as_ref() else {
            return Ok(None)
        };
        let loader = ctx.get_loader::<DataLoader<ClinicianLoader>>();

        let result = loader
            .load_one(ClinicianLoaderInput::new(&self.store_id, &clinician_id))
            .await?
            .map(ClinicianNode::from_domain)
            .ok_or(Error::new(format!(
                "Failed to load clinician: {}",
                clinician_id
            )))?;

        Ok(Some(result))
    }

    pub async fn program(&self) -> &str {
        &self.encounter_row.program
    }

    /// Returns the matching program enrolment for the patient of this encounter
    pub async fn program_enrolment(
        &self,
        ctx: &Context<'_>,
    ) -> Result<Option<ProgramEnrolmentNode>> {
        let loader = ctx.get_loader::<DataLoader<ProgramEnrolmentLoader>>();

        let result = loader
            .load_one(ProgramEnrolmentLoaderInput::new(
                &self.encounter_row.patient_id,
                &self.encounter_row.program,
                self.allowed_docs.clone(),
            ))
            .await?
            .map(|program_row| ProgramEnrolmentNode {
                store_id: self.store_id.clone(),
                program_row,
                allowed_docs: self.allowed_docs.clone(),
            })
            .ok_or(Error::new(format!(
                "Failed to load program enrolment: {}",
                self.encounter_row.program
            )))?;

        Ok(Some(result))
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

    pub async fn created_datetime(&self) -> DateTime<Utc> {
        DateTime::<Utc>::from_utc(self.encounter_row.created_datetime, Utc)
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
            .map(|document| DocumentNode {
                allowed_docs: self.allowed_docs.clone(),
                document,
            })
            .ok_or(Error::new("Program without document"))?;

        Ok(result)
    }

    pub async fn events(
        &self,
        ctx: &Context<'_>,
        at: Option<DateTime<Utc>>,
        filter: Option<ProgramEventFilterInput>,
    ) -> Result<Vec<ProgramEventNode>> {
        // TODO use loader?
        let context = ctx.service_provider().basic_context()?;
        let filter = filter
            .map(|f| f.to_domain())
            .unwrap_or(ProgramEventFilter::new())
            .patient_id(EqualFilter::equal_to(&self.encounter_row.patient_id))
            .document_type(EqualFilter::equal_to(&self.encounter_row.r#type))
            .document_name(EqualFilter::equal_to(&self.encounter_row.name));
        let entries = ctx
            .service_provider()
            .program_event_service
            .active_events(
                &context,
                at.map(|at| at.naive_utc())
                    .unwrap_or(Utc::now().naive_utc()),
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
