use async_graphql::*;

use graphql_core::generic_filters::EqualFilterStringInput;
use graphql_core::pagination::PaginationInput;
use graphql_core::standard_graphql_error::validate_auth;
use graphql_core::standard_graphql_error::StandardGraphqlError;
use graphql_core::ContextExt;
use graphql_types::types::ReturnReasonConnector;
use repository::EqualFilter;
use repository::PaginationOption;
use repository::ReasonOptionFilter;
use repository::ReasonOptionSort;
use repository::ReasonOptionSortField;
use repository::ReasonOptionType;
use service::auth::{Resource, ResourceAccessRequest};
use service::reason_option::get_reason_options;

#[derive(InputObject, Clone)]
pub struct ReturnReasonFilterInput {
    pub id: Option<EqualFilterStringInput>,
    pub is_active: Option<bool>,
}

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(rename_items = "camelCase")]
pub enum ReturnReasonSortFieldInput {
    Id,
    Reason,
}

#[derive(InputObject)]
pub struct ReturnReasonSortInput {
    /// Sort query result by `key`
    key: ReturnReasonSortFieldInput,
    /// Sort query result is sorted descending or ascending (if not provided the default is
    /// ascending)
    desc: Option<bool>,
}

pub fn return_reasons(
    ctx: &Context<'_>,
    page: Option<PaginationInput>,
    filter: Option<ReturnReasonFilterInput>,
    sort: Option<Vec<ReturnReasonSortInput>>,
) -> Result<ReturnReasonResponse> {
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
        Some(map_return_reason_filter(filter)),
        // Currently only one sort option is supported, use the first from the list.
        sort.and_then(|mut sort_list| sort_list.pop())
            .map(|sort| sort.to_domain()),
    )
    .map_err(StandardGraphqlError::from_list_error)?;

    Ok(ReturnReasonResponse::Response(
        ReturnReasonConnector::from_domain(items),
    ))
}

// Map from ReturnReasonFilter => ReasonOptionFilter
fn map_return_reason_filter(filter: Option<ReturnReasonFilterInput>) -> ReasonOptionFilter {
    let base_filter = ReasonOptionFilter {
        id: None,
        r#type: Some(EqualFilter {
            equal_to: Some(ReasonOptionType::ReturnReason),
            not_equal_to: None,
            equal_any: None,
            equal_any_or_null: None,
            not_equal_all: None,
            is_null: None,
        }),
        is_active: None,
    };

    match filter {
        Some(filter) => ReasonOptionFilter {
            id: filter.id.map(EqualFilter::from),
            is_active: filter.is_active,
            ..base_filter
        },
        None => base_filter,
    }
}

#[derive(Union)]
pub enum ReturnReasonResponse {
    Response(ReturnReasonConnector),
}

impl ReturnReasonSortInput {
    pub fn to_domain(self) -> ReasonOptionSort {
        use ReasonOptionSortField as to;
        use ReturnReasonSortFieldInput as from;

        let key = match self.key {
            from::Id => to::Reason, // // TODO: Implement sort by ID for ReasonOptionSortField or remove from ReturnReasonSortField
            from::Reason => to::Reason,
        };

        ReasonOptionSort {
            key,
            desc: self.desc,
        }
    }
}
