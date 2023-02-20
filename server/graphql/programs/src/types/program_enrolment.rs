use async_graphql::{dataloader::DataLoader, *};
use chrono::{DateTime, Utc};
use graphql_core::{
    generic_filters::EqualFilterStringInput,
    loader::{DocumentLoader, DocumentLoaderInput},
    pagination::PaginationInput,
    standard_graphql_error::StandardGraphqlError,
    ContextExt,
};
use repository::{
    EncounterFilter, EqualFilter, PaginationOption, ProgramEnrolmentRow, ProgramEventFilter,
    ProgramEventSortField, Sort,
};

use crate::queries::{EncounterConnector, EncounterFilterInput, EncounterSortInput};

use super::{document::DocumentNode, encounter::EncounterNode, program_event::ProgramEventNode};

#[derive(InputObject, Clone)]
pub struct ProgramEventFilterInput {
    pub document_type: Option<EqualFilterStringInput>,
    pub document_name: Option<EqualFilterStringInput>,
    /// The event type
    pub r#type: Option<EqualFilterStringInput>,
}

impl ProgramEventFilterInput {
    pub fn to_domain(self) -> ProgramEventFilter {
        ProgramEventFilter {
            datetime: None,
            active_start_datetime: None,
            active_end_datetime: None,
            patient_id: None,
            document_type: self.document_type.map(EqualFilter::from),
            document_name: self.document_name.map(EqualFilter::from),
            r#type: self.r#type.map(EqualFilter::from),
        }
    }
}

pub struct ProgramEnrolmentNode {
    pub store_id: String,
    pub program_row: ProgramEnrolmentRow,
    pub allowed_docs: Vec<String>,
}

#[Object]
impl ProgramEnrolmentNode {
    /// The program type
    pub async fn program(&self) -> &str {
        &self.program_row.program
    }

    /// The program document name
    pub async fn name(&self) -> &str {
        &self.program_row.document_name
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
                document_name: self.program_row.document_name.clone(),
            })
            .await?
            .map(|document| DocumentNode {
                allowed_docs: self.allowed_docs.clone(),
                document,
            })
            .ok_or(Error::new("Program without document"))?;

        Ok(result)
    }

    /// The program document
    pub async fn encounters(
        &self,
        ctx: &Context<'_>,
        page: Option<PaginationInput>,
        filter: Option<EncounterFilterInput>,
        sort: Option<EncounterSortInput>,
    ) -> Result<EncounterConnector> {
        // TODO use loader?
        let context = ctx.service_provider().basic_context()?;
        let filter = filter
            .map(|f| f.to_domain_filter())
            .unwrap_or(EncounterFilter::new())
            .patient_id(EqualFilter::equal_to(&self.program_row.patient_id))
            .program(EqualFilter::equal_to(&self.program_row.program));

        let entries = ctx
            .service_provider()
            .encounter_service
            .encounters(
                &context,
                page.map(PaginationOption::from),
                Some(filter),
                sort.map(EncounterSortInput::to_domain),
                self.allowed_docs.clone(),
            )
            .map_err(StandardGraphqlError::from_list_error)?;
        let nodes = entries
            .rows
            .into_iter()
            .map(|row| EncounterNode {
                allowed_docs: self.allowed_docs.clone(),
                store_id: self.store_id.clone(),
                encounter_row: row,
            })
            .collect();
        Ok(EncounterConnector {
            total_count: entries.count,
            nodes,
        })
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
            .patient_id(EqualFilter::equal_to(&self.program_row.patient_id))
            .document_type(EqualFilter::equal_to(&self.program_row.program));
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
