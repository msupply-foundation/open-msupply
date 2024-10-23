use async_graphql::*;
use graphql_core::{
    generic_filters::EqualFilterStringInput,
    map_filter,
    pagination::PaginationInput,
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::{ReasonOptionConnector, ReasonOptionNodeType};
use repository::{
    reason_option::{ReasonOptionFilter, ReasonOptionSort, ReasonOptionSortField},
    EqualFilter, PaginationOption,
};
use service::{
    auth::{Resource, ResourceAccessRequest},
    reason_option::get_reason_options,
};

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(remote = "repository::reason_option::ReasonOptionSortField")]
#[graphql(rename_items = "camelCase")]
pub enum ReasonOptionSortFieldInput {
    ReasonOptionType,
    Reason,
}

#[derive(InputObject)]
pub struct ReasonOptionSortInput {
    /// Sort query result by `key`
    key: ReasonOptionSortFieldInput,
    /// Sort query result is sorted descending or ascending (if not provided the default is
    /// ascending)
    desc: Option<bool>,
}

#[derive(InputObject, Clone)]
pub struct EqualFilterReasonOptionTypeInput {
    pub equal_to: Option<ReasonOptionNodeType>,
    pub equal_any: Option<Vec<ReasonOptionNodeType>>,
    pub not_equal_to: Option<ReasonOptionNodeType>,
}

#[derive(InputObject, Clone)]
pub struct ReasonOptionFilterInput {
    pub id: Option<EqualFilterStringInput>,
    pub r#type: Option<EqualFilterReasonOptionTypeInput>,
    pub is_active: Option<bool>,
}

#[derive(Union)]
pub enum ReasonOptionResponse {
    Response(ReasonOptionConnector),
}

pub fn reason_options(
    ctx: &Context<'_>,
    page: Option<PaginationInput>,
    filter: Option<ReasonOptionFilterInput>,
    sort: Option<Vec<ReasonOptionSortInput>>,
) -> Result<ReasonOptionResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryReasonOptions,
            store_id: None,
        },
    )?;

    let connection_manager = ctx.get_connection_manager();
    let items = get_reason_options(
        connection_manager,
        page.map(PaginationOption::from),
        filter.map(|filter| filter.to_domain()),
        // Currently only one sort option is supported, use the first from the list.
        sort.and_then(|mut sort_list| sort_list.pop())
            .map(|sort| sort.to_domain()),
    )
    .map_err(StandardGraphqlError::from_list_error)?;

    Ok(ReasonOptionResponse::Response(
        ReasonOptionConnector::from_domain(items),
    ))
}

impl ReasonOptionFilterInput {
    pub fn to_domain(self) -> ReasonOptionFilter {
        let ReasonOptionFilterInput {
            id,
            r#type,
            is_active,
        } = self;

        ReasonOptionFilter {
            id: id.map(EqualFilter::from),
            r#type: r#type.map(|t| map_filter!(t, ReasonOptionNodeType::to_domain)),
            is_active,
        }
    }
}

impl ReasonOptionSortInput {
    pub fn to_domain(self) -> ReasonOptionSort {
        use ReasonOptionSortField as to;
        use ReasonOptionSortFieldInput as from;
        let key = match self.key {
            from::ReasonOptionType => to::ReasonOptionType,
            from::Reason => to::Reason,
        };

        ReasonOptionSort {
            key,
            desc: self.desc,
        }
    }
}
