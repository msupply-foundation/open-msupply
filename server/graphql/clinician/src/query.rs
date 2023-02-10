use async_graphql::{Context, Enum, InputObject, Result, SimpleObject, Union};
use graphql_core::{
    generic_filters::{EqualFilterStringInput, SimpleStringFilterInput},
    pagination::PaginationInput,
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::ClinicianNode;
use repository::{
    Clinician, ClinicianFilter, ClinicianSort, ClinicianSortField, EqualFilter, PaginationOption,
    SimpleStringFilter,
};
use service::{
    auth::{Resource, ResourceAccessRequest},
    ListResult,
};

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(rename_items = "camelCase")]
pub enum ClinicianSortFieldInput {
    Code,
    FirstName,
    LastName,
    Initials,
    Address1,
    Address2,
    Phone,
    Mobile,
    Email,
}

#[derive(InputObject)]
pub struct ClinicianSortInput {
    /// Sort query result by `key`
    key: ClinicianSortFieldInput,
    /// Sort query result is sorted descending or ascending (if not provided the default is
    /// ascending)
    desc: Option<bool>,
}

#[derive(InputObject, Clone)]
pub struct ClinicianFilterInput {
    pub id: Option<EqualFilterStringInput>,

    pub code: Option<SimpleStringFilterInput>,
    pub first_name: Option<SimpleStringFilterInput>,
    pub last_name: Option<SimpleStringFilterInput>,
    pub initials: Option<SimpleStringFilterInput>,
    pub address1: Option<SimpleStringFilterInput>,
    pub address2: Option<SimpleStringFilterInput>,
    pub phone: Option<SimpleStringFilterInput>,
    pub mobile: Option<SimpleStringFilterInput>,
    pub email: Option<SimpleStringFilterInput>,
}

#[derive(SimpleObject)]
pub struct ClinicianConnector {
    total_count: u32,
    nodes: Vec<ClinicianNode>,
}

#[derive(Union)]
pub enum CliniciansResponse {
    Response(ClinicianConnector),
}

pub fn clinicians(
    ctx: &Context<'_>,
    store_id: String,
    page: Option<PaginationInput>,
    filter: Option<ClinicianFilterInput>,
    sort: Option<Vec<ClinicianSortInput>>,
) -> Result<CliniciansResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryClinician,
            store_id: Some(store_id.clone()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.clone(), user.user_id)?;

    let clinician = service_provider
        .clinician_service
        .get_clinicians(
            &service_context,
            &store_id,
            page.map(PaginationOption::from),
            filter.map(|filter| filter.to_domain()),
            // Currently only one sort option is supported, use the first from the list.
            sort.map(|mut sort_list| sort_list.pop())
                .flatten()
                .map(|sort| sort.to_domain()),
        )
        .map_err(StandardGraphqlError::from_list_error)?;

    Ok(CliniciansResponse::Response(
        ClinicianConnector::from_domain(clinician),
    ))
}

impl ClinicianFilterInput {
    pub fn to_domain(self) -> ClinicianFilter {
        let ClinicianFilterInput {
            id,
            code,
            first_name,
            last_name,
            initials,
            address1,
            address2,
            phone,
            mobile,
            email,
        } = self;

        ClinicianFilter {
            id: id.map(EqualFilter::from),
            code: code.map(SimpleStringFilter::from),
            first_name: first_name.map(SimpleStringFilter::from),
            last_name: last_name.map(SimpleStringFilter::from),
            initials: initials.map(SimpleStringFilter::from),
            address1: address1.map(SimpleStringFilter::from),
            address2: address2.map(SimpleStringFilter::from),
            phone: phone.map(SimpleStringFilter::from),
            mobile: mobile.map(SimpleStringFilter::from),
            email: email.map(SimpleStringFilter::from),
        }
    }
}

impl ClinicianConnector {
    pub fn from_domain(names: ListResult<Clinician>) -> Self {
        ClinicianConnector {
            total_count: names.count,
            nodes: names
                .rows
                .into_iter()
                .map(ClinicianNode::from_domain)
                .collect(),
        }
    }
}

impl ClinicianSortInput {
    pub fn to_domain(self) -> ClinicianSort {
        let key = match self.key {
            ClinicianSortFieldInput::Code => ClinicianSortField::Code,
            ClinicianSortFieldInput::FirstName => ClinicianSortField::FirstName,
            ClinicianSortFieldInput::LastName => ClinicianSortField::LastName,
            ClinicianSortFieldInput::Initials => ClinicianSortField::Initials,
            ClinicianSortFieldInput::Address1 => ClinicianSortField::Address1,
            ClinicianSortFieldInput::Address2 => ClinicianSortField::Address2,
            ClinicianSortFieldInput::Phone => ClinicianSortField::Phone,
            ClinicianSortFieldInput::Mobile => ClinicianSortField::Mobile,
            ClinicianSortFieldInput::Email => ClinicianSortField::Email,
        };

        ClinicianSort {
            key,
            desc: self.desc,
        }
    }
}
