use async_graphql::*;
use graphql_core::generic_filters::EqualFilterStringInput;
use graphql_core::pagination::PaginationInput;
use graphql_core::standard_graphql_error::validate_auth;
use graphql_core::standard_graphql_error::StandardGraphqlError;
use graphql_core::ContextExt;
use graphql_types::types::ReturnReasonConnector;
use repository::return_reason::ReturnReasonFilter;
use repository::return_reason::ReturnReasonSort;
use repository::return_reason::ReturnReasonSortField;
use repository::EqualFilter;
use repository::PaginationOption;
use service::auth::{Resource, ResourceAccessRequest};

use service::return_reason::get_return_reasons;

#[derive(InputObject, Clone)]
pub struct ReturnReasonFilterInput {
    pub id: Option<EqualFilterStringInput>,
    pub is_active: Option<bool>,
}

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(remote = "repository::return_reason::ReturnReasonSortField")]
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
            // resource: Resource::QueryReturnReasons, // TODO
            resource: Resource::QueryInventoryAdjustmentReasons,
            store_id: None,
        },
    )?;

    let connection_manager = ctx.get_connection_manager();
    let items = get_return_reasons(
        &connection_manager,
        page.map(PaginationOption::from),
        filter.map(|filter| filter.to_domain()),
        // Currently only one sort option is supported, use the first from the list.
        sort.and_then(|mut sort_list| sort_list.pop())
            .map(|sort| sort.to_domain()),
    )
    .map_err(StandardGraphqlError::from_list_error)?;

    Ok(ReturnReasonResponse::Response(
        ReturnReasonConnector::from_domain(items),
    ))
}

#[derive(Union)]
pub enum ReturnReasonResponse {
    Response(ReturnReasonConnector),
}

impl ReturnReasonFilterInput {
    pub fn to_domain(self) -> ReturnReasonFilter {
        let ReturnReasonFilterInput { id, is_active } = self;

        ReturnReasonFilter {
            id: id.map(EqualFilter::from),
            is_active,
        }
    }
}

impl ReturnReasonSortInput {
    pub fn to_domain(self) -> ReturnReasonSort {
        use ReturnReasonSortField as to;
        use ReturnReasonSortFieldInput as from;

        let key = match self.key {
            from::Id => to::Id,
            from::Reason => to::Reason,
        };

        ReturnReasonSort {
            key,
            desc: self.desc,
        }
    }
}
