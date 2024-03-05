use async_graphql::{dataloader::DataLoader, *};
use chrono::{DateTime, Utc};
use graphql_core::{
    generic_filters::{DatetimeFilterInput, EqualFilterStringInput, StringFilterInput},
    loader::{
        ClinicianLoader, ClinicianLoaderInput, DocumentLoader, PatientLoader,
        ProgramEnrolmentLoader, ProgramEnrolmentLoaderInput,
    },
    map_filter,
    pagination::PaginationInput,
    standard_graphql_error::StandardGraphqlError,
    ContextExt,
};
use repository::{
    DatetimeFilter, Encounter, EncounterFilter, EncounterRow, EncounterSort, EncounterSortField,
    EncounterStatus, EqualFilter, NameRow, PaginationOption, ProgramEventFilter,
    ProgramEventSortField, Sort, StringFilter,
};
use serde::Serialize;
use service::programs::encounter::suggested_next_encounter::SuggestedNextEncounter;

use crate::types::ClinicianNode;

use super::{
    document::DocumentNode,
    patient::{PatientFilterInput, PatientNode},
    program_enrolment::{ProgramEnrolmentFilterInput, ProgramEnrolmentNode},
    program_event::{
        ProgramEventConnector, ProgramEventNode, ProgramEventResponse, ProgramEventSortInput,
    },
};

pub struct EncounterNode {
    pub store_id: String,
    pub encounter: Encounter,
    pub allowed_ctx: Vec<String>,
}

impl EncounterNode {
    fn encounter_row(&self) -> &EncounterRow {
        &self.encounter.row
    }

    fn patient_row(&self) -> &NameRow {
        &self.encounter.patient_row
    }
}

#[derive(SimpleObject)]
pub struct EncounterConnector {
    pub total_count: u32,
    pub nodes: Vec<EncounterNode>,
}

#[derive(InputObject, Clone)]
pub struct EqualFilterEncounterStatusInput {
    pub equal_to: Option<EncounterNodeStatus>,
    pub equal_any: Option<Vec<EncounterNodeStatus>>,
    pub not_equal_to: Option<EncounterNodeStatus>,
}

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(rename_items = "camelCase")]
pub enum EncounterSortFieldInput {
    Type,
    PatientId,
    Program,
    CreatedDatetime,
    StartDatetime,
    EndDatetime,
    Status,
}

#[derive(InputObject)]
pub struct EncounterSortInput {
    /// Sort query result by `key`
    key: EncounterSortFieldInput,
    /// Sort query result is sorted descending or ascending (if not provided the default is
    /// ascending)
    desc: Option<bool>,
}

impl EncounterSortInput {
    pub fn to_domain(self) -> EncounterSort {
        let key = match self.key {
            EncounterSortFieldInput::Type => EncounterSortField::DocumentType,
            EncounterSortFieldInput::PatientId => EncounterSortField::PatientId,
            EncounterSortFieldInput::Program => EncounterSortField::Context,
            EncounterSortFieldInput::CreatedDatetime => EncounterSortField::CreatedDatetime,
            EncounterSortFieldInput::StartDatetime => EncounterSortField::StartDatetime,
            EncounterSortFieldInput::EndDatetime => EncounterSortField::EndDatetime,
            EncounterSortFieldInput::Status => EncounterSortField::Status,
        };

        EncounterSort {
            key,
            desc: self.desc,
        }
    }
}

#[derive(InputObject, Clone)]
pub struct EncounterFilterInput {
    pub id: Option<EqualFilterStringInput>,
    pub r#type: Option<EqualFilterStringInput>,
    pub patient_id: Option<EqualFilterStringInput>,
    /// The program id
    pub program_id: Option<EqualFilterStringInput>,
    pub created_datetime: Option<DatetimeFilterInput>,
    pub start_datetime: Option<DatetimeFilterInput>,
    pub end_datetime: Option<DatetimeFilterInput>,
    pub status: Option<EqualFilterEncounterStatusInput>,
    pub clinician_id: Option<EqualFilterStringInput>,
    pub document_name: Option<EqualFilterStringInput>,
    pub document_data: Option<StringFilterInput>,
    pub patient: Option<PatientFilterInput>,
    pub program_enrolment: Option<ProgramEnrolmentFilterInput>,
    /// Only if this filter is set encounters with status DELETED are returned
    pub include_deleted: Option<bool>,
}

impl From<EncounterFilterInput> for EncounterFilter {
    fn from(f: EncounterFilterInput) -> Self {
        EncounterFilter {
            id: f.id.map(EqualFilter::from),
            patient_id: f.patient_id.map(EqualFilter::from),
            program_id: f.program_id.map(EqualFilter::from),
            created_datetime: f.created_datetime.map(DatetimeFilter::from),
            start_datetime: f.start_datetime.map(DatetimeFilter::from),
            status: f
                .status
                .map(|s| map_filter!(s, EncounterNodeStatus::to_domain)),
            end_datetime: f.end_datetime.map(DatetimeFilter::from),
            clinician_id: f.clinician_id.map(EqualFilter::from),
            document_type: f.r#type.map(EqualFilter::from),
            document_name: f.document_name.map(EqualFilter::from),
            document_data: f.document_data.map(StringFilter::from),
            program_context_id: None,
            patient: f.patient.map(PatientFilterInput::into),
            program_enrolment: f.program_enrolment.map(ProgramEnrolmentFilterInput::into),
        }
    }
}

#[derive(Enum, Copy, Clone, PartialEq, Eq, Debug, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")] // only needed to be comparable in tests
pub enum EncounterNodeStatus {
    Pending,
    Visited,
    Cancelled,
    Deleted,
}

impl EncounterNodeStatus {
    pub fn to_domain(self) -> EncounterStatus {
        match self {
            EncounterNodeStatus::Pending => EncounterStatus::Pending,
            EncounterNodeStatus::Visited => EncounterStatus::Visited,
            EncounterNodeStatus::Cancelled => EncounterStatus::Cancelled,
            EncounterNodeStatus::Deleted => EncounterStatus::Deleted,
        }
    }

    pub fn from_domain(status: &EncounterStatus) -> EncounterNodeStatus {
        match status {
            EncounterStatus::Pending => EncounterNodeStatus::Pending,
            EncounterStatus::Visited => EncounterNodeStatus::Visited,
            EncounterStatus::Cancelled => EncounterNodeStatus::Cancelled,
            EncounterStatus::Deleted => EncounterNodeStatus::Deleted,
        }
    }
}

#[derive(InputObject, Clone)]
pub struct ActiveEncounterEventFilterInput {
    pub r#type: Option<EqualFilterStringInput>,
    pub data: Option<StringFilterInput>,
    /// Only include events that are for the current encounter, i.e. have matching encounter type
    /// and matching encounter name of the current encounter. If not set all events with matching
    /// encounter type are returned.
    pub is_current_encounter: Option<bool>,
}

impl ActiveEncounterEventFilterInput {
    pub fn to_domain(self) -> ProgramEventFilter {
        let ActiveEncounterEventFilterInput {
            r#type,
            data,
            is_current_encounter: _,
        } = self;
        ProgramEventFilter {
            datetime: None,
            active_start_datetime: None,
            active_end_datetime: None,
            patient_id: None,
            document_type: None,
            document_name: None,
            r#type: r#type.map(EqualFilter::from),
            data: data.map(StringFilter::from),
            context_id: None,
        }
    }
}

#[derive(InputObject, Clone)]
pub struct EncounterEventFilterInput {
    pub r#type: Option<EqualFilterStringInput>,
    pub data: Option<StringFilterInput>,
    pub datetime: Option<DatetimeFilterInput>,
    pub active_start_datetime: Option<DatetimeFilterInput>,
    pub active_end_datetime: Option<DatetimeFilterInput>,

    /// Only include events that are for the current encounter, i.e. have matching encounter type
    /// and matching encounter name of the current encounter. If not set all events with matching
    /// encounter type are returned.
    pub is_current_encounter: Option<bool>,
}

impl EncounterEventFilterInput {
    pub fn to_domain(self) -> ProgramEventFilter {
        let EncounterEventFilterInput {
            r#type,
            data,
            datetime,
            active_start_datetime,
            active_end_datetime,
            is_current_encounter: _,
        } = self;
        ProgramEventFilter {
            datetime: datetime.map(DatetimeFilter::from),
            active_start_datetime: active_start_datetime.map(DatetimeFilter::from),
            active_end_datetime: active_end_datetime.map(DatetimeFilter::from),
            patient_id: None,
            document_type: None,
            document_name: None,
            r#type: r#type.map(EqualFilter::from),
            data: data.map(StringFilter::from),
            context_id: None,
        }
    }
}

pub struct SuggestedNextEncounterNode {
    suggested: SuggestedNextEncounter,
}

#[Object]
impl SuggestedNextEncounterNode {
    async fn start_datetime(&self) -> DateTime<Utc> {
        DateTime::<Utc>::from_utc(self.suggested.start_datetime, Utc)
    }

    async fn label(&self) -> &Option<String> {
        &self.suggested.label
    }
}

#[Object]
impl EncounterNode {
    pub async fn id(&self) -> &str {
        &self.encounter_row().id
    }

    pub async fn context_id(&self) -> &str {
        &self.encounter.program_row.context_id
    }

    pub async fn program_id(&self) -> &str {
        &self.encounter_row().program_id
    }

    pub async fn patient_id(&self) -> &str {
        &self.patient_row().id
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
            .ok_or(Error::new("Encounter without patient"))?;

        Ok(result)
    }

    pub async fn clinician(&self, ctx: &Context<'_>) -> Result<Option<ClinicianNode>> {
        let Some(clinician_id) = self.encounter.clinician_row.as_ref().map(|it| &it.id) else {
            return Ok(None);
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

    /// Returns the matching program enrolment for the patient of this encounter
    pub async fn program_enrolment(
        &self,
        ctx: &Context<'_>,
    ) -> Result<Option<ProgramEnrolmentNode>> {
        let loader = ctx.get_loader::<DataLoader<ProgramEnrolmentLoader>>();

        let result = loader
            .load_one(ProgramEnrolmentLoaderInput::new(
                &self.patient_row().id,
                &self.encounter_row().program_id,
                self.allowed_ctx.clone(),
            ))
            .await?
            .map(|program_enrolment| ProgramEnrolmentNode {
                store_id: self.store_id.clone(),
                program_enrolment,
                allowed_ctx: self.allowed_ctx.clone(),
            })
            .ok_or(Error::new(format!(
                "Failed to load program enrolment: {}",
                self.encounter_row().program_id
            )))?;

        Ok(Some(result))
    }

    pub async fn r#type(&self) -> &str {
        &self.encounter_row().document_type
    }

    pub async fn name(&self) -> &str {
        &self.encounter_row().document_name
    }

    pub async fn status(&self) -> Option<EncounterNodeStatus> {
        self.encounter_row()
            .status
            .as_ref()
            .map(|status| EncounterNodeStatus::from_domain(status))
    }

    pub async fn created_datetime(&self) -> DateTime<Utc> {
        DateTime::<Utc>::from_utc(self.encounter_row().created_datetime, Utc)
    }

    pub async fn start_datetime(&self) -> DateTime<Utc> {
        DateTime::<Utc>::from_utc(self.encounter_row().start_datetime, Utc)
    }

    pub async fn end_datetime(&self) -> Option<DateTime<Utc>> {
        self.encounter_row()
            .end_datetime
            .map(|t| DateTime::<Utc>::from_utc(t, Utc))
    }

    /// The encounter document
    pub async fn document(&self, ctx: &Context<'_>) -> Result<DocumentNode> {
        let loader = ctx.get_loader::<DataLoader<DocumentLoader>>();

        let result = loader
            .load_one(self.encounter_row().document_name.clone())
            .await?
            .map(|document| DocumentNode {
                allowed_ctx: self.allowed_ctx.clone(),
                document,
            })
            .ok_or(Error::new("Program without document"))?;

        Ok(result)
    }

    pub async fn active_program_events(
        &self,
        ctx: &Context<'_>,
        at: Option<DateTime<Utc>>,
        filter: Option<ActiveEncounterEventFilterInput>,
        page: Option<PaginationInput>,
        sort: Option<ProgramEventSortInput>,
    ) -> Result<ProgramEventResponse> {
        // TODO use loader?
        let context = ctx.service_provider().basic_context()?;
        let mut program_filter = filter
            .as_ref()
            .map(|f| f.clone().to_domain())
            .unwrap_or(ProgramEventFilter::new())
            .patient_id(EqualFilter::equal_to(&self.patient_row().id))
            .document_type(EqualFilter::equal_to(&self.encounter_row().document_type));
        if filter.and_then(|f| f.is_current_encounter).unwrap_or(false) {
            program_filter = program_filter
                .document_name(EqualFilter::equal_to(&self.encounter_row().document_name))
        };
        let list_result = ctx
            .service_provider()
            .program_event_service
            .active_events(
                &context,
                at.map(|at| at.naive_utc())
                    .unwrap_or(Utc::now().naive_utc()),
                page.map(PaginationOption::from),
                Some(program_filter),
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

    pub async fn program_events(
        &self,
        ctx: &Context<'_>,
        page: Option<PaginationInput>,
        sort: Option<ProgramEventSortInput>,
        filter: Option<EncounterEventFilterInput>,
    ) -> Result<ProgramEventResponse> {
        let context = ctx.service_provider().basic_context()?;
        let mut program_filter = filter
            .as_ref()
            .map(|f| f.clone().to_domain())
            .unwrap_or(ProgramEventFilter::new())
            .patient_id(EqualFilter::equal_to(&self.patient_row().id))
            .document_type(EqualFilter::equal_to(&self.encounter_row().document_type));
        if filter.and_then(|f| f.is_current_encounter).unwrap_or(false) {
            program_filter = program_filter
                .document_name(EqualFilter::equal_to(&self.encounter_row().document_name))
        };
        let list_result = ctx
            .service_provider()
            .program_event_service
            .events(
                &context,
                page.map(PaginationOption::from),
                Some(program_filter),
                sort.map(ProgramEventSortInput::to_domain),
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

    /// Tries to suggest a date for the next encounter
    async fn suggested_next_encounter(
        &self,
        ctx: &Context<'_>,
    ) -> Result<Option<SuggestedNextEncounterNode>> {
        let service_provider = ctx.service_provider();
        let context = service_provider.basic_context()?;
        let suggested = service_provider
            .encounter_service
            .suggested_next_encounter(
                &context,
                service_provider,
                &self.patient_row().id,
                &self.encounter_row().document_type,
                &self.allowed_ctx,
            )?;

        Ok(suggested.map(|suggested| SuggestedNextEncounterNode { suggested }))
    }
}
