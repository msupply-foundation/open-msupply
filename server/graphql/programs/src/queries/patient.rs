use async_graphql::*;
use graphql_core::pagination::PaginationInput;
use graphql_core::{standard_graphql_error::validate_auth, ContextExt};
use graphql_types::types::patient::{PatientFilterInput, PatientNode};
use repository::{EqualFilter, PaginationOption, PatientFilter, PatientSort, PatientSortField};
use service::auth::{Resource, ResourceAccessRequest};

#[derive(SimpleObject)]
pub struct PatientConnector {
    pub total_count: u32,
    pub nodes: Vec<PatientNode>,
}

#[derive(Union)]
pub enum PatientResponse {
    Response(PatientConnector),
}

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(rename_items = "camelCase")]
pub enum PatientSortFieldInput {
    Name,
    Code,
    Code2,
    FirstName,
    LastName,
    Gender,
    DateOfBirth,
    Phone,
    Address1,
    Address2,
    Country,
    Email,
    DateOfDeath,
}

#[derive(InputObject)]
pub struct PatientSortInput {
    /// Sort query result by `key`
    key: PatientSortFieldInput,
    /// Sort query result is sorted descending or ascending (if not provided the default is
    /// ascending)
    desc: Option<bool>,
}

impl PatientSortInput {
    fn to_domain(self) -> PatientSort {
        PatientSort {
            key: match self.key {
                PatientSortFieldInput::Name => PatientSortField::Name,
                PatientSortFieldInput::Code => PatientSortField::Code,
                PatientSortFieldInput::Code2 => PatientSortField::Code2,
                PatientSortFieldInput::FirstName => PatientSortField::FirstName,
                PatientSortFieldInput::LastName => PatientSortField::LastName,
                PatientSortFieldInput::Gender => PatientSortField::Gender,
                PatientSortFieldInput::DateOfBirth => PatientSortField::DateOfBirth,
                PatientSortFieldInput::Phone => PatientSortField::Phone,
                PatientSortFieldInput::Address1 => PatientSortField::Address1,
                PatientSortFieldInput::Address2 => PatientSortField::Address2,
                PatientSortFieldInput::Country => PatientSortField::Country,
                PatientSortFieldInput::Email => PatientSortField::Email,
                PatientSortFieldInput::DateOfDeath => PatientSortField::DateOfDeath,
            },
            desc: self.desc,
        }
    }
}

pub fn patients(
    ctx: &Context<'_>,
    store_id: String,
    page: Option<PaginationInput>,
    filter: Option<PatientFilterInput>,
    sort: Option<Vec<PatientSortInput>>,
) -> Result<PatientResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryPatient,
            store_id: Some(store_id.to_string()),
        },
    )?;
    let allowed_ctx = user.capabilities();

    let service_provider = ctx.service_provider();
    let context = service_provider.basic_context()?;

    let patients = service_provider.patient_service.get_patients(
        &context,
        page.map(PaginationOption::from),
        filter.map(PatientFilter::from),
        sort.and_then(|mut sort_list| sort_list.pop())
            .map(|sort| sort.to_domain()),
        Some(allowed_ctx),
    )?;
    let nodes: Vec<PatientNode> = patients
        .rows
        .into_iter()
        .map(|patient| PatientNode {
            store_id: store_id.clone(),
            patient,
            allowed_ctx: allowed_ctx.clone(),
        })
        .collect();
    Ok(PatientResponse::Response(PatientConnector {
        total_count: patients.count,
        nodes,
    }))
}

pub fn patient(
    ctx: &Context<'_>,
    store_id: String,
    patient_id: String,
) -> Result<Option<PatientNode>> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryPatient,
            store_id: Some(store_id.to_string()),
        },
    )?;
    let allowed_ctx = user.capabilities();

    let service_provider = ctx.service_provider();
    let context = service_provider.basic_context()?;

    let node = service_provider
        .patient_service
        .get_patients(
            &context,
            None,
            Some(PatientFilter::new().id(EqualFilter::equal_to(&patient_id))),
            None,
            Some(allowed_ctx),
        )?
        .rows
        .pop()
        .map(|patient| PatientNode {
            store_id: store_id.clone(),
            patient,
            allowed_ctx: allowed_ctx.clone(),
        });

    Ok(node)
}
