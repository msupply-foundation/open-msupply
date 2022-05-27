use async_graphql::*;
use graphql_core::generic_filters::{
    DateFilterInput, EqualFilterStringInput, SimpleStringFilterInput,
};
use graphql_core::map_filter;
use graphql_core::pagination::PaginationInput;
use graphql_core::{standard_graphql_error::validate_auth, ContextExt};
use graphql_general::{EqualFilterGenderInput, GenderInput};
use repository::{DateFilter, EqualFilter, PaginationOption, SimpleStringFilter};
use service::auth::{Resource, ResourceAccessRequest};
use service::document::patient::{
    Patient, PatientFilter, PatientService, PatientServiceTrait, PatientSort, PatientSortField,
};
use service::usize_to_u32;

pub struct PatientNode {
    pub patient: Patient,
}

#[Object]
impl PatientNode {
    pub async fn id(&self) -> &str {
        &self.patient.name_row.id
    }

    pub async fn name(&self) -> &str {
        &self.patient.name_row.name
    }
}

#[derive(SimpleObject)]
pub struct PatientConnector {
    pub total_count: u32,
    pub nodes: Vec<PatientNode>,
}

#[derive(Union)]
pub enum PatientResponse {
    Response(PatientConnector),
}

#[derive(InputObject, Clone)]
pub struct PatientFilterInput {
    pub id: Option<EqualFilterStringInput>,
    pub first_name: Option<SimpleStringFilterInput>,
    pub last_name: Option<SimpleStringFilterInput>,
    pub gender: Option<EqualFilterGenderInput>,
    pub date_of_birth: Option<DateFilterInput>,
    pub phone: Option<SimpleStringFilterInput>,
    pub address1: Option<SimpleStringFilterInput>,
    pub address2: Option<SimpleStringFilterInput>,
    pub country: Option<SimpleStringFilterInput>,
    pub email: Option<SimpleStringFilterInput>,
}

impl PatientFilterInput {
    fn to_domain(self) -> PatientFilter {
        let PatientFilterInput {
            id,
            first_name,
            last_name,
            gender,
            date_of_birth,
            phone,
            address1,
            address2,
            country,
            email,
        } = self;
        PatientFilter {
            id: id.map(EqualFilter::from),
            first_name: first_name.map(SimpleStringFilter::from),
            last_name: last_name.map(SimpleStringFilter::from),
            gender: gender.map(|t| map_filter!(t, GenderInput::to_domain)),
            date_of_birth: date_of_birth.map(DateFilter::from),
            phone: phone.map(SimpleStringFilter::from),
            address1: address1.map(SimpleStringFilter::from),
            address2: address2.map(SimpleStringFilter::from),
            country: country.map(SimpleStringFilter::from),
            email: email.map(SimpleStringFilter::from),
        }
    }
}

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(rename_items = "camelCase")]
pub enum PatientSortFieldInput {
    Name,
    FirstName,
    LastName,
    Gender,
    DateOfBirth,
    Phone,
    Address1,
    Address2,
    Country,
    Email,
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
                PatientSortFieldInput::FirstName => PatientSortField::FirstName,
                PatientSortFieldInput::LastName => PatientSortField::LastName,
                PatientSortFieldInput::Gender => PatientSortField::Gender,
                PatientSortFieldInput::DateOfBirth => PatientSortField::DateOfBirth,
                PatientSortFieldInput::Phone => PatientSortField::Phone,
                PatientSortFieldInput::Address1 => PatientSortField::Address1,
                PatientSortFieldInput::Address2 => PatientSortField::Address2,
                PatientSortFieldInput::Country => PatientSortField::Country,
                PatientSortFieldInput::Email => PatientSortField::Email,
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
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryPatient,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let context = service_provider.context()?;
    let service = PatientService {};

    let nodes: Vec<PatientNode> = service
        .get_patients(
            &context,
            &store_id,
            page.map(PaginationOption::from),
            filter.map(PatientFilterInput::to_domain),
            sort.and_then(|mut sort_list| sort_list.pop())
                .map(|sort| sort.to_domain()),
        )?
        .into_iter()
        .map(|patient| PatientNode { patient })
        .collect();

    Ok(PatientResponse::Response(PatientConnector {
        total_count: usize_to_u32(nodes.len()),
        nodes,
    }))
}
