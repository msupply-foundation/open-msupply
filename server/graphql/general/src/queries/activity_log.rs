use async_graphql::*;
use graphql_core::{
    generic_filters::EqualFilterStringInput,
    map_filter,
    pagination::PaginationInput,
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::{ActivityLogConnector, ActivityLogNodeType};
use repository::activity_log::{ActivityLogFilter, ActivityLogSort, ActivityLogSortField};
use repository::{EqualFilter, PaginationOption};
use service::{
    activity_log::get_activity_logs,
    auth::{Resource, ResourceAccessRequest},
};

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(remote = "repository::activity_log::ActivityLogSortField")]
#[graphql(rename_items = "camelCase")]
pub enum ActivityLogSortFieldInput {
    Id,
    ActivityLogType,
    UserId,
    RecordId,
}

#[derive(InputObject)]
pub struct ActivityLogSortInput {
    /// Sort query result by `key`
    key: ActivityLogSortFieldInput,
    /// Sort query result is sorted descending or ascending (if not provided the default is
    /// ascending)
    desc: Option<bool>,
}

#[derive(InputObject, Clone)]
pub struct EqualFilterActivityLogTypeInput {
    pub equal_to: Option<ActivityLogNodeType>,
    pub equal_any: Option<Vec<ActivityLogNodeType>>,
    pub not_equal_to: Option<ActivityLogNodeType>,
}

#[derive(InputObject, Clone)]
pub struct ActivityLogFilterInput {
    pub id: Option<EqualFilterStringInput>,
    pub r#type: Option<EqualFilterActivityLogTypeInput>,
    pub user_id: Option<EqualFilterStringInput>,
    pub store_id: Option<EqualFilterStringInput>,
    pub record_id: Option<EqualFilterStringInput>,
}

#[derive(Union)]
pub enum ActivityLogResponse {
    Response(ActivityLogConnector),
}

pub fn activity_logs(
    ctx: &Context<'_>,
    page: Option<PaginationInput>,
    filter: Option<ActivityLogFilterInput>,
    sort: Option<Vec<ActivityLogSortInput>>,
) -> Result<ActivityLogResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryLog,
            store_id: None,
        },
    )?;

    let connection_manager = ctx.get_connection_manager();
    let items = get_activity_logs(
        connection_manager,
        page.map(PaginationOption::from),
        filter.map(|filter| filter.to_domain()),
        // Currently only one sort option is supported, use the first from the list.
        sort.and_then(|mut sort_list| sort_list.pop())
            .map(|sort| sort.to_domain()),
    )
    .map_err(StandardGraphqlError::from_list_error)?;

    Ok(ActivityLogResponse::Response(
        ActivityLogConnector::from_domain(items),
    ))
}

impl ActivityLogFilterInput {
    pub fn to_domain(self) -> ActivityLogFilter {
        let ActivityLogFilterInput {
            id,
            r#type,
            user_id,
            store_id,
            record_id,
        } = self;

        ActivityLogFilter {
            id: id.map(EqualFilter::from),
            r#type: r#type.map(|t| map_filter!(t, ActivityLogNodeType::to_domain)),
            user_id: user_id.map(EqualFilter::from),
            store_id: store_id.map(EqualFilter::from),
            record_id: record_id.map(EqualFilter::from),
        }
    }
}

impl ActivityLogSortInput {
    pub fn to_domain(&self) -> ActivityLogSort {
        use ActivityLogSortField as to;
        use ActivityLogSortFieldInput as from;
        let key = match self.key {
            from::Id => to::Id,
            from::ActivityLogType => to::ActivityLogType,
            from::UserId => to::UserId,
            from::RecordId => to::RecordId,
        };

        ActivityLogSort {
            key,
            desc: self.desc,
        }
    }
}
