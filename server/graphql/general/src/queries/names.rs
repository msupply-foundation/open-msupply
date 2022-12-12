use async_graphql::{Context, Enum, InputObject, Result, SimpleObject, Union};
use graphql_core::{
    generic_filters::{DateFilterInput, EqualFilterStringInput, SimpleStringFilterInput},
    map_filter,
    pagination::PaginationInput,
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::{NameNode, NameNodeType};
use repository::{DateFilter, EqualFilter, Gender, PaginationOption, SimpleStringFilter};
use repository::{Name, NameFilter, NameSort, NameSortField};
use serde::Serialize;
use service::{
    auth::{Resource, ResourceAccessRequest},
    ListResult,
};

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(rename_items = "camelCase")]
pub enum NameSortFieldInput {
    Name,
    Code,
}

#[derive(InputObject)]
pub struct NameSortInput {
    /// Sort query result by `key`
    key: NameSortFieldInput,
    /// Sort query result is sorted descending or ascending (if not provided the default is
    /// ascending)
    desc: Option<bool>,
}

#[derive(InputObject, Clone)]
pub struct EqualFilterNameTypeInput {
    pub equal_to: Option<NameNodeType>,
    pub equal_any: Option<Vec<NameNodeType>>,
    pub not_equal_to: Option<NameNodeType>,
}

#[derive(Enum, Copy, Clone, PartialEq, Eq, Debug, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")] // only needed to be comparable in tests
pub enum GenderInput {
    Female,
    Male,
    TransgenderMale,
    TransgenderMaleHormone,
    TransgenderMaleSurgical,
    TransgenderFemale,
    TransgenderFemaleHormone,
    TransgenderFemaleSurgical,
    Unknown,
    NonBinary,
}

impl GenderInput {
    pub fn to_domain(self) -> Gender {
        match self {
            GenderInput::Female => Gender::Female,
            GenderInput::Male => Gender::Male,
            GenderInput::TransgenderMale => Gender::TransgenderMale,
            GenderInput::TransgenderMaleHormone => Gender::TransgenderMaleHormone,
            GenderInput::TransgenderMaleSurgical => Gender::TransgenderMaleSurgical,
            GenderInput::TransgenderFemale => Gender::TransgenderFemale,
            GenderInput::TransgenderFemaleHormone => Gender::TransgenderFemaleHormone,
            GenderInput::TransgenderFemaleSurgical => Gender::TransgenderFemaleSurgical,
            GenderInput::Unknown => Gender::Unknown,
            GenderInput::NonBinary => Gender::NonBinary,
        }
    }
}

#[derive(InputObject, Clone)]
pub struct EqualFilterGenderInput {
    pub equal_to: Option<GenderInput>,
    pub equal_any: Option<Vec<GenderInput>>,
    pub not_equal_to: Option<GenderInput>,
}

#[derive(InputObject, Clone)]
pub struct NameFilterInput {
    pub id: Option<EqualFilterStringInput>,
    /// Filter by name
    pub name: Option<SimpleStringFilterInput>,
    /// Filter by code
    pub code: Option<SimpleStringFilterInput>,
    /// Filter by national health number
    pub national_health_number: Option<SimpleStringFilterInput>,
    /// Filter by customer property
    pub is_customer: Option<bool>,
    /// Filter by supplier property
    pub is_supplier: Option<bool>,
    /// Is this name a store
    pub is_store: Option<bool>,
    /// Code of the store if store is linked to name
    pub store_code: Option<SimpleStringFilterInput>,
    /// Visibility in current store (based on store_id parameter and existence of name_store_join record)
    pub is_visible: Option<bool>,
    /// Show system names (defaults to false)
    /// System names don't have name_store_join thus if queried with true filter, is_visible filter should also be true or null
    /// if is_visible is set to true and is_system_name is also true no system names will be returned
    pub is_system_name: Option<bool>,
    /// Filter by the name type
    pub r#type: Option<EqualFilterTypeInput>,

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

#[derive(SimpleObject)]
pub struct NameConnector {
    total_count: u32,
    nodes: Vec<NameNode>,
}

#[derive(Union)]
pub enum NamesResponse {
    Response(NameConnector),
}

#[derive(InputObject, Clone)]
pub struct EqualFilterTypeInput {
    pub equal_to: Option<NameNodeType>,
    pub equal_any: Option<Vec<NameNodeType>>,
    pub not_equal_to: Option<NameNodeType>,
}

pub fn get_names(
    ctx: &Context<'_>,
    store_id: String,
    page: Option<PaginationInput>,
    filter: Option<NameFilterInput>,
    sort: Option<Vec<NameSortInput>>,
) -> Result<NamesResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryName,
            store_id: Some(store_id.clone()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.clone(), user.user_id)?;

    let names = service_provider
        .general_service
        .get_names(
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

    Ok(NamesResponse::Response(NameConnector::from_domain(names)))
}

impl NameFilterInput {
    pub fn to_domain(self) -> NameFilter {
        let NameFilterInput {
            id,
            name,
            code,
            national_health_number,
            is_customer,
            is_supplier,
            is_store,
            store_code,
            is_visible,
            is_system_name,
            r#type,
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

        NameFilter {
            id: id.map(EqualFilter::from),
            name: name.map(SimpleStringFilter::from),
            code: code.map(SimpleStringFilter::from),
            national_health_number: national_health_number.map(SimpleStringFilter::from),
            store_code: store_code.map(SimpleStringFilter::from),
            is_customer,
            is_supplier,
            is_store,
            is_visible,
            is_system_name: is_system_name.or(Some(false)),
            r#type: r#type.map(|t| map_filter!(t, NameNodeType::to_domain)),
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

impl NameConnector {
    pub fn from_domain(names: ListResult<Name>) -> NameConnector {
        NameConnector {
            total_count: names.count,
            nodes: names.rows.into_iter().map(NameNode::from_domain).collect(),
        }
    }
}

impl NameSortInput {
    pub fn to_domain(self) -> NameSort {
        use NameSortField as to;
        use NameSortFieldInput as from;
        let key = match self.key {
            from::Name => to::Name,
            from::Code => to::Code,
        };

        NameSort {
            key,
            desc: self.desc,
        }
    }
}
