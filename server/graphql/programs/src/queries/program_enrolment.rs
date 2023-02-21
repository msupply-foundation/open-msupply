use async_graphql::*;
use graphql_core::{
    generic_filters::{DatetimeFilterInput, EqualFilterStringInput},
    standard_graphql_error::validate_auth,
    ContextExt,
};
use repository::{
    DatetimeFilter, EqualFilter, Pagination, ProgramEnrolmentFilter, ProgramEnrolmentSort,
    ProgramEnrolmentSortField,
};
use service::{
    auth::{CapabilityTag, Resource, ResourceAccessRequest},
    usize_to_u32,
};

use crate::types::program_enrolment::ProgramEnrolmentNode;

#[derive(SimpleObject)]
pub struct ProgramEnrolmentConnector {
    pub total_count: u32,
    pub nodes: Vec<ProgramEnrolmentNode>,
}

#[derive(Union)]
pub enum ProgramEnrolmentResponse {
    Response(ProgramEnrolmentConnector),
}

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(rename_items = "camelCase")]
pub enum ProgramEnrolmentSortFieldInput {
    Type,
    PatientId,
    EnrolmentDatetime,
    ProgramPatientId,
}

#[derive(InputObject)]
pub struct ProgramEnrolmentSortInput {
    /// Sort query result by `key`
    key: ProgramEnrolmentSortFieldInput,
    /// Sort query result is sorted descending or ascending (if not provided the default is
    /// ascending)
    desc: Option<bool>,
}

#[derive(InputObject, Clone)]
pub struct ProgramEnrolmentFilterInput {
    pub program: Option<EqualFilterStringInput>,
    pub patient_id: Option<EqualFilterStringInput>,
    pub enrolment_datetime: Option<DatetimeFilterInput>,
    pub program_enrolment_id: Option<EqualFilterStringInput>,
}
impl ProgramEnrolmentFilterInput {
    pub fn to_domain_filter(self) -> ProgramEnrolmentFilter {
        ProgramEnrolmentFilter {
            program: self.program.map(EqualFilter::from),
            patient_id: self.patient_id.map(EqualFilter::from),
            enrolment_datetime: self.enrolment_datetime.map(DatetimeFilter::from),
            program_enrolment_id: self.program_enrolment_id.map(EqualFilter::from),
        }
    }
}

pub fn program_enrolments(
    ctx: &Context<'_>,
    store_id: String,
    sort: Option<ProgramEnrolmentSortInput>,
    filter: Option<ProgramEnrolmentFilterInput>,
) -> Result<ProgramEnrolmentResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryProgram,
            store_id: Some(store_id.clone()),
        },
    )?;
    let allowed_docs = user.capabilities(CapabilityTag::DocumentType);

    let service_provider = ctx.service_provider();
    let context = service_provider.basic_context()?;

    let nodes: Vec<ProgramEnrolmentNode> = service_provider
        .program_enrolment_service
        .program_enrolments(
            &context,
            Pagination::all(),
            sort.map(ProgramEnrolmentSortInput::to_domain),
            filter.map(|f| f.to_domain_filter()),
            allowed_docs.clone(),
        )?
        .into_iter()
        .map(|program_row| ProgramEnrolmentNode {
            store_id: store_id.clone(),
            program_row,
            allowed_docs: allowed_docs.clone(),
        })
        .collect();

    Ok(ProgramEnrolmentResponse::Response(
        ProgramEnrolmentConnector {
            total_count: usize_to_u32(nodes.len()),
            nodes,
        },
    ))
}

impl ProgramEnrolmentSortInput {
    pub fn to_domain(self) -> ProgramEnrolmentSort {
        let key = match self.key {
            ProgramEnrolmentSortFieldInput::Type => ProgramEnrolmentSortField::Type,
            ProgramEnrolmentSortFieldInput::PatientId => ProgramEnrolmentSortField::PatientId,
            ProgramEnrolmentSortFieldInput::EnrolmentDatetime => {
                ProgramEnrolmentSortField::EnrolmentDatetime
            }
            ProgramEnrolmentSortFieldInput::ProgramPatientId => {
                ProgramEnrolmentSortField::ProgramPatientId
            }
        };

        ProgramEnrolmentSort {
            key,
            desc: self.desc,
        }
    }
}
