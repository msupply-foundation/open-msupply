use async_graphql::*;
use graphql_core::{
    generic_filters::{DatetimeFilterInput, EqualFilterStringInput},
    standard_graphql_error::validate_auth,
    ContextExt,
};
use repository::{
    DatetimeFilter, EqualFilter, Pagination, Permission, ProgramEnrolmentFilter,
    ProgramEnrolmentSort, ProgramEnrolmentSortField,
};
use service::{
    auth::{context_permissions, Resource, ResourceAccessRequest},
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
    pub r#type: Option<EqualFilterStringInput>,
    pub patient_id: Option<EqualFilterStringInput>,
    pub enrolment_datetime: Option<DatetimeFilterInput>,
    pub program_patient_id: Option<EqualFilterStringInput>,
}
impl ProgramEnrolmentFilterInput {
    fn to_domain_filter(self) -> ProgramEnrolmentFilter {
        ProgramEnrolmentFilter {
            r#type: self.r#type.map(EqualFilter::from),
            patient_id: self.patient_id.map(EqualFilter::from),
            enrolment_datetime: self.enrolment_datetime.map(DatetimeFilter::from),
            program_patient_id: self.program_patient_id.map(EqualFilter::from),
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
    let allowed_docs = context_permissions(Permission::ProgramQuery, &user.permissions);

    let mut filter = filter
        .map(|f| f.to_domain_filter())
        .unwrap_or(ProgramEnrolmentFilter::new());
    // restrict query results to allowed entries
    filter.r#type = Some(
        filter
            .r#type
            .unwrap_or_default()
            .restrict_results(&allowed_docs),
    );

    let service_provider = ctx.service_provider();
    let context = service_provider.basic_context()?;

    let nodes: Vec<ProgramEnrolmentNode> = service_provider
        .program_enrolment_service
        .program_enrolments(
            &context,
            Pagination::all(),
            sort.map(ProgramEnrolmentSortInput::to_domain),
            Some(filter),
        )?
        .into_iter()
        .map(|program_row| ProgramEnrolmentNode {
            store_id: store_id.clone(),
            program_row,
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
