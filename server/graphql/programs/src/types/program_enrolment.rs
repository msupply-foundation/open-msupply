use async_graphql::{dataloader::DataLoader, *};
use chrono::{DateTime, Utc};
use graphql_core::{
    generic_filters::{DatetimeFilterInput, EqualFilterStringInput},
    loader::DocumentLoader,
    pagination::PaginationInput,
    standard_graphql_error::StandardGraphqlError,
    ContextExt,
};
use repository::{
    DatetimeFilter, EncounterFilter, EqualFilter, PaginationOption, ProgramEnrolment,
    ProgramEnrolmentStatus, ProgramEventFilter, ProgramEventSortField, Sort,
};

use crate::queries::{EncounterConnector, EncounterFilterInput, EncounterSortInput};

use super::{document::DocumentNode, encounter::EncounterNode, program_event::ProgramEventNode};

#[derive(InputObject, Clone)]
pub struct ProgramEventFilterInput {
    pub patient_id: Option<EqualFilterStringInput>,
    pub document_type: Option<EqualFilterStringInput>,
    pub document_name: Option<EqualFilterStringInput>,
    /// The event type
    pub r#type: Option<EqualFilterStringInput>,
    pub active_start_datetime: Option<DatetimeFilterInput>,
    pub active_end_datetime: Option<DatetimeFilterInput>,
}

impl ProgramEventFilterInput {
    pub fn to_domain(self) -> ProgramEventFilter {
        let ProgramEventFilterInput {
            patient_id,
            document_type,
            document_name,
            r#type,
            active_start_datetime,
            active_end_datetime,
        } = self;
        ProgramEventFilter {
            patient_id: patient_id.map(EqualFilter::from),
            active_start_datetime: active_start_datetime.map(DatetimeFilter::from),
            active_end_datetime: active_end_datetime.map(DatetimeFilter::from),
            document_type: document_type.map(EqualFilter::from),
            document_name: document_name.map(EqualFilter::from),
            r#type: r#type.map(EqualFilter::from),
            datetime: None,
            context_id: None,
        }
    }
}

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
pub enum ProgramEnrolmentNodeStatus {
    Active,
    OptedOut,
    TransferredOut,
    Paused,
}

impl ProgramEnrolmentNodeStatus {
    pub fn from_domain(from: &ProgramEnrolmentStatus) -> ProgramEnrolmentNodeStatus {
        use ProgramEnrolmentNodeStatus as to;
        use ProgramEnrolmentStatus as from;

        match from {
            from::Active => to::Active,
            from::OptedOut => to::OptedOut,
            from::TransferredOut => to::TransferredOut,
            from::Paused => to::Paused,
        }
    }

    pub fn to_domain(self) -> ProgramEnrolmentStatus {
        use ProgramEnrolmentNodeStatus as from;
        use ProgramEnrolmentStatus as to;

        match self {
            from::Active => to::Active,
            from::OptedOut => to::OptedOut,
            from::TransferredOut => to::TransferredOut,
            from::Paused => to::Paused,
        }
    }
}

pub struct ProgramEnrolmentNode {
    pub store_id: String,
    pub program_enrolment: ProgramEnrolment,
    pub allowed_ctx: Vec<String>,
}

#[Object]
impl ProgramEnrolmentNode {
    /// The program type
    pub async fn r#type(&self) -> &str {
        &self.program_enrolment.0.document_type
    }

    pub async fn context(&self) -> &str {
        &self.program_enrolment.1.context_id
    }

    /// The program document name
    pub async fn name(&self) -> &str {
        &self.program_enrolment.0.document_name
    }

    pub async fn patient_id(&self) -> &str {
        &self.program_enrolment.0.patient_id
    }

    pub async fn enrolment_datetime(&self) -> DateTime<Utc> {
        DateTime::<Utc>::from_utc(self.program_enrolment.0.enrolment_datetime, Utc)
    }

    pub async fn program_enrolment_id(&self) -> &Option<String> {
        &self.program_enrolment.0.program_enrolment_id
    }

    pub async fn status(&self) -> ProgramEnrolmentNodeStatus {
        ProgramEnrolmentNodeStatus::from_domain(&self.program_enrolment.0.status)
    }

    /// The encounter document
    pub async fn document(&self, ctx: &Context<'_>) -> Result<DocumentNode> {
        let loader = ctx.get_loader::<DataLoader<DocumentLoader>>();

        let result = loader
            .load_one(self.program_enrolment.0.document_name.clone())
            .await?
            .map(|document| DocumentNode {
                allowed_ctx: self.allowed_ctx.clone(),
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
            .patient_id(EqualFilter::equal_to(&self.program_enrolment.0.patient_id))
            .context(EqualFilter::equal_to(&self.program_enrolment.1.context_id));

        let entries = ctx
            .service_provider()
            .encounter_service
            .encounters(
                &context,
                page.map(PaginationOption::from),
                Some(filter),
                sort.map(EncounterSortInput::to_domain),
                self.allowed_ctx.clone(),
            )
            .map_err(StandardGraphqlError::from_list_error)?;
        let nodes = entries
            .rows
            .into_iter()
            .map(|encounter| EncounterNode {
                allowed_ctx: self.allowed_ctx.clone(),
                store_id: self.store_id.clone(),
                encounter,
            })
            .collect();
        Ok(EncounterConnector {
            total_count: entries.count,
            nodes,
        })
    }

    pub async fn active_program_events(
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
            .patient_id(EqualFilter::equal_to(&self.program_enrolment.0.patient_id))
            .document_type(EqualFilter::equal_to(
                &self.program_enrolment.0.document_type,
            ));
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
            .map(|row| ProgramEventNode {
                store_id: self.store_id.clone(),
                row,
                allowed_ctx: self.allowed_ctx.clone(),
            })
            .collect())
    }
}
