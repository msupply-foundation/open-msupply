use async_graphql::{
    dataloader::DataLoader, Context, Enum, InputObject, Object, Result, SimpleObject, Union,
};
use graphql_core::{
    generic_filters::{EqualFilterStringInput, SimpleStringFilterInput},
    loader::StoreByIdLoader,
    pagination::PaginationInput,
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::StoreNode;
use repository::{
    Clinician, ClinicianFilter, ClinicianRow, ClinicianSort, ClinicianSortField, EqualFilter,
    PaginationOption, SimpleStringFilter,
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
    RegistrationCode,
    Category,
    Address1,
    Address2,
    Phone,
    Mobile,
    Email,
    Female,
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
    pub registration_code: Option<SimpleStringFilterInput>,
    pub category: Option<SimpleStringFilterInput>,
    pub address1: Option<SimpleStringFilterInput>,
    pub address2: Option<SimpleStringFilterInput>,
    pub phone: Option<SimpleStringFilterInput>,
    pub mobile: Option<SimpleStringFilterInput>,
    pub email: Option<SimpleStringFilterInput>,
    pub female: Option<bool>,
}

#[derive(PartialEq, Debug)]
pub struct ClinicianNode {
    pub clinician: Clinician,
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
            registration_code,
            category,
            address1,
            address2,
            phone,
            mobile,
            email,
            female,
        } = self;

        ClinicianFilter {
            id: id.map(EqualFilter::from),
            code: code.map(SimpleStringFilter::from),
            first_name: first_name.map(SimpleStringFilter::from),
            last_name: last_name.map(SimpleStringFilter::from),
            initials: initials.map(SimpleStringFilter::from),
            registration_code: registration_code.map(SimpleStringFilter::from),
            category: category.map(SimpleStringFilter::from),
            address1: address1.map(SimpleStringFilter::from),
            address2: address2.map(SimpleStringFilter::from),
            phone: phone.map(SimpleStringFilter::from),
            mobile: mobile.map(SimpleStringFilter::from),
            email: email.map(SimpleStringFilter::from),
            female: female.or(Some(false)),
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
            ClinicianSortFieldInput::RegistrationCode => ClinicianSortField::RegistrationCode,
            ClinicianSortFieldInput::Category => ClinicianSortField::Category,
            ClinicianSortFieldInput::Address1 => ClinicianSortField::Address1,
            ClinicianSortFieldInput::Address2 => ClinicianSortField::Address2,
            ClinicianSortFieldInput::Phone => ClinicianSortField::Phone,
            ClinicianSortFieldInput::Mobile => ClinicianSortField::Mobile,
            ClinicianSortFieldInput::Email => ClinicianSortField::Email,
            ClinicianSortFieldInput::Female => ClinicianSortField::Female,
        };

        ClinicianSort {
            key,
            desc: self.desc,
        }
    }
}

impl ClinicianNode {
    pub fn from_domain(clinician: Clinician) -> Self {
        ClinicianNode { clinician }
    }

    pub fn row(&self) -> &ClinicianRow {
        &self.clinician
    }
}

#[Object]
impl ClinicianNode {
    pub async fn id(&self) -> &str {
        &self.row().id
    }

    pub async fn store(&self, ctx: &Context<'_>) -> Result<Option<StoreNode>> {
        let loader = ctx.get_loader::<DataLoader<StoreByIdLoader>>();
        Ok(loader
            .load_one(self.row().store_id.to_string())
            .await?
            .map(StoreNode::from_domain))
    }

    pub async fn code(&self) -> &str {
        &self.row().code
    }

    pub async fn last_name(&self) -> &str {
        &self.row().last_name
    }

    pub async fn initials(&self) -> &str {
        &self.row().initials
    }

    pub async fn first_name(&self) -> &Option<String> {
        &self.row().first_name
    }

    pub async fn registration_code(&self) -> &Option<String> {
        &self.row().registration_code
    }

    pub async fn category(&self) -> &Option<String> {
        &self.row().category
    }

    pub async fn address1(&self) -> &Option<String> {
        &self.row().address1
    }

    pub async fn address2(&self) -> &Option<String> {
        &self.row().address2
    }

    pub async fn phone(&self) -> &Option<String> {
        &self.row().phone
    }

    pub async fn mobile(&self) -> &Option<String> {
        &self.row().mobile
    }

    pub async fn email(&self) -> &Option<String> {
        &self.row().email
    }

    pub async fn is_female(&self) -> bool {
        self.row().is_female
    }
}
