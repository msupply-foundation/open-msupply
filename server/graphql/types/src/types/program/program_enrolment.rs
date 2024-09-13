use async_graphql::{dataloader::DataLoader, *};
use chrono::{DateTime, Utc};
use graphql_core::{
    generic_filters::{DatetimeFilterInput, EqualFilterStringInput, StringFilterInput},
    loader::{DocumentLoader, PatientLoader},
    pagination::PaginationInput,
    standard_graphql_error::StandardGraphqlError,
    ContextExt,
};
use repository::{
    DatetimeFilter, EncounterFilter, EqualFilter, NameRow, PaginationOption, ProgramEnrolment,
    ProgramEnrolmentFilter, ProgramEnrolmentRow, ProgramEnrolmentSort, ProgramEnrolmentSortField,
    ProgramEventFilter, ProgramEventSortField, ProgramRow, Sort, StringFilter,
};

use super::{
    document::DocumentNode,
    encounter::{EncounterConnector, EncounterFilterInput, EncounterNode, EncounterSortInput},
    patient::PatientNode,
    program_event::{
        ProgramEventConnector, ProgramEventNode, ProgramEventResponse, ProgramEventSortInput,
    },
};

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(rename_items = "camelCase")]
pub enum ProgramEnrolmentSortFieldInput {
    Type,
    PatientId,
    EnrolmentDatetime,
    ProgramEnrolmentId,
    Status,
}

#[derive(InputObject)]
pub struct ProgramEnrolmentSortInput {
    /// Sort query result by `key`
    key: ProgramEnrolmentSortFieldInput,
    /// Sort query result is sorted descending or ascending (if not provided the default is
    /// ascending)
    desc: Option<bool>,
}

impl ProgramEnrolmentSortInput {
    pub fn to_domain(self) -> ProgramEnrolmentSort {
        let key = match self.key {
            ProgramEnrolmentSortFieldInput::Type => ProgramEnrolmentSortField::Type,
            ProgramEnrolmentSortFieldInput::PatientId => ProgramEnrolmentSortField::PatientId,
            ProgramEnrolmentSortFieldInput::EnrolmentDatetime => {
                ProgramEnrolmentSortField::EnrolmentDatetime
            }
            ProgramEnrolmentSortFieldInput::ProgramEnrolmentId => {
                ProgramEnrolmentSortField::ProgramEnrolmentId
            }
            ProgramEnrolmentSortFieldInput::Status => ProgramEnrolmentSortField::Status,
        };

        ProgramEnrolmentSort {
            key,
            desc: self.desc,
        }
    }
}

#[derive(InputObject, Clone)]
pub struct ProgramEnrolmentFilterInput {
    pub patient_id: Option<EqualFilterStringInput>,
    pub enrolment_datetime: Option<DatetimeFilterInput>,
    pub program_enrolment_id: Option<StringFilterInput>,
    pub status: Option<StringFilterInput>,
    /// Same as program enrolment document type
    pub r#type: Option<EqualFilterStringInput>,
    /// The program id
    pub program_id: Option<EqualFilterStringInput>,
    pub document_name: Option<EqualFilterStringInput>,
    pub program_name: Option<StringFilterInput>,
    pub is_immunisation_program: Option<bool>,
}
impl From<ProgramEnrolmentFilterInput> for ProgramEnrolmentFilter {
    fn from(f: ProgramEnrolmentFilterInput) -> Self {
        ProgramEnrolmentFilter {
            patient_id: f.patient_id.map(EqualFilter::from),
            enrolment_datetime: f.enrolment_datetime.map(DatetimeFilter::from),
            program_enrolment_id: f.program_enrolment_id.map(StringFilter::from),
            status: f.status.map(StringFilter::from),
            document_name: f.document_name.map(EqualFilter::from),
            document_type: f.r#type.map(EqualFilter::from),
            program_id: f.program_id.map(EqualFilter::from),
            program_context_id: None,
            program_name: f.program_name.map(StringFilter::from),
            is_immunisation_program: f.is_immunisation_program,
        }
    }
}

#[derive(InputObject, Clone)]
pub struct ProgramEventFilterInput {
    pub patient_id: Option<EqualFilterStringInput>,
    pub document_type: Option<EqualFilterStringInput>,
    pub document_name: Option<EqualFilterStringInput>,
    /// The event type
    pub r#type: Option<EqualFilterStringInput>,
    pub data: Option<StringFilterInput>,
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
            data,
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
            data: data.map(StringFilter::from),
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

pub struct ProgramEnrolmentNode {
    pub store_id: String,
    pub program_enrolment: ProgramEnrolment,
    pub allowed_ctx: Vec<String>,
}

impl ProgramEnrolmentNode {
    fn row(&self) -> &ProgramEnrolmentRow {
        &self.program_enrolment.row
    }

    fn program_row(&self) -> &ProgramRow {
        &self.program_enrolment.program_row
    }

    fn patient_row(&self) -> &NameRow {
        &self.program_enrolment.patient_row
    }
}

#[derive(SimpleObject)]
pub struct ProgramEnrolmentConnector {
    pub total_count: u32,
    pub nodes: Vec<ProgramEnrolmentNode>,
}

#[derive(Union)]
pub enum ProgramEnrolmentResponse {
    Response(ProgramEnrolmentConnector),
}

#[Object]
impl ProgramEnrolmentNode {
    pub async fn id(&self) -> &str {
        &self.row().id
    }

    /// The program type
    pub async fn r#type(&self) -> &str {
        &self.row().document_type
    }

    pub async fn context_id(&self) -> &str {
        &self.program_row().context_id
    }

    /// The program document name
    pub async fn name(&self) -> &str {
        &self.row().document_name
    }

    pub async fn patient_id(&self) -> &str {
        &self.patient_row().id
    }

    pub async fn is_immunisation_program(&self) -> bool {
        self.program_row().is_immunisation
    }

    pub async fn patient(&self, ctx: &Context<'_>) -> Result<PatientNode> {
        let loader = ctx.get_loader::<DataLoader<PatientLoader>>();

        let result = loader
            .load_one(self.patient_row().id.clone())
            .await?
            .map(|patient| PatientNode {
                store_id: self.store_id.clone(),
                allowed_ctx: self.allowed_ctx.clone(),
                patient,
            })
            .ok_or(Error::new("Program enrolment without patient"))?;

        Ok(result)
    }

    pub async fn enrolment_datetime(&self) -> DateTime<Utc> {
        DateTime::<Utc>::from_naive_utc_and_offset(self.row().enrolment_datetime, Utc)
    }

    pub async fn program_enrolment_id(&self) -> &Option<String> {
        &self.row().program_enrolment_id
    }

    pub async fn status(&self) -> &Option<String> {
        &self.row().status
    }

    /// The encounter document
    pub async fn document(&self, ctx: &Context<'_>) -> Result<DocumentNode> {
        let loader = ctx.get_loader::<DataLoader<DocumentLoader>>();

        let result = loader
            .load_one(self.row().document_name.clone())
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
            .map(EncounterFilter::from)
            .unwrap_or_default()
            .patient_id(EqualFilter::equal_to(&self.patient_row().id))
            .context_id(EqualFilter::equal_to(&self.program_row().context_id));

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
        page: Option<PaginationInput>,
        sort: Option<ProgramEventSortInput>,
    ) -> Result<ProgramEventResponse> {
        // TODO use loader?
        let context = ctx.service_provider().basic_context()?;
        let filter = filter
            .map(|f| f.to_domain())
            .unwrap_or_default()
            .patient_id(EqualFilter::equal_to(&self.patient_row().id))
            .document_type(EqualFilter::equal_to(&self.row().document_type));
        let list_result = ctx
            .service_provider()
            .program_event_service
            .active_events(
                &context,
                at.map(|at| at.naive_utc())
                    .unwrap_or(Utc::now().naive_utc()),
                page.map(PaginationOption::from),
                Some(filter),
                Some(sort.map(ProgramEventSortInput::to_domain).unwrap_or(Sort {
                    key: ProgramEventSortField::Datetime,
                    desc: Some(true),
                })),
                Some(&self.allowed_ctx),
            )
            .map_err(StandardGraphqlError::from_list_error)?;
        Ok(ProgramEventResponse::Response(ProgramEventConnector {
            total_count: list_result.count,
            nodes: list_result
                .rows
                .into_iter()
                .map(|program_event| ProgramEventNode {
                    store_id: self.store_id.clone(),
                    program_event,
                    allowed_ctx: self.allowed_ctx.clone(),
                })
                .collect(),
        }))
    }
}
