use async_graphql::*;
use graphql_core::{
    generic_filters::{DatetimeFilterInput, EqualFilterStringInput},
    standard_graphql_error::validate_auth,
    ContextExt,
};
use repository::{
    DatetimeFilter, EqualFilter, Pagination, ProgramFilter, ProgramSort, ProgramSortField,
};
use service::{
    auth::{Resource, ResourceAccessRequest},
    usize_to_u32,
};

use crate::types::program::ProgramNode;

#[derive(SimpleObject)]
pub struct ProgramConnector {
    pub total_count: u32,
    pub nodes: Vec<ProgramNode>,
}

#[derive(Union)]
pub enum ProgramResponse {
    Response(ProgramConnector),
}

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(rename_items = "camelCase")]
pub enum ProgramSortFieldInput {
    Type,
    PatientId,
    EnrolmentDatetime,
    ProgramPatientId,
}

#[derive(InputObject)]
pub struct ProgramSortInput {
    /// Sort query result by `key`
    key: ProgramSortFieldInput,
    /// Sort query result is sorted descending or ascending (if not provided the default is
    /// ascending)
    desc: Option<bool>,
}

#[derive(InputObject, Clone)]
pub struct ProgramFilterInput {
    pub r#type: Option<EqualFilterStringInput>,
    pub patient_id: Option<EqualFilterStringInput>,
    pub enrolment_datetime: Option<DatetimeFilterInput>,
    pub program_patient_id: Option<EqualFilterStringInput>,
}
fn to_domain_filter(f: ProgramFilterInput) -> ProgramFilter {
    ProgramFilter {
        r#type: f.r#type.map(EqualFilter::from),
        patient_id: f.patient_id.map(EqualFilter::from),
        enrolment_datetime: f.enrolment_datetime.map(DatetimeFilter::from),
        program_patient_id: f.program_patient_id.map(EqualFilter::from),
    }
}

pub fn programs(
    ctx: &Context<'_>,
    store_id: String,
    sort: Option<ProgramSortInput>,
    filter: Option<ProgramFilterInput>,
) -> Result<ProgramResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryProgram,
            store_id: Some(store_id.clone()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let context = service_provider.context()?;

    let nodes: Vec<ProgramNode> = service_provider
        .program_service
        .get_patient_programs(
            &context,
            Pagination::all(),
            sort.map(ProgramSortInput::to_domain),
            filter.map(to_domain_filter),
        )?
        .into_iter()
        .map(|program_row| ProgramNode {
            store_id: store_id.clone(),
            program_row,
        })
        .collect();

    Ok(ProgramResponse::Response(ProgramConnector {
        total_count: usize_to_u32(nodes.len()),
        nodes,
    }))
}

impl ProgramSortInput {
    pub fn to_domain(self) -> ProgramSort {
        let key = match self.key {
            ProgramSortFieldInput::Type => ProgramSortField::Type,
            ProgramSortFieldInput::PatientId => ProgramSortField::PatientId,
            ProgramSortFieldInput::EnrolmentDatetime => ProgramSortField::EnrolmentDatetime,
            ProgramSortFieldInput::ProgramPatientId => ProgramSortField::ProgramPatientId,
        };

        ProgramSort {
            key,
            desc: self.desc,
        }
    }
}
